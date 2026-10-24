import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { calculateDelivery } from "../_shared/delivery.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import { clientIp, HttpError, readJson } from "../_shared/http.ts";
import { getVerifiedUser, serviceClient } from "../_shared/auth.ts";
import { newOrderRef, validateOrderRequest } from "../_shared/order-validation.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const ip = clientIp(req);
  const rateLimit = checkRateLimit(`order:${ip}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const parsed = validateOrderRequest(await readJson(req));
    if (!parsed.ok) {
      return errorResponse(parsed.message, parsed.status, parsed.details, req);
    }
    const order = parsed.value;

    const supabase = serviceClient();

    // Authoritative cross-instance rate limit (L2) on top of the in-memory L1.
    const dbLimit = await checkRateLimitDb(supabase, `order:${ip}`, { max: 10, windowSeconds: 60 });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    // Link the order to an account only for a token Supabase Auth verifies.
    const user = await getVerifiedUser(req);

    const productIds = order.items.map((i) => i.productId);
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, name, price, stock, reserved_stock")
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

    // Pre-check stock for a friendly 409; create_order re-checks under lock.
    let subtotal = 0;
    for (const item of order.items) {
      const product = products?.find((p) => p.id === item.productId);
      if (!product) {
        return errorResponse(`Product not found: ${item.productId}`, 400, {
          productId: item.productId,
        }, req);
      }
      const available = Math.max(0, product.stock - product.reserved_stock);
      if (available < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 409, {
          productId: item.productId,
          available,
          requested: item.quantity,
        }, req);
      }
      subtotal += product.price * item.quantity;
    }

    const deliveryFee = calculateDelivery(subtotal, order.delivery.method);
    const total = subtotal + deliveryFee;
    const orderRef = newOrderRef();

    const { data: result, error: rpcErr } = await supabase.rpc("create_order", {
      p_customer_name: order.customer.name,
      p_customer_email: order.customer.email,
      p_customer_phone: order.customer.phone,
      p_delivery_address: order.delivery.address,
      p_delivery_city: order.delivery.city,
      p_delivery_postal_code: order.delivery.postalCode,
      p_delivery_notes: order.delivery.notes,
      p_delivery_method: order.delivery.method,
      p_subtotal: subtotal,
      p_delivery_fee: deliveryFee,
      p_total: total,
      p_order_ref: orderRef,
      p_items: order.items,
      p_whatsapp_optin: order.whatsappOptin,
      p_user_id: user?.id ?? undefined,
      p_delivery_slot: order.deliverySlot,
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
        return errorResponse(`Insufficient stock for ${err.productId}`, 409, {
          productId: err.productId,
          available: err.available,
          requested: err.requested,
        }, req);
      }
      if (err.error === "Product not found") {
        return errorResponse(`Product not found: ${err.productId}`, 400, {
          productId: err.productId,
        }, req);
      }
      if (err.error === "Price mismatch") {
        // Prices changed between our read and the locked read — ask to retry.
        return errorResponse("Prices have changed. Please review your cart.", 409, undefined, req);
      }
      return errorResponse(String(err.error || "Order creation failed"), 400, undefined, req);
    }

    // Return the checkout_token to the order's creator only, so payment
    // initiation is bound to whoever placed the order.
    const { data: created } = await supabase
      .from("orders")
      .select("checkout_token")
      .eq("id", result.orderId)
      .single();

    // Route to a fulfilment warehouse (best-effort; never blocks checkout).
    if (order.delivery.method === "delivery") {
      try {
        const { data: warehouseId } = await supabase.rpc("pick_fulfillment_warehouse", {
          p_postal_code: order.delivery.postalCode,
        });
        if (warehouseId) {
          await supabase
            .from("orders")
            .update({ fulfillment_warehouse_id: warehouseId })
            .eq("id", result.orderId);
        }
      } catch {
        /* warehouse routing is non-critical */
      }
    }

    logInfo("order created", {
      event: "order.create.ok",
      fn: "orders",
      ref: result.orderRef,
      total,
      account: Boolean(user),
    });

    return jsonResponse({
      orderId: result.orderId,
      orderRef: result.orderRef,
      reservationExpiresAt: result.reservationExpiresAt,
      checkoutToken: created?.checkout_token ?? null,
    }, 201, req);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return errorResponse(err.message, err.status, err.details, req);
    }
    await alert("unhandled order creation error", {
      event: "order.create.exception",
      fn: "orders",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
