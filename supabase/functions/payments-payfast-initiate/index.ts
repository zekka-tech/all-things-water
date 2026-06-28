import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/cors.ts";
import {
  buildSignedQuery,
  getProcessUrl,
  type Param,
} from "../_shared/payfast.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";

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
  const rateLimit = checkRateLimit(`payfast-initiate:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const { orderId, token } = await req.json();
    if (!orderId) {
      return errorResponse("orderId is required", 400);
    }
    if (!token) {
      return errorResponse("token is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
    const functionBaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Supabase server configuration is incomplete", 500);
    }
    if (!merchantId || !merchantKey) {
      return errorResponse("PayFast merchant configuration is incomplete", 500);
    }
    if (!siteUrl || siteUrl.includes("localhost")) {
      return errorResponse("PUBLIC_SITE_URL must be configured for checkout", 500);
    }
    if (!functionBaseUrl) {
      return errorResponse("SUPABASE_URL must be configured for checkout", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const dbLimit = await checkRateLimitDb(supabase, `payfast-initiate:${clientIp}`, {
      max: 10,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      });
    }

    await supabase.rpc("expire_pending_order_reservations", { p_limit: 100 });

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, total, status, customer_name, customer_email, order_ref, checkout_token")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404);
    }

    // Bind initiation to the order's checkout_token — only the order's creator
    // (who received the token from the orders endpoint) can start payment.
    if (order.checkout_token !== token) {
      return errorResponse("Invalid checkout token", 403);
    }

    if (order.status === "expired") {
      return errorResponse("This payment session has expired. Please place your order again.", 409);
    }

    if (order.status !== "pending_payment") {
      return errorResponse("Order is not pending payment", 400);
    }

    const encodedOrderRef = encodeURIComponent(order.order_ref);
    const encodedOrderId = encodeURIComponent(order.id);
    const encodedToken = encodeURIComponent(order.checkout_token);

    const params: Param[] = [
      ["merchant_id", merchantId],
      ["merchant_key", merchantKey],
      ["return_url", `${siteUrl}/checkout/return?orderRef=${encodedOrderRef}`],
      [
        "cancel_url",
        `${siteUrl}/checkout/cancel?orderId=${encodedOrderId}&token=${encodedToken}&orderRef=${encodedOrderRef}`,
      ],
      ["notify_url", `${functionBaseUrl}/functions/v1/payments-payfast-itn`],
      ["name_first", order.customer_name],
      ["email_address", order.customer_email],
      ["m_payment_id", order.id],
      ["amount", order.total.toFixed(2)],
      ["item_name", `All Things Water — Order #${order.order_ref}`],
    ];

    const redirectUrl = `${getProcessUrl()}?${buildSignedQuery(params, passphrase)}`;

    await supabase
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", orderId);

    return jsonResponse({ redirectUrl });
  } catch (err) {
    console.error("PayFast initiate error:", err);
    return errorResponse("Failed to initiate payment", 500);
  }
});
