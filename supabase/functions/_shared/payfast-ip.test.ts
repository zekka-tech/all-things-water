import { assertEquals } from "jsr:@std/assert";
import { clientIpFrom, isAllowedPayfastIp } from "./payfast-ip.ts";

function reqWith(headers: Record<string, string>): Request {
  return new Request("https://example.com/itn", { method: "POST", headers });
}

Deno.test("clientIpFrom takes first hop of x-forwarded-for", () => {
  const req = reqWith({ "x-forwarded-for": "197.97.145.150, 10.0.0.1" });
  assertEquals(clientIpFrom(req), "197.97.145.150");
});

Deno.test("clientIpFrom falls back to cf-connecting-ip", () => {
  const req = reqWith({ "cf-connecting-ip": "41.74.179.200" });
  assertEquals(clientIpFrom(req), "41.74.179.200");
});

Deno.test("sandbox bypasses IP check", () => {
  Deno.env.set("PAYFAST_SANDBOX", "true");
  const req = reqWith({ "x-forwarded-for": "8.8.8.8" });
  assertEquals(isAllowedPayfastIp(req), true);
  Deno.env.delete("PAYFAST_SANDBOX");
});

Deno.test("disabled flag bypasses IP check", () => {
  Deno.env.set("PAYFAST_ITN_IP_CHECK", "false");
  const req = reqWith({ "x-forwarded-for": "8.8.8.8" });
  assertEquals(isAllowedPayfastIp(req), true);
  Deno.env.delete("PAYFAST_ITN_IP_CHECK");
});

Deno.test("accepts IPs inside published PayFast ranges", () => {
  // 197.97.145.144/28 -> .144 .. .159
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "197.97.145.144" })), true);
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "197.97.145.159" })), true);
  // 41.74.179.192/27 -> .192 .. .223
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "41.74.179.220" })), true);
  // single host /32
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "144.126.193.139" })), true);
});

Deno.test("rejects IPs outside published ranges", () => {
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "197.97.145.160" })), false);
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "8.8.8.8" })), false);
  assertEquals(isAllowedPayfastIp(reqWith({ "x-forwarded-for": "41.74.179.224" })), false);
});

Deno.test("fail-open when no source IP resolvable", () => {
  assertEquals(isAllowedPayfastIp(reqWith({})), true);
});
