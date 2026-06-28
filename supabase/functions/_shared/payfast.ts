/**
 * PayFast shared utilities for Edge Functions.
 *
 * Single source of truth for PayFast signature handling. Uses the std MD5
 * (Deno's Web Crypto has no MD5) which is correct for arbitrary-length
 * payloads — unlike a naive single-block implementation.
 *
 * IMPORTANT (PayFast gotcha): the signature must be built over the params in
 * the *exact same order* they are submitted to PayFast. PayFast recreates the
 * signature from the data in the order it receives it — so we never sort.
 * These helpers work on ordered [key, value] tuples to keep the signed string
 * and the posted string identical by construction.
 */

import { crypto } from "jsr:@std/crypto";

export type Param = [key: string, value: string];

function isSandbox(): boolean {
  return Deno.env.get("PAYFAST_SANDBOX") === "true";
}

export function getProcessUrl(): string {
  return isSandbox()
    ? "https://sandbox.payfast.co.za/eng/process"
    : "https://www.payfast.co.za/eng/process";
}

export function getValidationUrl(): string {
  return isSandbox()
    ? "https://sandbox.payfast.co.za/eng/query/validate"
    : "https://www.payfast.co.za/eng/query/validate";
}

/**
 * PayFast URL encoding: encodeURIComponent, then spaces as `+` and uppercase
 * hex escapes (PayFast expects uppercase percent-encoding).
 */
export function pfEncode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, "+")
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}

export function md5Hex(input: string): string {
  const digest = crypto.subtle.digestSync(
    "MD5",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build the `key=value&...` string from ordered params (excludes `signature`). */
function paramString(params: Param[]): string {
  return params
    .filter(([k]) => k !== "signature")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");
}

/**
 * Compute the PayFast MD5 signature over the params in the given order.
 * Pass the same ordered array you submit/received.
 */
export function buildSignature(params: Param[], passphrase?: string): string {
  const base = paramString(params);
  const toHash = passphrase
    ? `${base}&passphrase=${pfEncode(passphrase)}`
    : base;
  return md5Hex(toHash);
}

/** Verify an incoming signature against params rebuilt in their received order. */
export function verifySignature(
  params: Param[],
  signature: string,
  passphrase?: string,
): boolean {
  if (!signature) return false;
  return buildSignature(params, passphrase) === signature;
}

/**
 * Build the full POST/redirect query string, appending the signature computed
 * over the identical ordered params — guaranteeing signed order == sent order.
 */
export function buildSignedQuery(params: Param[], passphrase?: string): string {
  const signature = buildSignature(params, passphrase);
  return `${paramString(params)}&signature=${signature}`;
}

/** Parse an `x-www-form-urlencoded` body into ordered [key, value] tuples. */
export function parseFormParams(body: string): Param[] {
  const out: Param[] = [];
  for (const pair of body.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const key = idx === -1 ? pair : pair.slice(0, idx);
    const val = idx === -1 ? "" : pair.slice(idx + 1);
    out.push([
      decodeURIComponent(key),
      decodeURIComponent(val.replace(/\+/g, " ")),
    ]);
  }
  return out;
}

/** Convenience: look up a single value from ordered params. */
export function getParam(params: Param[], key: string): string | undefined {
  return params.find(([k]) => k === key)?.[1];
}
