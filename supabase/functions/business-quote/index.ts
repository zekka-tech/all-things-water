import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit, checkRateLimitDb } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";
import { serviceClient } from "../_shared/auth.ts";
import { clientIp as getClientIp, HttpError, isValidEmail, readJson } from "../_shared/http.ts";
import {
  sendBusinessQuoteAck,
  sendBusinessQuoteNotification,
} from "../_shared/resend.ts";

interface QuoteBody {
  companyName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  teamSize?: unknown;
  interest?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
}

const MAX_LEN = 2000;
const clip = (v: unknown, max = MAX_LEN): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`business-quote:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const body = await readJson<QuoteBody>(req);

    // Bot protection (no-op unless TURNSTILE_SECRET_KEY is configured).
    const human = await verifyTurnstile(
      typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
      clientIp === "unknown" ? undefined : clientIp,
    );
    if (!human) {
      return errorResponse("Verification failed. Please try again.", 400, undefined, req);
    }

    const companyName = clip(body.companyName, 200);
    const contactName = clip(body.contactName, 200);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!companyName) return errorResponse("Company name is required", 400, undefined, req);
    if (!contactName) return errorResponse("Contact name is required", 400, undefined, req);
    if (!isValidEmail(email)) {
      return errorResponse("A valid email is required", 400, undefined, req);
    }

    const quote = {
      companyName,
      contactName,
      email,
      phone: clip(body.phone, 30),
      teamSize: clip(body.teamSize, 50),
      interest: clip(body.interest, 200),
      message: clip(body.message),
    };

    const supabase = serviceClient();

    const dbLimit = await checkRateLimitDb(supabase, `business-quote:${clientIp}`, {
      max: 5,
      windowSeconds: 60,
    });
    if (!dbLimit.allowed) {
      return errorResponse("Too many requests. Please try again later.", 429, {
        retryAfter: dbLimit.retryAfter,
      }, req);
    }

    const { error: insertErr } = await supabase.from("business_quotes").insert({
      company_name: quote.companyName,
      contact_name: quote.contactName,
      email: quote.email,
      phone: quote.phone ?? null,
      team_size: quote.teamSize ?? null,
      interest: quote.interest ?? null,
      message: quote.message ?? null,
    });

    if (insertErr) {
      await alert("failed to store B2B quote", {
        event: "business_quote.insert_failed",
        fn: "business-quote",
        company: quote.companyName,
        ...toErrorFields(insertErr),
      });
      return errorResponse("Failed to submit your request", 500, undefined, req);
    }

    // Notifications are best-effort; the lead is already persisted.
    await Promise.allSettled([
      sendBusinessQuoteNotification(quote),
      sendBusinessQuoteAck(quote.email, quote.contactName),
    ]);

    logInfo("B2B quote received", {
      event: "business_quote.received",
      fn: "business-quote",
      company: quote.companyName,
    });

    return jsonResponse({ ok: true }, 201, req);
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.message, err.status, err.details, req);
    await alert("unhandled B2B quote error", {
      event: "business_quote.exception",
      fn: "business-quote",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
