import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import { serviceClient } from "../_shared/auth.ts";
import { clientIp as getClientIp, HttpError, isValidEmail, readJson } from "../_shared/http.ts";
import { sendNewsletterWelcome } from "../_shared/resend.ts";

/**
 * Newsletter sign-up from the footer strip (src/components/Footer.tsx).
 *
 * The footer previously posted to VITE_NEWSLETTER_ENDPOINT, which was never
 * set and had no function behind it, so the strip reported "currently
 * unavailable".
 *
 * Deliberately does NOT call verifyTurnstile(): the footer form sends no
 * token, and verifyTurnstile(undefined) fails closed whenever
 * TURNSTILE_SECRET_KEY is set — which it is in production — so every sign-up
 * would be rejected. Abuse is bounded by the two rate limiters instead. Add a
 * widget to the footer first if this ever needs bot protection.
 */
interface NewsletterBody {
  email?: unknown;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`newsletter:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const body = await readJson<NewsletterBody>(req);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return errorResponse("A valid email is required", 400, undefined, req);
    }

    const supabase = serviceClient();

    const dbLimit = await checkRateLimitDb(supabase, `newsletter:${clientIp}`, {
      max: 5,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    // Already subscribed: succeed without touching the row or re-sending the
    // welcome, so a double submit cannot be used to mail-bomb an address.
    const { data: existing, error: lookupErr } = await supabase
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (lookupErr) {
      await alert("failed to look up newsletter subscriber", {
        event: "newsletter.lookup_failed",
        fn: "newsletter",
        ...toErrorFields(lookupErr),
      });
      return errorResponse("Failed to subscribe", 500, undefined, req);
    }

    if (existing?.status === "subscribed") {
      return jsonResponse({ ok: true, alreadySubscribed: true }, 200, req);
    }

    // New address, or one that had unsubscribed and is opting back in.
    const { error: upsertErr } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, status: "subscribed", source: "footer" },
        { onConflict: "email" },
      );

    if (upsertErr) {
      await alert("failed to store newsletter subscriber", {
        event: "newsletter.upsert_failed",
        fn: "newsletter",
        ...toErrorFields(upsertErr),
      });
      return errorResponse("Failed to subscribe", 500, undefined, req);
    }

    // Best-effort; the subscription is already stored.
    await Promise.allSettled([sendNewsletterWelcome(email)]);

    logInfo("newsletter subscription", {
      event: "newsletter.subscribed",
      fn: "newsletter",
      resubscribed: Boolean(existing),
    });

    return jsonResponse({ ok: true }, 201, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    await alert("unhandled newsletter error", {
      event: "newsletter.exception",
      fn: "newsletter",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
