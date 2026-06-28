import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import { evaluateSlo, thresholdsFromEnv, type HealthInputs } from "../_shared/slo.ts";

/**
 * Scheduled SLO monitor. Invoke on a cron (e.g. every 5–15 min) with the shared
 * secret. Runs synthetic checks (DB latency + order-flow health), records each
 * as an slo_samples row, and alerts (Slack/email via _shared/log.ts) on any SLO
 * breach. Black-box by design — no per-request instrumentation overhead.
 */
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const secret = Deno.env.get("MONITOR_CRON_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. DB latency probe.
    const started = Date.now();
    let dbOk = false;
    try {
      const { error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .limit(1);
      dbOk = !error;
    } catch {
      dbOk = false;
    }
    const dbLatencyMs = Date.now() - started;

    // 2. Order-flow health.
    let pendingStuck = 0;
    let flow: Record<string, number> = {};
    try {
      const { data } = await supabase.rpc("order_flow_health", { p_window_minutes: 60 });
      if (data && typeof data === "object") {
        flow = data as Record<string, number>;
        pendingStuck = Number(flow.pendingStuck ?? 0);
      }
    } catch {
      /* treated as no signal */
    }

    const thresholds = thresholdsFromEnv((k) => Deno.env.get(k));
    const inputs: HealthInputs = { dbOk, dbLatencyMs, pendingStuck };
    const breaches = evaluateSlo(inputs, thresholds);

    // 3. Persist samples (best-effort).
    await supabase.from("slo_samples").insert([
      { check_name: "db.probe", ok: dbOk, latency_ms: dbLatencyMs, detail: null },
      {
        check_name: "orders.flow",
        ok: breaches.every((b) => b.check !== "orders.flow"),
        latency_ms: null,
        detail: flow,
      },
    ]);

    // 4. Alert on breaches.
    if (breaches.length > 0) {
      await alert("SLO breach detected", {
        event: "monitor.slo_breach",
        fn: "monitor",
        breaches: breaches.map((b) => `${b.check}: ${b.detail}`),
        dbLatencyMs,
        pendingStuck,
      });
    } else {
      logInfo("monitor ok", {
        event: "monitor.ok",
        fn: "monitor",
        dbLatencyMs,
        pendingStuck,
      });
    }

    // 5. Opportunistic retention.
    await supabase.rpc("prune_slo_samples", { p_older_than_days: 30 });

    return jsonResponse(
      {
        status: breaches.length === 0 ? "ok" : "breach",
        dbOk,
        dbLatencyMs,
        flow,
        breaches,
      },
      breaches.length === 0 ? 200 : 503,
      req,
    );
  } catch (err) {
    await alert("monitor run failed", {
      event: "monitor.exception",
      fn: "monitor",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500);
  }
});
