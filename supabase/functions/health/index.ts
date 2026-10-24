import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

/**
 * Public health probe for external uptime monitors (Cloudflare Health Checks,
 * UptimeRobot, Better Uptime, …). Returns 200 when the app can reach its
 * database, 503 otherwise. Reveals only up/down + latency — no sensitive data —
 * and uses the anon key (public product read), never the service role.
 */
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    return jsonResponse(
      { status: "error", checks: { config: false }, ts: new Date().toISOString() },
      503,
      req,
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const started = Date.now();
  let dbOk = false;
  try {
    // Cheap head count against a public-readable table.
    const { error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const dbLatencyMs = Date.now() - started;

  const status = dbOk ? "ok" : "degraded";
  return jsonResponse(
    {
      status,
      checks: { db: { ok: dbOk, latencyMs: dbLatencyMs } },
      ts: new Date().toISOString(),
    },
    dbOk ? 200 : 503,
    req,
  );
});
