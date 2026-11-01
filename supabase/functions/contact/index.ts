import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { serviceClient } from "../_shared/auth.ts";
import { clientIp as getClientIp, HttpError, isValidEmail, readJson } from "../_shared/http.ts";
import { sendContactAck, sendContactNotification } from "../_shared/resend.ts";

/**
 * Public contact form (src/pages/Contact.tsx).
 *
 * The page previously posted to VITE_CONTACT_FORM_ENDPOINT, which was never
 * set and had no function behind it, so the form refused to submit. Mirrors
 * business-quote: Turnstile, in-memory then database rate limiting, persist,
 * then notify — the message is stored before any email is attempted.
 */
interface ContactBody {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
}

const MAX_LEN = 5000;
const clip = (v: unknown, max = MAX_LEN): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`contact:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const body = await readJson<ContactBody>(req);

    // Bot protection (no-op unless TURNSTILE_SECRET_KEY is configured).
    const human = await verifyTurnstile(
      typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
      clientIp === "unknown" ? undefined : clientIp,
    );
    if (!human) {
      return errorResponse("Verification failed. Please try again.", 400, undefined, req);
    }

    const name = clip(body.name, 200);
    const message = clip(body.message);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name) return errorResponse("Name is required", 400, undefined, req);
    if (!isValidEmail(email)) {
      return errorResponse("A valid email is required", 400, undefined, req);
    }
    if (!message) return errorResponse("Message is required", 400, undefined, req);

    const contact = { name, email, phone: clip(body.phone, 30), message };

    const supabase = serviceClient();

    const dbLimit = await checkRateLimitDb(supabase, `contact:${clientIp}`, {
      max: 5,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    const { error: insertErr } = await supabase.from("contact_messages").insert({
      name: contact.name,
      email: contact.email,
      phone: contact.phone ?? null,
      message: contact.message,
    });

    if (insertErr) {
      await alert("failed to store contact message", {
        event: "contact.insert_failed",
        fn: "contact",
        ...toErrorFields(insertErr),
      });
      return errorResponse("Failed to send your message", 500, undefined, req);
    }

    // Notifications are best-effort; the message is already persisted.
    await Promise.allSettled([
      sendContactNotification(contact),
      sendContactAck(contact.email, contact.name),
    ]);

    logInfo("contact message received", { event: "contact.received", fn: "contact" });

    return jsonResponse({ ok: true }, 201, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    await alert("unhandled contact form error", {
      event: "contact.exception",
      fn: "contact",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
