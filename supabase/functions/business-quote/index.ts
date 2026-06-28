import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";
import {
  sendBusinessQuoteAck,
  sendBusinessQuoteNotification,
} from "../_shared/resend.ts";

interface QuoteBody {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  teamSize?: string;
  interest?: string;
  message?: string;
}

const MAX_LEN = 2000;
const clip = (v: string | undefined): string | undefined =>
  v?.trim() ? v.trim().slice(0, MAX_LEN) : undefined;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, undefined, req);
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rateLimit = checkRateLimit(`business-quote:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse("Too many requests. Please try again later.", 429, {
      retryAfter: rateLimit.retryAfter,
    }, req);
  }

  try {
    const body: QuoteBody = await req.json();

    const companyName = clip(body.companyName);
    const contactName = clip(body.contactName);
    const email = body.email?.trim().toLowerCase();

    if (!companyName) return errorResponse("Company name is required", 400, undefined, req);
    if (!contactName) return errorResponse("Contact name is required", 400, undefined, req);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("A valid email is required", 400, undefined, req);
    }

    const quote = {
      companyName,
      contactName,
      email,
      phone: clip(body.phone),
      teamSize: clip(body.teamSize),
      interest: clip(body.interest),
      message: clip(body.message),
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Server configuration is incomplete", 500, undefined, req);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

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
    await alert("unhandled B2B quote error", {
      event: "business_quote.exception",
      fn: "business-quote",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
