import { env } from "@/lib/env";

/** True when Cloudflare Turnstile is configured and a token should be collected. */
export function turnstileEnabled(): boolean {
  return Boolean(env.turnstileSiteKey);
}
