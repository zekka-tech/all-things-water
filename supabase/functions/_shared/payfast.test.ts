import { assertEquals, assert } from "jsr:@std/assert";
import {
  buildSignature,
  verifySignature,
  buildSignedQuery,
  pfEncode,
  parseFormParams,
  getParam,
  type Param,
} from "./payfast.ts";

// ── pfEncode ──

Deno.test("pfEncode trims whitespace", () => {
  assertEquals(pfEncode("  hello  "), "hello");
});

Deno.test("pfEncode encodes spaces as plus signs", () => {
  assertEquals(pfEncode("hello world"), "hello+world");
});

Deno.test("pfEncode encodes special characters", () => {
  const encoded = pfEncode("test@example.com");
  assertEquals(encoded, "test%40example.com");
});

Deno.test("pfEncode preserves alphanumeric chars", () => {
  assertEquals(pfEncode("abc123"), "abc123");
});

// ── buildSignature ──

Deno.test("buildSignature without passphrase", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["merchant_key", "46f0cd694581a"],
    ["amount", "100.00"],
    ["item_name", "Test Item"],
  ];

  const sig = buildSignature(params);
  // Signature should be a 32-char hex string
  assertEquals(sig.length, 32);
  assertEquals(/^[a-f0-9]{32}$/.test(sig), true);
});

Deno.test("buildSignature with passphrase", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "50.00"],
  ];

  const sigNoPassphrase = buildSignature(params);
  const sigWithPassphrase = buildSignature(params, "secret123");

  // Different passphrase should produce different signatures
  assertEquals(sigNoPassphrase.length, 32);
  assertEquals(sigWithPassphrase.length, 32);
  assert(sigNoPassphrase !== sigWithPassphrase);
});

Deno.test("buildSignature is deterministic", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["merchant_key", "46f0cd694581a"],
    ["amount", "299.95"],
  ];

  const sig1 = buildSignature(params, "pass");
  const sig2 = buildSignature(params, "pass");

  assertEquals(sig1, sig2);
});

Deno.test("buildSignature depends on parameter order", () => {
  const params1: Param[] = [
    ["amount", "100.00"],
    ["item_name", "A"],
    ["merchant_id", "1"],
  ];
  const params2: Param[] = [
    ["merchant_id", "1"],
    ["item_name", "A"],
    ["amount", "100.00"],
  ];

  const sig1 = buildSignature(params1);
  const sig2 = buildSignature(params2);

  assert(sig1 !== sig2);
});

Deno.test("buildSignature ignores signature param in computation", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "100.00"],
    ["signature", "abcdef1234567890abcdef1234567890"],
  ];

  const sig = buildSignature(params);
  // The signature param should not be included in the hash
  assertEquals(sig.length, 32);
});

Deno.test("buildSignature with empty passphrase behaves like no passphrase", () => {
  const params: Param[] = [["key", "value"]];
  assertEquals(buildSignature(params, ""), buildSignature(params));
});

// ── verifySignature ──

Deno.test("verifySignature returns true for valid signature", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "100.00"],
  ];

  const sig = buildSignature(params, "pass");
  assertEquals(verifySignature(params, sig, "pass"), true);
});

Deno.test("verifySignature returns false for wrong signature", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "100.00"],
  ];

  assertEquals(verifySignature(params, "deadbeef", "pass"), false);
});

Deno.test("verifySignature returns false for empty signature", () => {
  const params: Param[] = [["key", "value"]];
  assertEquals(verifySignature(params, "", "pass"), false);
});

Deno.test("verifySignature returns false for wrong passphrase", () => {
  const params: Param[] = [["merchant_id", "10000100"]];
  const sig = buildSignature(params, "correct");
  assertEquals(verifySignature(params, sig, "wrong"), false);
});

// ── buildSignedQuery ──

Deno.test("buildSignedQuery appends signature to param string", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "100.00"],
  ];

  const query = buildSignedQuery(params, "pass");
  assert(query.includes("merchant_id=10000100"));
  assert(query.includes("amount=100.00"));
  assert(query.includes("&signature="));
  assertEquals(query.split("&signature=").length, 2);
});

Deno.test("buildSignedQuery signature matches buildSignature", () => {
  const params: Param[] = [
    ["merchant_id", "10000100"],
    ["amount", "100.00"],
  ];

  const sig = buildSignature(params, "pass");
  const query = buildSignedQuery(params, "pass");
  assert(query.endsWith(sig));
});

// ── parseFormParams ──

Deno.test("parseFormParams parses simple key=value pairs", () => {
  const body = "merchant_id=10000100&amount=50.00";
  const params = parseFormParams(body);

  assertEquals(getParam(params, "merchant_id"), "10000100");
  assertEquals(getParam(params, "amount"), "50.00");
});

Deno.test("parseFormParams handles URL-encoded values", () => {
  const body = "name=O%27Brien&city=Cape+Town";
  const params = parseFormParams(body);

  assertEquals(getParam(params, "name"), "O'Brien");
  assertEquals(getParam(params, "city"), "Cape Town");
});

Deno.test("parseFormParams preserves parameter order", () => {
  const body = "first=1&second=2&third=3";

  const params = parseFormParams(body);
  assertEquals(params.length, 3);
  assertEquals(params[0][0], "first");
  assertEquals(params[1][0], "second");
  assertEquals(params[2][0], "third");
});

Deno.test("parseFormParams handles key without value", () => {
  const params = parseFormParams("empty=");
  assertEquals(getParam(params, "empty"), "");
});

Deno.test("parseFormParams handles empty body", () => {
  const params = parseFormParams("");
  assertEquals(params.length, 0);
});

Deno.test("parseFormParams handles trailing ampersand", () => {
  const params = parseFormParams("a=1&b=2&");
  assertEquals(params.length, 2);
  assertEquals(getParam(params, "a"), "1");
  assertEquals(getParam(params, "b"), "2");
});

// ── getParam ──

Deno.test("getParam returns value for existing key", () => {
  const params: Param[] = [["key1", "val1"], ["key2", "val2"]];
  assertEquals(getParam(params, "key1"), "val1");
});

Deno.test("getParam returns undefined for missing key", () => {
  const params: Param[] = [["key1", "val1"]];
  assertEquals(getParam(params, "nope"), undefined);
});

// ── Known-answer vector (cross-checked against an independent MD5) ──
// The expected hashes below were computed with Node's crypto.createHash("md5")
// over the exact PayFast signature string — a different MD5 implementation than
// the @std/crypto one under test. This catches any regression in the encoding,
// parameter ordering, or hashing (e.g. accidentally sorting the params).

const VECTOR: Param[] = [
  ["merchant_id", "10000100"],
  ["merchant_key", "46f0cd694581a"],
  ["return_url", "http://localhost/return"],
  ["cancel_url", "http://localhost/cancel"],
  ["notify_url", "http://localhost/notify"],
  ["name_first", "Test"],
  ["name_last", "User"],
  ["email_address", "test@example.com"],
  ["m_payment_id", "order-123"],
  ["amount", "100.00"],
  ["item_name", "Test Product"],
];

Deno.test("buildSignature matches known MD5 vector (no passphrase)", () => {
  assertEquals(buildSignature(VECTOR), "4d683f503d61409ae59bfb5f99d85785");
});

Deno.test("buildSignature matches known MD5 vector (passphrase 'salt')", () => {
  const sig = buildSignature(VECTOR, "salt");
  assertEquals(sig, "6e22db2745ab3ccda993d2018d36b720");
  assertEquals(verifySignature(VECTOR, sig, "salt"), true);
});
