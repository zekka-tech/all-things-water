import {
  handleCors,
  errorResponse,
  jsonResponse,
} from "../_shared/cors.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/auth.ts";
import { clientIp as getClientIp, HttpError, isValidEmail, readJson } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

interface SubscribeBody {
  email?: unknown;
  productId?: unknown;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`backinstock:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
      req,
    );
  }

  try {
    const body = await readJson<SubscribeBody>(req);

    if (!isValidEmail(body.email)) {
      return errorResponse("Valid email is required", 400, undefined, req);
    }
    if (typeof body.productId !== "string" || !body.productId.trim() || body.productId.length > 64) {
      return errorResponse("Product ID is required", 400, undefined, req);
    }
    const email = body.email.trim().toLowerCase();
    const productId = body.productId.trim();

    const supabase = serviceClient();

    const dbLimit = await checkRateLimitDb(supabase, `backinstock:${clientIp}`, {
      max: 10,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    const { data: product } = await supabase
      .from("products")
      .select("id, stock, name")
      .eq("id", productId)
      .eq("visible", true)
      .maybeSingle();

    if (!product) {
      return errorResponse("Product not found", 404, undefined, req);
    }
    if (product.stock > 0) {
      return jsonResponse({
        ok: true,
        subscribed: false,
        message: "This item is already in stock!",
      }, 200, req);
    }

    const { error: insertErr } = await supabase
      .from("back_in_stock_subscriptions")
      .upsert(
        { email, product_id: productId },
        { onConflict: "email,product_id", ignoreDuplicates: true },
      );

    if (insertErr) {
      logError("back-in-stock insert failed", { event: "bis.insert_failed", fn: "back-in-stock", ...toErrorFields(insertErr) });
      return errorResponse("Failed to subscribe", 500, undefined, req);
    }

    return jsonResponse({ ok: true, subscribed: true }, 201, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("back-in-stock subscribe error", { event: "bis.exception", fn: "back-in-stock", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});