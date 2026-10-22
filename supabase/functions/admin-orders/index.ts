import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

const STATUSES = new Set([
  "pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired",
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);

    const url = new URL(req.url);
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 100;
    const statusFilter = url.searchParams.get("status");

    if (statusFilter && statusFilter !== "all" && !STATUSES.has(statusFilter)) {
      return errorResponse("Invalid status filter", 400, undefined, req);
    }

    let query = auth.admin
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: orders, error: ordersErr } = await query;
    if (ordersErr) {
      logError("admin orders fetch failed", { event: "admin_orders.fetch_failed", fn: "admin-orders", ...toErrorFields(ordersErr) });
      return errorResponse("Failed to fetch orders", 500, undefined, req);
    }

    // The checkout token is a payment credential; admins never need it.
    const safe = (orders || []).map(({ checkout_token: _t, ...rest }) => rest);
    return jsonResponse({ orders: safe }, 200, req);
  } catch (err) {
    logError("admin-orders error", { event: "admin_orders.exception", fn: "admin-orders", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
