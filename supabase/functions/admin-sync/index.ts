import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  jsonResponse,
  errorResponse,
} from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface SyncPayload {
  adminPassword: string;
  stockUpdates: Record<string, number>;
  auditEvents: {
    action: string;
    productId?: string;
    productName?: string;
    changes: Record<string, unknown>;
  }[];
}

const ADMIN_PASSWORD = Deno.env.get("VITE_ADMIN_PASSWORD") || "atw-admin-2024";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const rateLimit = checkRateLimit(`admin-sync:${clientIp}`);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter: rateLimit.retryAfter }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body: SyncPayload = await req.json();

    if (body.adminPassword !== ADMIN_PASSWORD) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update product stock levels
    if (body.stockUpdates && Object.keys(body.stockUpdates).length > 0) {
      for (const [productId, newStock] of Object.entries(body.stockUpdates)) {
        const { error } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", productId);

        if (error) {
          console.error(`Failed to update stock for ${productId}:`, error);
          return errorResponse("Failed to update stock", 500);
        }
      }
    }

    // Record audit events
    if (body.auditEvents && body.auditEvents.length > 0) {
      const { error } = await supabase
        .from("admin_audit_log")
        .insert(body.auditEvents.map((e) => ({
          action: e.action,
          product_id: e.productId || null,
          product_name: e.productName || null,
          changes: e.changes,
          performed_at: new Date().toISOString(),
        })));

      if (error) {
        console.error("Failed to record audit log:", error);
        return errorResponse("Failed to record audit log", 500);
      }
    }

    return jsonResponse({ success: true, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error("admin-sync error:", err);
    return errorResponse("Internal server error", 500);
  }
});
