import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/auth.ts";
import { clientIp as getClientIp, HttpError, isUuid, readJson, timingSafeEqual } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

interface CancelRequest {
  orderId?: unknown;
  token?: unknown;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`order-cancel:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
      req,
    );
  }

  try {
    const { orderId, token } = await readJson<CancelRequest>(req);

    if (!isUuid(orderId) || !isUuid(token)) {
      return errorResponse("orderId and token are required", 400, undefined, req);
    }

    const supabase = serviceClient();

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, checkout_token")
      .eq("id", orderId)
      .maybeSingle();

    // Same response for unknown order and wrong token (no id probing).
    if (fetchErr || !order || !timingSafeEqual(String(order.checkout_token), token)) {
      return errorResponse("Order not found", 404, undefined, req);
    }

    const { data: result, error: releaseErr } = await supabase.rpc(
      "release_order_reservation",
      {
        p_order_id: orderId,
        p_target_status: "cancelled",
        p_note: "Payment cancelled by customer before checkout completion",
      },
    );

    if (releaseErr) {
      logError("order-cancel release failed", { event: "order_cancel.release_failed", fn: "order-cancel", ...toErrorFields(releaseErr) });
      return errorResponse("Failed to cancel order", 500, undefined, req);
    }

    if (result?.error) {
      const status = result.status === "paid" ? 409 : 400;
      return errorResponse(String(result.error), status, { status: result.status }, req);
    }

    return jsonResponse({
      ok: true,
      released: Boolean(result?.released),
      status: result?.status ?? order.status,
    }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("order-cancel error", { event: "order_cancel.exception", fn: "order-cancel", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
