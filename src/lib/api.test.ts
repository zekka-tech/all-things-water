import { describe, expect, it } from "vitest";
import { isPayfastUrl } from "./api";

describe("isPayfastUrl", () => {
  it("accepts PayFast live and sandbox checkout URLs", () => {
    expect(isPayfastUrl("https://www.payfast.co.za/eng/process?a=1")).toBe(true);
    expect(isPayfastUrl("https://sandbox.payfast.co.za/eng/process")).toBe(true);
  });

  it("rejects other hosts, schemes and look-alikes", () => {
    for (const url of [
      "http://www.payfast.co.za/eng/process",
      "https://www.payfast.co.za.evil.test/eng/process",
      "https://evil.test/?x=https://www.payfast.co.za",
      "javascript:alert(1)",
      "/relative",
      "",
      null,
    ]) {
      expect(isPayfastUrl(url)).toBe(false);
    }
  });
});
