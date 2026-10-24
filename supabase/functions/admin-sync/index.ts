import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { clientIp, HttpError, readJson } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

interface SyncPayload {
  stockUpdates?: Record<string, unknown>;
  auditEvents?: {
    action?: unknown;
    productId?: unknown;
    productName?: unknown;
    changes?: unknown;
  }[];
}

const MAX_STOCK = 1_000_000;
const MAX_UPDATES = 200;
const MAX_EVENTS = 200;

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const rateLimit = checkRateLimit(`admin-sync:${clientIp(req)}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests", 429, { retryAfter: rateLimit.retryAfter }, req);
  }

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);
    const { admin: supabase, performedBy } = auth;

    const body = await readJson<SyncPayload>(req, 256 * 1024);

    const updates = Object.entries(body.stockUpdates ?? {});
    if (updates.length > MAX_UPDATES) {
      return errorResponse("Too many stock updates", 400, undefined, req);
    }
    for (const [productId, value] of updates) {
      if (
        productId.length > 64 ||
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > MAX_STOCK
      ) {
        return errorResponse(`Invalid stock value for ${productId.slice(0, 64)}`, 400, undefined, req);
      }
    }

    const events = Array.isArray(body.auditEvents) ? body.auditEvents : [];
    if (events.length > MAX_EVENTS) {
      return errorResponse("Too many audit events", 400, undefined, req);
    }

    for (const [productId, newStock] of updates) {
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", productId);
      if (error) {
        logError("stock update failed", { event: "admin_sync.stock_failed", fn: "admin-sync", productId, ...toErrorFields(error) });
        return errorResponse("Failed to update stock", 500, undefined, req);
      }
    }

    if (events.length > 0) {
      const { error } = await supabase.from("admin_audit_log").insert(
        events.map((e) => ({
          action: String(e.action ?? "unknown").slice(0, 100),
          product_id: typeof e.productId === "string" ? e.productId.slice(0, 64) : null,
          product_name: typeof e.productName === "string" ? e.productName.slice(0, 200) : null,
          changes: e.changes && typeof e.changes === "object" ? e.changes : {},
          performed_by: performedBy,
          performed_at: new Date().toISOString(),
        })),
      );
      if (error) {
        logError("audit insert failed", { event: "admin_sync.audit_failed", fn: "admin-sync", ...toErrorFields(error) });
        return errorResponse("Failed to record audit log", 500, undefined, req);
      }
    }

    return jsonResponse({ success: true, syncedAt: new Date().toISOString() }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("admin-sync error", { event: "admin_sync.exception", fn: "admin-sync", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
