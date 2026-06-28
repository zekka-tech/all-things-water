const BASE_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Vary": "Origin",
};

/**
 * Comma-separated allowlist of browser origins permitted to call the Edge
 * Functions, e.g. "https://allthingswater.co.za,https://all-things-water.pages.dev".
 * If unset, falls back to "*" so unconfigured/preview deploys keep working —
 * configure it in production to lock the browser surface down.
 */
function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Resolve the `Access-Control-Allow-Origin` value for this request. */
export function resolveAllowedOrigin(req: Request): string {
  const allow = allowedOrigins();
  if (allow.length === 0) return "*";
  const origin = req.headers.get("Origin") || "";
  return allow.includes(origin) ? origin : allow[0];
}

export function corsHeadersFor(req: Request): Record<string, string> {
  return {
    ...BASE_CORS_HEADERS,
    "Access-Control-Allow-Origin": resolveAllowedOrigin(req),
  };
}

/** Static headers (origin "*") for contexts without a request object. */
export const corsHeaders: Record<string, string> = {
  ...BASE_CORS_HEADERS,
  "Access-Control-Allow-Origin": "*",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeadersFor(req), status: 204 });
  }
  return null;
}

export function jsonResponse(
  data: unknown,
  status = 200,
  req?: Request,
): Response {
  const cors = req ? corsHeadersFor(req) : corsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status: number,
  details?: unknown,
  req?: Request,
): Response {
  return jsonResponse({ error: message, details }, status, req);
}
