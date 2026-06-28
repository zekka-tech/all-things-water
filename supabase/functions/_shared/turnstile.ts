/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Gated on `TURNSTILE_SECRET_KEY`: when unset, verification is skipped (returns
 * `true`) so the function works in dev/unconfigured deploys. When set, a missing
 * or invalid token fails closed.
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Whether server-side Turnstile verification is configured/required. */
export function turnstileConfigured(): boolean {
  return Boolean(Deno.env.get("TURNSTILE_SECRET_KEY"));
}

/**
 * Returns true if the request may proceed: either Turnstile is not configured,
 * or the token is present and validates with Cloudflare. Never throws.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true; // not configured → skip
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed on verification errors
  }
}
