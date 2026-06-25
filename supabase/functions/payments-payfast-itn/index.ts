import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  sendOrderConfirmation,
  sendMerchantNotification,
} from "../_shared/resend.ts";
import {
  getParam,
  getValidationUrl,
  parseFormParams,
  verifySignature,
} from "../_shared/payfast.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rateLimit = checkRateLimit(`payfast-itn:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const text = await req.text();
    const formParams = parseFormParams(text);

    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const signature = getParam(formParams, "signature") || "";
    if (!verifySignature(formParams, signature, passphrase)) {
      console.error("ITN signature mismatch");
      return errorResponse("Invalid signature", 400);
    }

    const validateRes = await fetch(getValidationUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: text,
    });
    const validateText = await validateRes.text();

    if (validateText.trim() !== "VALID") {
      console.error("PayFast validation failed:", validateText);
      return errorResponse("Payment validation failed", 400);
    }

    const paymentStatus = getParam(formParams, "payment_status");
    if (paymentStatus !== "COMPLETE") {
      console.log(`ITN received with status: ${paymentStatus} — ignoring`);
      return jsonResponse({ received: true });
    }

    const orderId = getParam(formParams, "m_payment_id");
    if (!orderId) {
      return errorResponse("Missing order reference", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      console.error("Order not found:", orderId);
      return errorResponse("Order not found", 404);
    }

    if (order.status === "paid") {
      console.log(`Order ${orderId} already paid — idempotent return`);
      return jsonResponse({ received: true });
    }

    const amountGross = parseFloat(getParam(formParams, "amount_gross") || "0");
    if (Math.abs(amountGross - Number(order.total)) > 0.01) {
      console.error(
        `Amount mismatch for order ${orderId}: expected ${order.total}, got ${amountGross}`,
      );
      return errorResponse("Amount mismatch", 400);
    }

    const pfPaymentId = getParam(formParams, "pf_payment_id") || "";

    const { data: result, error: markPaidErr } = await supabase.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_payfast_payment_id: pfPaymentId,
      p_note: `Payment confirmed via PayFast (${pfPaymentId})`,
    });

    if (markPaidErr) {
      console.error("mark_order_paid RPC error:", markPaidErr);
      return errorResponse("Failed to update order", 500);
    }

    if (result?.error) {
      console.error("mark_order_paid business error:", result);
      return jsonResponse({ received: true, manualReview: true });
    }

    if (result?.alreadyPaid) {
      console.log(`Order ${orderId} already paid — idempotent return`);
      return jsonResponse({ received: true });
    }

    const items = (order.order_items || []).map(
      (i: { product_name: string; quantity: number; product_price: number }) => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.product_price,
      }),
    );

    await Promise.allSettled([
      sendOrderConfirmation(order.customer_email, order.order_ref, order.total, items),
      sendMerchantNotification(order.order_ref, order.customer_name, order.total, items),
    ]);

    console.log(`Order ${order.order_ref} marked as paid`);
    return jsonResponse({ received: true });
  } catch (err) {
    console.error("ITN handler error:", err);
    return errorResponse("Internal server error", 500);
  }
});
