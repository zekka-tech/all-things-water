import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";

/**
 * Admin-only multi-warehouse management: list warehouses + per-product on-hand,
 * and set a product's on-hand at a warehouse. Auth mirrors order-status (verify
 * the caller's JWT, then check the `admins` allowlist server-side).
 */
interface Body {
  action: "list" | "setStock";
  productId?: string;
  warehouseId?: string;
  onHand?: number;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

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

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: adminRow } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!adminRow) return errorResponse("Forbidden", 403);

    const body: Body = await req.json();

    if (body.action === "setStock") {
      if (!body.productId || !body.warehouseId || typeof body.onHand !== "number") {
        return errorResponse("productId, warehouseId and onHand are required", 400);
      }
      const onHand = Math.max(0, Math.floor(body.onHand));
      const { error } = await admin
        .from("product_warehouse_stock")
        .upsert(
          { product_id: body.productId, warehouse_id: body.warehouseId, on_hand: onHand, updated_at: new Date().toISOString() },
          { onConflict: "product_id,warehouse_id" },
        );
      if (error) {
        console.error("setStock error:", error);
        return errorResponse("Failed to update stock", 500);
      }
      await admin.from("admin_audit_log").insert({
        action: "warehouse_stock_set",
        changes: { productId: body.productId, warehouseId: body.warehouseId, onHand },
        performed_by: userData.user.email ?? userData.user.id,
        performed_at: new Date().toISOString(),
      });
      return jsonResponse({ ok: true });
    }

    // Default: list
    const { data: warehouses, error: whErr } = await admin
      .from("warehouses")
      .select("id, code, name, province, serves_regions, priority, active")
      .order("priority", { ascending: true });
    if (whErr) {
      console.error("warehouses list error:", whErr);
      return errorResponse("Failed to load warehouses", 500);
    }

    const { data: stock, error: stockErr } = await admin
      .from("product_warehouse_stock")
      .select("product_id, warehouse_id, on_hand");
    if (stockErr) {
      console.error("stock list error:", stockErr);
      return errorResponse("Failed to load stock", 500);
    }

    return jsonResponse({ warehouses: warehouses ?? [], stock: stock ?? [] });
  } catch (err) {
    console.error("admin-warehouses error:", err);
    return errorResponse("Internal server error", 500);
  }
});
