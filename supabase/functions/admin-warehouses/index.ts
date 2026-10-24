import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { HttpError, readJson } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";

/**
 * Admin-only multi-warehouse management: list warehouses + per-product
 * on-hand, and set a product's on-hand at a warehouse.
 */
interface Body {
  action?: unknown;
  productId?: unknown;
  warehouseId?: unknown;
  onHand?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, undefined, req);

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);
    const { admin, performedBy } = auth;

    const body = await readJson<Body>(req);

    if (body.action === "setStock") {
      const { productId, warehouseId, onHand } = body;
      if (
        typeof productId !== "string" || !productId || productId.length > 64 ||
        typeof warehouseId !== "string" || !UUID_RE.test(warehouseId) ||
        typeof onHand !== "number" || !Number.isFinite(onHand)
      ) {
        return errorResponse("productId, warehouseId and onHand are required", 400, undefined, req);
      }
      const qty = Math.min(Math.max(0, Math.floor(onHand)), 1_000_000);
      const { error } = await admin
        .from("product_warehouse_stock")
        .upsert(
          { product_id: productId, warehouse_id: warehouseId, on_hand: qty, updated_at: new Date().toISOString() },
          { onConflict: "product_id,warehouse_id" },
        );
      if (error) {
        logError("setStock failed", { event: "admin_warehouses.set_failed", fn: "admin-warehouses", ...toErrorFields(error) });
        return errorResponse("Failed to update stock", 500, undefined, req);
      }
      await admin.from("admin_audit_log").insert({
        action: "warehouse_stock_set",
        product_id: productId,
        changes: { productId, warehouseId, onHand: qty },
        performed_by: performedBy,
        performed_at: new Date().toISOString(),
      });
      return jsonResponse({ ok: true }, 200, req);
    }

    if (body.action !== undefined && body.action !== "list") {
      return errorResponse("Unknown action", 400, undefined, req);
    }

    const [{ data: warehouses, error: whErr }, { data: stock, error: stockErr }] = await Promise.all([
      admin
        .from("warehouses")
        .select("id, code, name, province, serves_regions, priority, active")
        .order("priority", { ascending: true }),
      admin.from("product_warehouse_stock").select("product_id, warehouse_id, on_hand"),
    ]);
    if (whErr || stockErr) {
      logError("warehouse list failed", {
        event: "admin_warehouses.list_failed",
        fn: "admin-warehouses",
        ...toErrorFields(whErr ?? stockErr),
      });
      return errorResponse("Failed to load warehouses", 500, undefined, req);
    }

    return jsonResponse({ warehouses: warehouses ?? [], stock: stock ?? [] }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("admin-warehouses error", { event: "admin_warehouses.exception", fn: "admin-warehouses", ...toErrorFields(err) });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
