import { assertEquals } from "jsr:@std/assert";
import {
  DEFAULT_THRESHOLDS,
  evaluateSlo,
  thresholdsFromEnv,
} from "./slo.ts";

Deno.test("healthy inputs produce no breaches", () => {
  const breaches = evaluateSlo(
    { dbOk: true, dbLatencyMs: 120, pendingStuck: 0 },
    DEFAULT_THRESHOLDS,
  );
  assertEquals(breaches, []);
});

Deno.test("db down is a breach", () => {
  const breaches = evaluateSlo(
    { dbOk: false, dbLatencyMs: 0, pendingStuck: 0 },
    DEFAULT_THRESHOLDS,
  );
  assertEquals(breaches.length, 1);
  assertEquals(breaches[0].check, "db.up");
});

Deno.test("db latency over threshold is a breach", () => {
  const breaches = evaluateSlo(
    { dbOk: true, dbLatencyMs: 5000, pendingStuck: 0 },
    DEFAULT_THRESHOLDS,
  );
  assertEquals(breaches.length, 1);
  assertEquals(breaches[0].check, "db.latency");
});

Deno.test("too many stuck orders is a breach", () => {
  const breaches = evaluateSlo(
    { dbOk: true, dbLatencyMs: 100, pendingStuck: 10 },
    DEFAULT_THRESHOLDS,
  );
  assertEquals(breaches.length, 1);
  assertEquals(breaches[0].check, "orders.flow");
});

Deno.test("multiple breaches reported together", () => {
  const breaches = evaluateSlo(
    { dbOk: false, dbLatencyMs: 0, pendingStuck: 99 },
    DEFAULT_THRESHOLDS,
  );
  assertEquals(breaches.length, 2);
});

Deno.test("thresholdsFromEnv overrides defaults; ignores junk", () => {
  const env: Record<string, string> = {
    SLO_DB_LATENCY_MS: "250",
    SLO_MAX_STUCK_ORDERS: "not-a-number",
  };
  const t = thresholdsFromEnv((k) => env[k]);
  assertEquals(t.dbLatencyMs, 250);
  assertEquals(t.maxStuckOrders, DEFAULT_THRESHOLDS.maxStuckOrders);
});
