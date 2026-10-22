/**
 * Small, dependency-free request helpers shared by every Edge Function.
 * Pure functions only, so they can be unit-tested without Deno.serve.
 */

/** Default cap on JSON request bodies. Real payloads here are < 10 KB. */
export const MAX_JSON_BYTES = 64 * 1024;

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Client IP for rate-limit keys and logging. Uses the first hop of
 * X-Forwarded-For (set by the Supabase edge proxy), then CF-Connecting-IP.
 * Always returns a single, bounded token — never the raw header — so callers
 * cannot mint unlimited rate-limit buckets by padding the header.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  const first = xff?.split(",")[0]?.trim();
  const ip = first || req.headers.get("cf-connecting-ip")?.trim() || "";
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "unknown";
}

/**
 * Parse a JSON body with a size cap. Throws HttpError(400/413) instead of a
 * bare SyntaxError so handlers can map it to a clean client error.
 */
export async function readJson<T = unknown>(req: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > maxBytes) throw new HttpError(413, "Request body too large");

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "Request body too large");
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== "object") {
      throw new Error("not an object");
    }
    return parsed as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** Constant-time string comparison (for secrets, tokens and signatures). */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  // Compare against the longer length so the loop time does not leak which
  // input was shorter; the length check is folded into the result.
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

/** Extract a Bearer token from the Authorization header ("" when absent). */
export function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
}

/** True when the request carries `Authorization: Bearer <secret>` and the secret is set. */
export function hasSharedSecret(req: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  return timingSafeEqual(bearerToken(req), secret);
}

/** Escape text for safe interpolation into HTML element content or attributes. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only allow http(s) URLs into email hrefs; anything else becomes "#". */
export function safeHref(url: string): string {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? escapeHtml(u.toString()) : "#";
  } catch {
    return "#";
  }
}

/** Trim and cap a free-text field; returns undefined when empty. */
export function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value.trim());
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical UUID string (order ids, checkout tokens). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
