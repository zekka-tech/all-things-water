# Observability & SLOs

How All Things Water is monitored in production: structured logs, critical
alerting, a public health probe, and a scheduled SLO monitor.

## Signals

| Layer | Mechanism |
| --- | --- |
| Structured logs | `_shared/log.ts` emits single-line JSON (`level`, `event`, `fn`, `ref`, …) from every Edge Function. Pipe Supabase log drains into your aggregator and query on `event`. |
| Critical alerting | `alert()` fans urgent events (order-create failures, ITN signature/amount anomalies, paid-but-update-failed, SLO breaches) to Slack (`ALERT_SLACK_WEBHOOK_URL`) and/or email (`ALERT_EMAIL`). Never blocks the request path. |
| Frontend errors | Consent-gated Sentry envelope (`VITE_SENTRY_DSN`). |
| Health probe | `health` Edge Function — black-box up/down + DB latency for external uptime monitors. |
| SLO monitor | `monitor` Edge Function — scheduled synthetic checks, persists `slo_samples`, alerts on breach. |

## SLO targets

| SLO | Target | Threshold (env) | Breach signal |
| --- | --- | --- | --- |
| Database availability | Probe succeeds | — | `db.up` |
| Database latency (probe) | ≤ 1000 ms | `SLO_DB_LATENCY_MS` (default 1000) | `db.latency` |
| Order-flow health | ≤ 3 orders stuck pending > 1h | `SLO_MAX_STUCK_ORDERS` (default 3) | `orders.flow` (proxy for stalled ITN / expiry sweep) |

Tune the targets via env without code changes. `evaluateSlo()` in
`_shared/slo.ts` is the pure, unit-tested decision logic.

## Health endpoint (external uptime)

`GET https://<project>.supabase.co/functions/v1/health`

- `200 {"status":"ok","checks":{"db":{"ok":true,"latencyMs":N}}}` when healthy.
- `503 {"status":"degraded",...}` when the DB probe fails.

Point an external monitor at it (every 1–5 min):

- **Cloudflare Health Checks** — HTTP monitor on the URL, expect `200`.
- **UptimeRobot / Better Uptime** — keyword monitor on `"status":"ok"`.

It reveals only up/down + latency (no data) and uses the anon key, never the
service role.

## SLO monitor (scheduled)

`POST https://<project>.supabase.co/functions/v1/monitor` with the shared secret.
Invoke every 5–15 min via a Supabase scheduled function (pg_cron + pg_net) or any
external cron:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/monitor" \
  -H "Authorization: Bearer $MONITOR_CRON_SECRET"
```

Each run probes DB latency, reads `order_flow_health(60)`, writes two
`slo_samples` rows, alerts on any breach, and prunes samples older than 30 days.
Returns `200` when all SLOs hold, `503` with the breach list otherwise.

## Required configuration (Supabase Edge Function secrets)

```text
MONITOR_CRON_SECRET=<long-random-string>
# Optional SLO overrides:
SLO_DB_LATENCY_MS=1000
SLO_MAX_STUCK_ORDERS=3
# Alert delivery (shared with the rest of the alerting):
ALERT_SLACK_WEBHOOK_URL=<incoming-webhook>
ALERT_EMAIL=ops@allthingswater.co.za
```

Deploy `health` and `monitor` alongside the other functions (see
`PRODUCTION_GO_LIVE.md`).
