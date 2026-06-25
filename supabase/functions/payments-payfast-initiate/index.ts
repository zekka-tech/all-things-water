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
import { checkRateLimit } from "../_shared/rate-limit.ts";

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
    const { orderId } = await req.json();
    if (!orderId) {
      return errorResponse("orderId is required", 400);
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

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404);
    }

    if (order.status !== "pending_payment") {
      return errorResponse("Order is not pending payment", 400);
    }

    const params: Param[] = [
      ["merchant_id", merchantId],
      ["merchant_key", merchantKey],
      ["return_url", `${siteUrl}/checkout/return`],
      ["cancel_url", `${siteUrl}/checkout/cancel`],
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
