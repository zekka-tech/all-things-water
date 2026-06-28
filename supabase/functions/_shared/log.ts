/**
 * Structured logging + critical alerting for Edge Functions.
 *
 * Emits single-line JSON to stdout/stderr so Supabase log drains (and any
 * downstream aggregator) can parse, index, and alert on fields rather than
 * grepping free-text. For order-taking and payment paths, free-text
 * `console.error` is not enough — failures must be queryable and alertable.
 *
 * `alert()` additionally fans the event out to an operator channel (Slack
 * webhook and/or email via Resend) so a failed order or ITN does not sit
 * silently in logs. Alerting never throws and never blocks the request path.
 */

type Level = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Stable machine-readable event name, e.g. "order.create.failed". */
  event: string;
  /** The function emitting the log, e.g. "orders". */
  fn?: string;
  /** Correlation id (order ref, payment id, request id). */
  ref?: string;
  [key: string]: unknown;
}

function emit(level: Level, message: string, ctx: LogContext): void {
  const line = JSON.stringify({
    level,
    message,
    ts: new Date().toISOString(),
    ...ctx,
  });
  // error/warn → stderr, rest → stdout
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logInfo(message: string, ctx: LogContext): void {
  emit("info", message, ctx);
}

export function logWarn(message: string, ctx: LogContext): void {
  emit("warn", message, ctx);
}

export function logError(message: string, ctx: LogContext): void {
  emit("error", message, ctx);
}

/**
 * Sanitise an unknown error into a structured, log-safe shape (no secrets,
 * no giant payloads, stable keys).
 */
export function toErrorFields(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { errName: err.name, errMessage: err.message };
  }
  if (err && typeof err === "object") {
    try {
      return { errMessage: JSON.stringify(err).slice(0, 500) };
    } catch {
      return { errMessage: String(err) };
    }
  }
  return { errMessage: String(err) };
}

/**
 * Log an error AND notify the operator channel. Use only for events a human
 * must see (payment confirmed but order update failed, ITN signature anomalies
 * in production, order creation 500s). Best-effort: swallows its own failures.
 */
export async function alert(message: string, ctx: LogContext): Promise<void> {
  logError(message, ctx);
  await Promise.allSettled([notifySlack(message, ctx), notifyEmail(message, ctx)]);
}

async function notifySlack(message: string, ctx: LogContext): Promise<void> {
  const webhook = Deno.env.get("ALERT_SLACK_WEBHOOK_URL");
  if (!webhook) return;
  try {
    const fields = Object.entries(ctx)
      .map(([k, v]) => `*${k}:* ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `:rotating_light: *ATW alert* — ${message}\n${fields}` }),
    });
  } catch {
    // never let alerting break the request path
  }
}

async function notifyEmail(message: string, ctx: LogContext): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("ALERT_EMAIL") || Deno.env.get("MERCHANT_EMAIL");
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water Alerts <orders@allthingswater.co.za>",
        to,
        subject: `[ATW alert] ${ctx.event}`,
        text: `${message}\n\n${JSON.stringify(ctx, null, 2)}`,
      }),
    });
  } catch {
    // never let alerting break the request path
  }
}
