import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { sendShippingNotification, sendDeliveryNotification } from "../_shared/resend.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { clip, HttpError, isUuid, readJson } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

interface UpdateBody {
  orderId?: unknown;
  status?: unknown;
  note?: unknown;
}

const ADMIN_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;
type AdminStatus = (typeof ADMIN_STATUSES)[number];

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);
    const { admin, performedBy } = auth;

    const body = await readJson<UpdateBody>(req);
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!isUuid(orderId)) return errorResponse("orderId is required", 400, undefined, req);
    if (!ADMIN_STATUSES.includes(body.status as AdminStatus)) {
      return errorResponse("Invalid status", 400, undefined, req);
    }
    const status = body.status as AdminStatus;
    const note = clip(body.note, 1000);

    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, order_ref, customer_email, status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404, undefined, req);
    }

    const { data: result, error: updateErr } = await admin.rpc("update_order_status", {
      p_order_id: orderId,
      p_status: status,
      p_note: note ?? null,
      p_performed_by: performedBy,
    });
    if (updateErr) {
      logError("order status transaction failed", { event: "order_status.update_failed", fn: "order-status", ...toErrorFields(updateErr) });
      return errorResponse("Failed to update order status", 500, undefined, req);
    }
    if (result?.error) return errorResponse(String(result.error), result.code ?? 409, undefined, req);
    if (!result?.changed) return jsonResponse({ ok: true, orderId, ...result }, 200, req);

    if (status === "shipped") {
      await sendShippingNotification(order.customer_email, order.order_ref, note);
    } else if (status === "delivered") {
      await sendDeliveryNotification(order.customer_email, order.order_ref);
    }

    return jsonResponse({ ok: true, orderId, previousStatus: result.previousStatus, newStatus: result.newStatus }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("order-status error", { event: "order_status.exception", fn: "order-status", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
