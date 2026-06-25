import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";

interface NotifyBody {
  productId: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const { productId }: NotifyBody = await req.json();
    if (!productId?.trim()) {
      return errorResponse("productId is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://allthingswater.co.za";

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }
    if (!resendKey) {
      return errorResponse("Email configuration is incomplete", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name, slug, stock")
      .eq("id", productId)
      .maybeSingle();

    if (prodErr || !product) {
      return errorResponse("Product not found", 404);
    }
    if (product.stock <= 0) {
      return errorResponse("Product is still out of stock", 400);
    }

    const { data: subs, error: subsErr } = await supabase
      .from("back_in_stock_subscriptions")
      .select("id, email")
      .eq("product_id", productId)
      .eq("notified", false);

    if (subsErr) {
      console.error("Fetch subscriptions error:", subsErr);
      return errorResponse("Failed to fetch subscriptions", 500);
    }

    if (!subs || subs.length === 0) {
      return jsonResponse({ ok: true, sent: 0, message: "No pending subscriptions" });
    }

    const productUrl = `${siteUrl}/product/${product.slug}`;
    let sentCount = 0;
    const fromEmail = "All Things Water <orders@allthingswater.co.za>";

    for (const sub of subs) {
      try {
        const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2630">
<h1 style="color:#06a3f0;font-size:24px;margin:0 0 8px">Back in stock!</h1>
<p style="color:#66778f;margin:0 0 24px">The item you wanted is available again.</p>
<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
<p style="font-size:18px;font-weight:600;margin:0 0 12px">${product.name}</p>
<p style="margin:0 0 16px;color:#66778f">Good news — we&rsquo;ve restocked this item and it&rsquo;s ready to ship.</p>
<a href="${productUrl}" style="display:inline-block;background:#06a3f0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Shop now</a>
</div>
<p style="color:#66778f;font-size:14px">You&rsquo;re receiving this because you asked to be notified when this product returns to stock.</p>
</body></html>`;

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: sub.email,
            subject: `Back in stock — ${product.name}`,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
          await supabase
            .from("back_in_stock_subscriptions")
            .update({ notified: true })
            .eq("id", sub.id);
        } else {
          console.error(`Failed to notify ${sub.email}:`, await res.text());
        }
      } catch (emailErr) {
        console.error(`Back-in-stock notify error for ${sub.email}:`, emailErr);
      }
    }

    console.log(`Back-in-stock: sent ${sentCount}/${subs.length} notifications for ${product.name}`);
    return jsonResponse({ ok: true, sent: sentCount, total: subs.length });
  } catch (err) {
    console.error("Back-in-stock-notify error:", err);
    return errorResponse("Internal server error", 500);
  }
});