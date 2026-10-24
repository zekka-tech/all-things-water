import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { sendBackInStock } from "../_shared/resend.ts";
import { requireAdmin, serviceClient } from "../_shared/auth.ts";
import { hasSharedSecret, HttpError, readJson } from "../_shared/http.ts";
import { logError, logInfo, toErrorFields } from "../_shared/log.ts";

/**
 * Email everyone waiting on a product that is back in stock.
 *
 * Callers: an admin (Supabase Auth JWT + admins allowlist) or a trusted job
 * presenting `Authorization: Bearer $BACK_IN_STOCK_CRON_SECRET`. This used to
 * be unauthenticated, which let anyone trigger email blasts from our domain.
 */
const MAX_PER_RUN = 500;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  try {
    const viaCron = hasSharedSecret(req, Deno.env.get("BACK_IN_STOCK_CRON_SECRET"));
    if (!viaCron) {
      const auth = await requireAdmin(req);
      if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);
    }

    const { productId } = await readJson<{ productId?: unknown }>(req);
    if (typeof productId !== "string" || !productId.trim() || productId.length > 64) {
      return errorResponse("productId is required", 400, undefined, req);
    }

    if (!Deno.env.get("RESEND_API_KEY")) {
      return errorResponse("Email configuration is incomplete", 500, undefined, req);
    }
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://allthingswater.co.za";
    const supabase = serviceClient();

    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, name, slug, stock, reserved_stock, visible")
      .eq("id", productId.trim())
      .maybeSingle();

    if (prodErr || !product || !product.visible) {
      return errorResponse("Product not found", 404, undefined, req);
    }
    if (product.stock - product.reserved_stock <= 0) {
      return errorResponse("Product is still out of stock", 400, undefined, req);
    }

    const { data: subs, error: subsErr } = await supabase
      .from("back_in_stock_subscriptions")
      .select("id, email")
      .eq("product_id", product.id)
      .eq("notified", false)
      .limit(MAX_PER_RUN);

    if (subsErr) {
      logError("fetch subscriptions failed", { event: "bis_notify.fetch_failed", fn: "back-in-stock-notify", ...toErrorFields(subsErr) });
      return errorResponse("Failed to fetch subscriptions", 500, undefined, req);
    }
    if (!subs || subs.length === 0) {
      return jsonResponse({ ok: true, sent: 0, message: "No pending subscriptions" }, 200, req);
    }

    const productUrl = `${siteUrl}/product/${encodeURIComponent(product.slug)}`;
    const sentIds: string[] = [];
    for (const sub of subs) {
      if (await sendBackInStock(sub.email, product.name, productUrl)) sentIds.push(sub.id);
    }

    if (sentIds.length > 0) {
      await supabase.from("back_in_stock_subscriptions").update({ notified: true }).in("id", sentIds);
    }

    logInfo("back-in-stock notifications sent", {
      event: "bis_notify.sent",
      fn: "back-in-stock-notify",
      productId: product.id,
      sent: sentIds.length,
      total: subs.length,
    });
    return jsonResponse({ ok: true, sent: sentIds.length, total: subs.length }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("back-in-stock-notify error", { event: "bis_notify.exception", fn: "back-in-stock-notify", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
