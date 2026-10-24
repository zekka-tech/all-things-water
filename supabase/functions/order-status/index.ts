import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { sendShippingNotification, sendDeliveryNotification } from "../_shared/resend.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { clip, HttpError, isUuid, readJson } from "../_shared/http.ts";
import { canTransition } from "../_shared/order-validation.ts";
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

    if (order.status === status) {
      return jsonResponse({ ok: true, orderId, previousStatus: order.status, newStatus: status }, 200, req);
    }

    if (!canTransition(order.status, status)) {
      return errorResponse(
        `Cannot change an order from ${order.status} to ${status}`,
        409,
        { from: order.status, to: status },
        req,
      );
    }

    if (status === "cancelled" && order.status === "pending_payment") {
      const { data: releaseResult, error: releaseErr } = await admin.rpc("release_order_reservation", {
        p_order_id: orderId,
        p_target_status: "cancelled",
        p_note: note || "Order cancelled by admin before payment confirmation",
      });
      if (releaseErr) {
        logError("reservation release failed", {
          event: "order_status.release_failed",
          fn: "order-status",
          ref: order.order_ref,
          ...toErrorFields(releaseErr),
        });
        return errorResponse("Failed to cancel order", 500, undefined, req);
      }
      if (releaseResult?.error) {
        return errorResponse(String(releaseResult.error), 400, releaseResult, req);
      }
    } else {
      // Conditional update guards against a concurrent change between our
      // read and this write (optimistic concurrency on the status column).
      const { data: updated, error: updateErr } = await admin
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", order.status)
        .select("id");

      if (updateErr) {
        logError("order status update failed", {
          event: "order_status.update_failed",
          fn: "order-status",
          ref: order.order_ref,
          ...toErrorFields(updateErr),
        });
        return errorResponse("Failed to update order status", 500, undefined, req);
      }
      if (!updated || updated.length === 0) {
        return errorResponse("Order changed while updating; please refresh", 409, undefined, req);
      }

      await admin.from("order_status_events").insert({
        order_id: orderId,
        status,
        note: note ?? null,
      });
    }

    await admin.from("admin_audit_log").insert({
      action: "order_status_updated",
      changes: { orderId, orderRef: order.order_ref, from: order.status, to: status },
      performed_by: performedBy,
      performed_at: new Date().toISOString(),
    });

    if (status === "shipped") {
      const { error: dispatchErr } = await admin.rpc("dispatch_order_stock", { p_order_id: orderId });
      if (dispatchErr) {
        logError("dispatch_order_stock failed", {
          event: "order_status.dispatch_failed",
          fn: "order-status",
          ref: order.order_ref,
          ...toErrorFields(dispatchErr),
        });
      }
      await sendShippingNotification(order.customer_email, order.order_ref, note);
    } else if (status === "delivered") {
      await sendDeliveryNotification(order.customer_email, order.order_ref);
    }

    return jsonResponse({ ok: true, orderId, previousStatus: order.status, newStatus: status }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("order-status error", { event: "order_status.exception", fn: "order-status", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
