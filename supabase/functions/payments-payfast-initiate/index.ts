import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/cors.ts";
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
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return errorResponse("orderId is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID")!;
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY")!;
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5180";

    const payfastUrl = sandbox
      ? "https://sandbox.payfast.co.za/eng/process"
      : "https://www.payfast.co.za/eng/process";

    const functionBaseUrl = Deno.env.get("SUPABASE_URL")!;

    const params: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/checkout/return`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      notify_url: `${functionBaseUrl}/functions/v1/payments-payfast-itn`,
      name_first: order.customer_name,
      email_address: order.customer_email,
      m_payment_id: order.id,
      amount: order.total.toFixed(2),
      item_name: `All Things Water \u2014 Order #${order.order_ref}`,
    };

    const signature = buildPayFastSignature(params, passphrase);

    const queryString = Object.entries({ ...params, signature })
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, "+")}`)
      .join("&");

    const redirectUrl = `${payfastUrl}?${queryString}`;

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
