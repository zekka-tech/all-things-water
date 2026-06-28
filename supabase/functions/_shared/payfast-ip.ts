/**
 * PayFast ITN source-IP allowlisting (defense in depth).
 *
 * The ITN is already authenticated by (a) MD5 signature over the posted params
 * and (b) the server-to-server validation callback to PayFast. Source-IP
 * verification is PayFast's recommended *additional* control so forged POSTs
 * are rejected before any network round-trip.
 *
 * Ranges per PayFast's published ITN source list. Sandbox traffic is not
 * IP-checked. Set `PAYFAST_ITN_IP_CHECK=false` to disable (e.g. if fronted by a
 * proxy that rewrites the source IP and the published ranges no longer apply).
 */

// PayFast published ITN source ranges (CIDR).
const PAYFAST_CIDRS: ReadonlyArray<string> = [
  "197.97.145.144/28",
  "41.74.179.192/27",
  "102.216.36.0/28",
  "102.216.36.128/28",
  "144.126.193.139/32",
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    acc = (acc << 8) | n;
  }
  return acc >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  const bits = Number(bitsStr);
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/** Pull the client IP from forwarding headers (first hop in x-forwarded-for). */
export function clientIpFrom(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || "";
}

/**
 * Returns true if the request should be accepted on IP grounds. Always true in
 * sandbox, when disabled, or when no IP is resolvable (fail-open is acceptable
 * here because signature + validation callback remain mandatory upstream).
 */
export function isAllowedPayfastIp(req: Request): boolean {
  if (Deno.env.get("PAYFAST_SANDBOX") === "true") return true;
  if (Deno.env.get("PAYFAST_ITN_IP_CHECK") === "false") return true;
  const ip = clientIpFrom(req);
  if (!ip) return true;
  return PAYFAST_CIDRS.some((cidr) => inCidr(ip, cidr));
}
