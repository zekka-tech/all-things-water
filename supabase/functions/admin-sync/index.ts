import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { clientIp, HttpError, readJson } from "../_shared/http.ts";
import { logError, toErrorFields } from "../_shared/log.ts";
import { validateCatalogUpdates } from "../_shared/catalog-validation.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, undefined, req);
  const limit = checkRateLimit(`admin-sync:${clientIp(req)}`);
  if (!limit.allowed) return errorResponse("Too many requests", 429, { retryAfter: limit.retryAfter }, req);

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return errorResponse(auth.message, auth.status, undefined, req);
    const { admin, performedBy } = auth;
    const body = await readJson<Record<string, unknown>>(req, 256 * 1024);
    if (body.action === "list") {
      const { data, error } = await admin.from("products").select("*").order("id");
      if (error) throw error;
      return jsonResponse({ products: data ?? [] }, 200, req);
    }
    const parsed = validateCatalogUpdates(body);
    if (!parsed.ok) return errorResponse(parsed.message, 400, undefined, req);
    const { error } = await admin.rpc("update_catalog", {
      p_updates: parsed.updates,
      p_performed_by: performedBy,
    });
    if (error?.code === "22023") return errorResponse(error.message, 409, undefined, req);
    if (error) throw error;
    return jsonResponse({ success: true }, 200, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    logError("admin-sync error", { event: "admin_sync.exception", fn: "admin-sync", ...toErrorFields(err) });
    return errorResponse("Failed to save catalogue changes", 500, undefined, req);
  }
});
