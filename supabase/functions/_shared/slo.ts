/**
 * Pure SLO evaluation — kept side-effect-free so it can be unit-tested without
 * a network or DB. The `monitor` Edge Function gathers the inputs and acts on
 * the returned breaches (alerting + persistence).
 */

export interface SloThresholds {
  /** Max acceptable DB round-trip for the health probe. */
  dbLatencyMs: number;
  /** Max pending-payment orders older than 1h before we flag a flow problem. */
  maxStuckOrders: number;
}

export interface HealthInputs {
  dbOk: boolean;
  dbLatencyMs: number;
  pendingStuck: number;
}

export interface SloBreach {
  check: string;
  detail: string;
}

export const DEFAULT_THRESHOLDS: SloThresholds = {
  dbLatencyMs: 1000,
  maxStuckOrders: 3,
};

/** Read thresholds from env with sane fallbacks. */
export function thresholdsFromEnv(get: (k: string) => string | undefined): SloThresholds {
  const num = (k: string, d: number) => {
    const v = Number(get(k));
    return Number.isFinite(v) && v > 0 ? v : d;
  };
  return {
    dbLatencyMs: num("SLO_DB_LATENCY_MS", DEFAULT_THRESHOLDS.dbLatencyMs),
    maxStuckOrders: num("SLO_MAX_STUCK_ORDERS", DEFAULT_THRESHOLDS.maxStuckOrders),
  };
}

/** Return the list of breached SLOs (empty = healthy). */
export function evaluateSlo(inputs: HealthInputs, t: SloThresholds): SloBreach[] {
  const breaches: SloBreach[] = [];

  if (!inputs.dbOk) {
    breaches.push({ check: "db.up", detail: "database health probe failed" });
  } else if (inputs.dbLatencyMs > t.dbLatencyMs) {
    breaches.push({
      check: "db.latency",
      detail: `db latency ${inputs.dbLatencyMs}ms exceeds ${t.dbLatencyMs}ms`,
    });
  }

  if (inputs.pendingStuck > t.maxStuckOrders) {
    breaches.push({
      check: "orders.flow",
      detail: `${inputs.pendingStuck} orders stuck pending >1h (>${t.maxStuckOrders}) — check ITN / expiry sweep`,
    });
  }

  return breaches;
}
