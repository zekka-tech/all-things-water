import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { buildSignedQuery, getProcessUrl, type Param } from "../_shared/payfast.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { clientIp, HttpError, isUuid, readJson, timingSafeEqual } from "../_shared/http.ts";
import { serviceClient } from "../_shared/auth.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const ip = clientIp(req);
  const rateLimit = checkRateLimit(`payfast-initiate:${ip}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const { orderId, token } = await readJson<{ orderId?: unknown; token?: unknown }>(req);
    if (!isUuid(orderId)) {
      return errorResponse("orderId is required", 400, undefined, req);
    }
    if (!isUuid(token)) {
      return errorResponse("token is required", 400, undefined, req);
    }

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
    const functionBaseUrl = Deno.env.get("SUPABASE_URL");
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";

    if (!merchantId || !merchantKey) {
      return errorResponse("PayFast merchant configuration is incomplete", 500, undefined, req);
    }
    if (!sandbox && !passphrase) {
      // Without a passphrase the ITN signature is forgeable by anyone.
      return errorResponse("PayFast passphrase must be configured", 500, undefined, req);
    }
    if (!siteUrl || siteUrl.includes("localhost") || !functionBaseUrl) {
      return errorResponse("PUBLIC_SITE_URL must be configured for checkout", 500, undefined, req);
    }

    const supabase = serviceClient();

    const dbLimit = await checkRateLimitDb(supabase, `payfast-initiate:${ip}`, {
      max: 10,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    await supabase.rpc("expire_pending_order_reservations", { p_limit: 100 });

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, total, status, customer_name, customer_email, order_ref, checkout_token")
      .eq("id", orderId)
      .maybeSingle();

    // Same response for "no such order" and "wrong token" so order ids
    // cannot be probed.
    if (fetchErr || !order || !timingSafeEqual(String(order.checkout_token), token)) {
      return errorResponse("Order not found", 404, undefined, req);
    }

    if (order.status === "expired") {
      return errorResponse(
        "This payment session has expired. Please place your order again.",
        409,
        undefined,
        req,
      );
    }
    if (order.status !== "pending_payment") {
      return errorResponse("Order is not pending payment", 400, undefined, req);
    }

    const total = Number(order.total);
    if (!Number.isFinite(total) || total <= 0) {
      return errorResponse("Order total is invalid", 400, undefined, req);
    }

    const encodedOrderRef = encodeURIComponent(order.order_ref);
    const encodedOrderId = encodeURIComponent(order.id);
    const encodedToken = encodeURIComponent(order.checkout_token);

    // PayFast field limits: name_first 100, email 100, item_name 100.
    const params: Param[] = [
      ["merchant_id", merchantId],
      ["merchant_key", merchantKey],
      ["return_url", `${siteUrl}/checkout/return?orderRef=${encodedOrderRef}`],
      [
        "cancel_url",
        `${siteUrl}/checkout/cancel?orderId=${encodedOrderId}&token=${encodedToken}&orderRef=${encodedOrderRef}`,
      ],
      ["notify_url", `${functionBaseUrl}/functions/v1/payments-payfast-itn`],
      ["name_first", String(order.customer_name).slice(0, 100)],
      ["email_address", String(order.customer_email).slice(0, 100)],
      ["m_payment_id", order.id],
      ["amount", total.toFixed(2)],
      ["item_name", `All Things Water — Order #${order.order_ref}`.slice(0, 100)],
    ];

    const redirectUrl = `${getProcessUrl()}?${buildSignedQuery(params, passphrase)}`;
    return jsonResponse({ redirectUrl }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) {
      return errorResponse(err.message, err.status, err.details, req);
    }
    logError("PayFast initiate error", {
      event: "payfast.initiate.exception",
      fn: "payments-payfast-initiate",
      ...toErrorFields(err),
    });
    return errorResponse("Failed to initiate payment", 500, undefined, req);
  }
});
