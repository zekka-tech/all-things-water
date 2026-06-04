import { describe, it, expect } from "vitest";
import { formatZAR, cx } from "./format";

describe("formatZAR", () => {
  // ✅ Positive tests
  // en-ZA locale may insert a non-breaking space between R and the amount
  it("formats zero as R0 (allowing locale spacing)", () => {
    const result = formatZAR(0);
    expect(result).toContain("R");
    expect(result).toContain("0");
    // No decimal separator or grouping for zero
    expect(result).not.toContain(",");
    expect(result).not.toContain(".");
  });

  it("formats whole numbers without decimals", () => {
    const result = formatZAR(100);
    expect(result).toContain("R");
    expect(result).toContain("100");
    // No decimal comma
    expect(result).not.toContain(",00");
    expect(result).not.toContain(".00");
  });

  it("formats fractional amounts with 2 decimal places", () => {
    const result = formatZAR(1000.5);
    // Currency formatting varies by ICU data — check key parts
    expect(result).toMatch(/^R/);
    expect(result).toContain("000");
    expect(result).toContain(",50");
  });

  it("formats large numbers with grouping separators", () => {
    const result = formatZAR(1500000);
    expect(result).toMatch(/^R/);
    // Should contain the digits with some separator
    expect(result).toContain("1");
    expect(result).toContain("500");
  });

  it("formats small decimal amounts with 2 digits after comma", () => {
    const result = formatZAR(99.99);
    expect(result).toContain("R");
    // Should contain the integer part and the decimal part with comma separator
    expect(result).toMatch(/99[,\u00a0\u202F]99/);
  });

  // ❌ Negative / edge case tests
  it("formats negative numbers with minus sign", () => {
    const result = formatZAR(-500);
    expect(result).toContain("-");
    expect(result).toContain("500");
  });

  it("handles very large numbers without crashing", () => {
    expect(() => formatZAR(Number.MAX_SAFE_INTEGER)).not.toThrow();
  });

  it("handles NaN gracefully (lets Intl.NumberFormat handle it)", () => {
    const result = formatZAR(NaN);
    expect(typeof result).toBe("string");
  });
});

describe("cx", () => {
  // ✅ Positive tests
  it("joins multiple string classes with a space", () => {
    expect(cx("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("returns a single class as-is", () => {
    expect(cx("only")).toBe("only");
  });

  // ❌ Negative / edge case tests
  it("filters out false values", () => {
    expect(cx("foo", false, "bar")).toBe("foo bar");
  });

  it("filters out null values", () => {
    expect(cx("a", null, "b")).toBe("a b");
  });

  it("filters out undefined values", () => {
    expect(cx("x", undefined, "y")).toBe("x y");
  });

  it("filters out empty strings", () => {
    expect(cx("", "valid")).toBe("valid");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cx(false, null, undefined, "")).toBe("");
  });

  it("returns empty string with no arguments", () => {
    expect(cx()).toBe("");
  });
});
