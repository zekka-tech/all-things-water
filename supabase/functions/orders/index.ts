import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { calculateDelivery, isDeliverablePostalCode } from "../_shared/delivery.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";

interface OrderItem {
  productId: string;
  quantity: number;
}

interface Customer {
  name: string;
  email: string;
  phone?: string;
}

interface Delivery {
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
  method: "delivery" | "collection";
}

interface CreateOrderRequest {
  items: OrderItem[];
  customer: Customer;
  delivery: Delivery;
  whatsappOptin?: boolean;
  deliverySlot?: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rateLimit = checkRateLimit(`order:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const body: CreateOrderRequest = await req.json();

    if (!body.customer?.name?.trim()) {
      return errorResponse("Customer name is required", 400);
    }
    if (
      !body.customer?.email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customer.email)
    ) {
      return errorResponse("Valid customer email is required", 400);
    }
    if (!body.items?.length) {
      return errorResponse("At least one item is required", 400);
    }

    const deliveryMethod = body.delivery?.method || "delivery";
    if (deliveryMethod === "delivery") {
      if (!body.delivery?.address?.trim() || !body.delivery?.city?.trim()) {
        return errorResponse("Delivery address and city are required", 400);
      }
      if (!body.delivery?.postalCode?.trim()) {
        return errorResponse("Delivery postal code is required", 400);
      }
      const zone = isDeliverablePostalCode(body.delivery.postalCode.trim());
      if (!zone.deliverable) {
        return errorResponse("We cannot deliver to this postal code", 400, zone);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Authoritative cross-instance rate limit (L2) on top of the in-memory L1.
    const dbLimit = await checkRateLimitDb(supabase, `order:${clientIp}`, {
      max: 10,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    await supabase.rpc("expire_pending_order_reservations", { p_limit: 100 });

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const [, tokenPart] = authHeader.split(" ");
        const payload = JSON.parse(atob(tokenPart.split(".")[1]));
        userId = payload?.sub ?? null;
      } catch {
        /* guest checkout */
      }
    }

    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, price, stock, reserved_stock, visible")
      .in("id", productIds)
      .eq("visible", true);

    if (fetchErr) {
      await alert("product fetch failed during order", {
        event: "order.create.product_fetch_failed",
        fn: "orders",
        ...toErrorFields(fetchErr),
      });
      return errorResponse("Failed to retrieve products", 500, undefined, req);
    }

    const orderItems = body.items.map((item) => {
      const product = products?.find((p) => p.id === item.productId);
      if (!product) {
        throw { status: 400, message: `Product not found: ${item.productId}` };
      }
      const available = Math.max(0, product.stock - product.reserved_stock);
      if (available < item.quantity) {
        throw {
          status: 409,
          message: `Insufficient stock for ${product.name}`,
          detail: {
            productId: item.productId,
            available,
            requested: item.quantity,
          },
        };
      }
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        name: product.name,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = calculateDelivery(subtotal, deliveryMethod);
    const total = subtotal + deliveryFee;

    const orderRef =
      "ATW-" +
      crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();

    const { data: result, error: rpcErr } = await supabase.rpc("create_order", {
      p_customer_name: body.customer.name.trim(),
      p_customer_email: body.customer.email.trim(),
      p_customer_phone: body.customer.phone || "",
      p_delivery_address: body.delivery?.address || "",
      p_delivery_city: body.delivery?.city || "",
      p_delivery_postal_code: body.delivery?.postalCode || "",
      p_delivery_notes: body.delivery?.notes || "",
      p_delivery_method: deliveryMethod,
      p_subtotal: subtotal,
      p_delivery_fee: deliveryFee,
      p_total: total,
      p_order_ref: orderRef,
      p_items: orderItems,
      p_whatsapp_optin: body.whatsappOptin ?? false,
      p_user_id: userId ?? undefined,
      p_delivery_slot: body.deliverySlot || undefined,
    });

    if (rpcErr) {
      await alert("create_order RPC failed", {
        event: "order.create.rpc_failed",
        fn: "orders",
        ref: orderRef,
        ...toErrorFields(rpcErr),
      });
      return errorResponse("Failed to create order", 500, undefined, req);
    }

    if (result?.error) {
      const err = result as Record<string, unknown>;
      if (err.error === "Insufficient stock") {
        return errorResponse(
          `Insufficient stock for ${err.productId}`,
          409,
          { productId: err.productId, available: err.available, requested: err.requested },
        );
      }
      if (err.error === "Product not found") {
        return errorResponse(`Product not found: ${err.productId}`, 400, { productId: err.productId });
      }
      return errorResponse(String(err.error || "Order creation failed"), 400);
    }

    // Return the order's checkout_token to its creator so the subsequent
    // payment-initiate call can be bound to it (defence in depth: an actor who
    // only knows the orderId cannot initiate payment for someone else's order).
    const { data: created } = await supabase
      .from("orders")
      .select("checkout_token")
      .eq("id", result.orderId)
      .single();

    // Route the order to a fulfilment warehouse by delivery region (best-effort;
    // never blocks checkout). Decremented from on-hand on dispatch.
    if (deliveryMethod === "delivery") {
      try {
        const { data: warehouseId } = await supabase.rpc("pick_fulfillment_warehouse", {
          p_postal_code: body.delivery?.postalCode || "",
        });
        if (warehouseId) {
          await supabase
            .from("orders")
            .update({ fulfillment_warehouse_id: warehouseId })
            .eq("id", result.orderId);
        }
      } catch (_err) {
        /* warehouse routing is non-critical */
      }
    }

    logInfo("order created", {
      event: "order.create.ok",
      fn: "orders",
      ref: result.orderRef,
      total,
    });

    return jsonResponse({
      orderId: result.orderId,
      orderRef: result.orderRef,
      reservationExpiresAt: result.reservationExpiresAt,
      checkoutToken: created?.checkout_token ?? null,
    }, 201, req);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      const { status, message, detail } = err as {
        status: number;
        message: string;
        detail?: unknown;
      };
      return errorResponse(message, status, detail, req);
    }
    await alert("unhandled order creation error", {
      event: "order.create.exception",
      fn: "orders",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
