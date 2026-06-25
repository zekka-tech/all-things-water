import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import {
  sendShippingNotification,
  sendDeliveryNotification,
} from "../_shared/resend.ts";

interface UpdateBody {
  orderId: string;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  note?: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return errorResponse("Unauthorized", 401);

    const anon = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData.user) return errorResponse("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: adminRow } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!adminRow) return errorResponse("Forbidden", 403);

    const body: UpdateBody = await req.json();
    if (!body.orderId?.trim()) {
      return errorResponse("orderId is required", 400);
    }
    const validStatuses = ["processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return errorResponse("Invalid status", 400);
    }

    const { data: order, error: fetchErr } = await admin
      .from("orders")
      .select("id, order_ref, customer_email, status")
      .eq("id", body.orderId)
      .single();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404);
    }

    if (order.status === body.status) {
      return jsonResponse({
        ok: true,
        orderId: body.orderId,
        previousStatus: order.status,
        newStatus: body.status,
      });
    }

    if (order.status === "pending_payment" && body.status !== "cancelled") {
      return errorResponse("Unpaid orders can only be cancelled", 400);
    }

    if (body.status === "cancelled" && order.status === "pending_payment") {
      const { data: releaseResult, error: releaseErr } = await admin.rpc(
        "release_order_reservation",
        {
          p_order_id: body.orderId,
          p_target_status: "cancelled",
          p_note: body.note || "Order cancelled by admin before payment confirmation",
        },
      );

      if (releaseErr) {
        console.error("Order reservation release error:", releaseErr);
        return errorResponse("Failed to cancel order", 500);
      }
      if (releaseResult?.error) {
        return errorResponse(String(releaseResult.error), 400, releaseResult);
      }
    } else {
      const { error: updateErr } = await admin
        .from("orders")
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq("id", body.orderId);

      if (updateErr) {
        console.error("Order status update error:", updateErr);
        return errorResponse("Failed to update order status", 500);
      }

      await admin.from("order_status_events").insert({
        order_id: body.orderId,
        status: body.status,
        note: body.note || null,
      });
    }

    await admin.from("admin_audit_log").insert({
      action: "order_status_updated",
      changes: { from: order.status, to: body.status },
      performed_by: userData.user.email ?? userData.user.id,
      performed_at: new Date().toISOString(),
    });

    const emailPromises: Promise<unknown>[] = [];
    if (body.status === "shipped") {
      emailPromises.push(
        sendShippingNotification(order.customer_email, order.order_ref, body.note),
      );
    } else if (body.status === "delivered") {
      emailPromises.push(
        sendDeliveryNotification(order.customer_email, order.order_ref),
      );
    }

    if (emailPromises.length > 0) {
      await Promise.allSettled(emailPromises);
    }

    return jsonResponse({
      ok: true,
      orderId: body.orderId,
      previousStatus: order.status,
      newStatus: body.status,
    });
  } catch (err) {
    console.error("Order status update error:", err);
    return errorResponse("Internal server error", 500);
  }
});
