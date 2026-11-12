import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { buildApiSignature, chargeAdhoc } from "./payfast-api.ts";

Deno.test("ad-hoc charges require an explicit success and payment id; unknown outcomes stay unresolved", async () => {
  const originalFetch = globalThis.fetch;
  const config = { merchantId: "10000100", passphrase: "test", sandbox: true };
  try {
    for (const [body, paid, uncertain] of [
      ['{"status":"success","data":{"response":true,"pf_payment_id":"12345"}}', true, false],
      ['{"status":"failed","data":{"response":4}}', false, false],
      ['{"status":"success","data":{"response":false}}', false, true],
      ["<html>proxy error</html>", false, true],
      ["{}", false, true],
      ["null", false, true],
    ] as const) {
      globalThis.fetch = () => Promise.resolve(new Response(body));
      const result = await chargeAdhoc("test-token", 100, "Order", "order-id", config);
      assertEquals(result.ok, paid);
      assertEquals(result.uncertain, uncertain);
    }
    globalThis.fetch = () => Promise.reject(new Error("connection lost after sending"));
    const result = await chargeAdhoc("test-token", 100, "Order", "order-id", config);
    assertEquals(result.ok, false);
    assertEquals(result.uncertain, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("buildApiSignature is deterministic", () => {
  const a = buildApiSignature({ "merchant-id": "10000", amount: "1000" }, "pass");
  const b = buildApiSignature({ "merchant-id": "10000", amount: "1000" }, "pass");
  assertEquals(a, b);
});

Deno.test("buildApiSignature sorts fields alphabetically (insertion order independent)", () => {
  const a = buildApiSignature({ b: "2", a: "1", c: "3" });
  const b = buildApiSignature({ c: "3", a: "1", b: "2" });
  assertEquals(a, b);
});

Deno.test("buildApiSignature includes the passphrase in the hash", () => {
  const withPass = buildApiSignature({ amount: "1000" }, "secret");
  const without = buildApiSignature({ amount: "1000" });
  assertNotEquals(withPass, without);
});

Deno.test("buildApiSignature encodes values (space vs plus differ)", () => {
  const space = buildApiSignature({ item_name: "a b" });
  const plus = buildApiSignature({ item_name: "a+b" });
  assertNotEquals(space, plus);
});

Deno.test("buildApiSignature changes with amount", () => {
  const a = buildApiSignature({ "merchant-id": "10000", amount: "1000" }, "p");
  const b = buildApiSignature({ "merchant-id": "10000", amount: "2000" }, "p");
  assertNotEquals(a, b);
});
