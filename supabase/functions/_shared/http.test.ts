import { assert, assertEquals, assertFalse, assertRejects } from "jsr:@std/assert";
import {
  bearerToken,
  clientIp,
  escapeHtml,
  hasSharedSecret,
  HttpError,
  isUuid,
  isValidEmail,
  readJson,
  safeHref,
  timingSafeEqual,
} from "./http.ts";
import { buildBackInStockEmail, buildBusinessQuoteAck, buildOrderEmail } from "./resend.ts";

const req = (headers: Record<string, string> = {}, body?: string) =>
  new Request("https://x.test/fn", { method: "POST", headers, body });

Deno.test("timingSafeEqual matches only identical strings", () => {
  assert(timingSafeEqual("abc", "abc"));
  assertFalse(timingSafeEqual("abc", "abd"));
  assertFalse(timingSafeEqual("abc", "abcd"));
  assertFalse(timingSafeEqual("", "a"));
  assert(timingSafeEqual("", ""));
});

Deno.test("clientIp takes a single bounded token from forwarding headers", () => {
  assertEquals(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assertEquals(clientIp(req({ "cf-connecting-ip": "2001:db8::1" })), "2001:db8::1");
  assertEquals(clientIp(req({ "x-forwarded-for": "<script>" })), "unknown");
  assertEquals(clientIp(req()), "unknown");
});

Deno.test("bearerToken / hasSharedSecret", () => {
  const secret = "s".repeat(32);
  assertEquals(bearerToken(req({ Authorization: "Bearer abc" })), "abc");
  assertEquals(bearerToken(req({ Authorization: "Basic abc" })), "");
  assert(hasSharedSecret(req({ Authorization: `Bearer ${secret}` }), secret));
  assertFalse(hasSharedSecret(req({ Authorization: "Bearer nope" }), secret));
  // Unset or too-short secrets never authenticate.
  assertFalse(hasSharedSecret(req({ Authorization: "Bearer " }), undefined));
  assertFalse(hasSharedSecret(req({ Authorization: "Bearer short" }), "short"));
});

Deno.test("readJson rejects bad JSON, non-objects and oversized bodies", async () => {
  assertEquals(await readJson(req({}, '{"a":1}')), { a: 1 });
  await assertRejects(() => readJson(req({}, "{nope")), HttpError, "Invalid JSON");
  await assertRejects(() => readJson(req({}, "42")), HttpError, "Invalid JSON");
  await assertRejects(() => readJson(req({}, JSON.stringify({ a: "x".repeat(100) })), 50), HttpError, "too large");
});

Deno.test("escapeHtml and safeHref neutralise markup and bad schemes", () => {
  assertEquals(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assertEquals(safeHref("javascript:alert(1)"), "#");
  assertEquals(safeHref("not a url"), "#");
  assertEquals(safeHref("https://a.test/?x=1&y=2"), "https://a.test/?x=1&amp;y=2");
});

Deno.test("isValidEmail", () => {
  assert(isValidEmail("a@b.co"));
  assertFalse(isValidEmail("a@b"));
  assertFalse(isValidEmail("a,b@c.co"));
  assertFalse(isValidEmail(42));
});

Deno.test("email templates escape user-controlled values", () => {
  const evil = `<a href="https://evil.test">Claim refund</a>`;
  for (const html of [
    buildBusinessQuoteAck(evil),
    buildBackInStockEmail(evil, "javascript:alert(1)"),
    buildOrderEmail("ATW-1", 100, [{ name: evil, qty: 1, price: 100 }]),
  ]) {
    assertFalse(html.includes(evil), "raw markup leaked into email");
    assertFalse(html.includes("javascript:"), "unsafe href leaked into email");
  }
});

Deno.test("isUuid accepts canonical UUIDs only", () => {
  assert(isUuid("3f2a1b4c-0000-4000-8000-1234567890ab"));
  assertFalse(isUuid("3f2a1b4c00004000800001234567890ab"));
  assertFalse(isUuid("'; drop table orders; --"));
  assertFalse(isUuid(undefined));
  assertFalse(isUuid(42));
});
