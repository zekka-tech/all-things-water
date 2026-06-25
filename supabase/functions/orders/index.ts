import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { calculateDelivery, isDeliverablePostalCode } from "../_shared/delivery.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

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

    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds)
      .eq("visible", true);

    if (fetchErr) {
      console.error("Product fetch error:", fetchErr);
      return errorResponse("Failed to retrieve products", 500);
    }

    const orderItems = body.items.map((item) => {
      const product = products?.find((p) => p.id === item.productId);
      if (!product) {
        throw { status: 400, message: `Product not found: ${item.productId}` };
      }
      if (product.stock < item.quantity) {
        throw {
          status: 409,
          message: `Insufficient stock for ${product.name}`,
          detail: { productId: item.productId, available: product.stock, requested: item.quantity },
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
    });

    if (rpcErr) {
      console.error("RPC error:", rpcErr);
      return errorResponse("Failed to create order", 500);
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

    return jsonResponse({
      orderId: result.orderId,
      orderRef: result.orderRef,
    }, 201);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      const { status, message } = err as { status: number; message: string };
      return errorResponse(message, status);
    }
    console.error("Order creation error:", err);
    return errorResponse("Internal server error", 500);
  }
});
