import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { buildApiSignature } from "./payfast-api.ts";

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
