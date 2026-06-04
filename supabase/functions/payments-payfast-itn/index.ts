import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  sendOrderConfirmation,
  sendMerchantNotification,
} from "../_shared/resend.ts";
import { crypto } from "jsr:@std/crypto";

function buildPayFastSignature(
  params: Record<string, string>,
  passphrase: string,
): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "signature")
    .sort()
    .map((k) => {
      const val = params[k].trim();
      return `${k}=${encodeURIComponent(val).replace(/%20/g, "+")}`;
    })
    .join("&");

  const toHash = passphrase ? `${sorted}&passphrase=${encodeURIComponent(passphrase)}` : sorted;
  const data = new TextEncoder().encode(toHash);
  const hash = crypto.subtle.digestSync("MD5", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Parse form-encoded body
    const text = await req.text();
    const formParams: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const [key, val] = pair.split("=");
      if (key) formParams[decodeURIComponent(key)] = decodeURIComponent(val || "");
    }

    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";

    // Verify signature
    const expectedSig = buildPayFastSignature(formParams, passphrase);
    if (expectedSig !== formParams.signature) {
      console.error("ITN signature mismatch");
      return errorResponse("Invalid signature", 400);
    }

    // Server-to-server validation
    const validateUrl = sandbox
      ? "https://sandbox.payfast.co.za/eng/query/validate"
      : "https://www.payfast.co.za/eng/query/validate";

    const validateRes = await fetch(validateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: text,
    });
    const validateText = await validateRes.text();

    if (validateText !== "VALID") {
      console.error("PayFast validation failed:", validateText);
      return errorResponse("Payment validation failed", 400);
    }

    // Check payment status
    if (formParams.payment_status !== "COMPLETE") {
      console.log(`ITN received with status: ${formParams.payment_status} — ignoring`);
      return jsonResponse({ received: true });
    }

    const orderId = formParams.m_payment_id;
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

    // Update order to paid
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payfast_payment_id: formParams.pf_payment_id,
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error("Order update error:", updateErr);
      return errorResponse("Failed to update order", 500);
    }

    // Insert status event
    await supabase.from("order_status_events").insert({
      order_id: orderId,
      status: "paid",
      note: `Payment confirmed via PayFast (${formParams.pf_payment_id})`,
    });

    // Fire notifications
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
