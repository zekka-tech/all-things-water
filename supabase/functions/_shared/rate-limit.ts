import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Authoritative, cross-instance rate limit backed by the `check_rate_limit`
 * Postgres RPC. Use after the in-memory `checkRateLimit` (L1). Fails open on
 * any limiter error so a limiter outage never blocks legitimate traffic.
 */
export async function checkRateLimitDb(
  supabase: SupabaseClient,
  key: string,
  opts: { max?: number; windowSeconds?: number } = {},
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: opts.max ?? MAX_REQUESTS,
      p_window_seconds: opts.windowSeconds ?? 60,
    });
    if (error || !data) return { allowed: true };
    return {
      allowed: data.allowed !== false,
      retryAfter: typeof data.retryAfter === "number" ? data.retryAfter : undefined,
    };
  } catch {
    return { allowed: true };
  }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);
