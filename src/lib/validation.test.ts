import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateRequired,
} from "./validation";

describe("validateEmail", () => {
  // ✅ Positive tests
  it("accepts standard email format", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(validateEmail("user@mail.example.co.za")).toBe(true);
  });

  it("accepts email with plus sign in local part", () => {
    expect(validateEmail("user+tag@example.com")).toBe(true);
  });

  it("accepts email with numbers", () => {
    expect(validateEmail("user123@domain.io")).toBe(true);
  });

  // ❌ Negative tests
  it("rejects email without @ symbol", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects email without domain part", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects email without TLD", () => {
    expect(validateEmail("user@domain")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("rejects email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
  });

  it("rejects email with only whitespace", () => {
    expect(validateEmail("   ")).toBe(false);
  });

  it("rejects email with double @ symbols", () => {
    expect(validateEmail("user@@example.com")).toBe(false);
  });
});

describe("validatePhone", () => {
  // ✅ Positive tests
  it("accepts standard SA mobile format (10 digits starting with 0)", () => {
    expect(validatePhone("0821234567")).toBe("0821234567");
  });

  it("accepts SA phone with spaces and dashes", () => {
    expect(validatePhone("082 123-4567")).toBe("0821234567");
  });

  it("accepts SA landline starting with 0", () => {
    expect(validatePhone("0111234567")).toBe("0111234567");
  });

  it("accepts international SA format (27XXXXXXXXX) and converts to local", () => {
    expect(validatePhone("27821234567")).toBe("0821234567");
  });

  it("accepts international SA format with + prefix (stripping non-digits)", () => {
    // +2782... strips to 2782... (11 digits starting with 27)
    expect(validatePhone("+27821234567")).toBe("0821234567");
  });

  // ❌ Negative tests
  it("returns null for too-short number", () => {
    expect(validatePhone("082123")).toBeNull();
  });

  it("returns null for too-long number", () => {
    expect(validatePhone("082123456789")).toBeNull();
  });

  it("returns null for number not starting with 0 or 27", () => {
    expect(validatePhone("1234567890")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(validatePhone("")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(validatePhone("abc")).toBeNull();
  });

  it("returns null for 10 digits starting with something other than 0", () => {
    // 10 digits but starts with 1, not 0 or 27
    expect(validatePhone("1123456789")).toBeNull();
  });
});

describe("validatePostalCode", () => {
  // ✅ Positive tests
  it("accepts valid 4-digit postal code", () => {
    expect(validatePostalCode("1234")).toBe(true);
  });

  it("accepts postal code with leading zeros", () => {
    expect(validatePostalCode("0083")).toBe(true);
  });

  // ❌ Negative tests
  it("rejects 3-digit postal code", () => {
    expect(validatePostalCode("123")).toBe(false);
  });

  it("rejects 5-digit postal code", () => {
    expect(validatePostalCode("12345")).toBe(false);
  });

  it("rejects postal code with letters", () => {
    expect(validatePostalCode("12AB")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePostalCode("")).toBe(false);
  });

  it("rejects postal code with spaces", () => {
    expect(validatePostalCode("12 34")).toBe(false);
  });
});

describe("validateRequired", () => {
  // ✅ Positive tests
  it("returns true for non-empty string", () => {
    expect(validateRequired("Hello")).toBe(true);
  });

  it("returns true for string with leading/trailing spaces", () => {
    expect(validateRequired("  Hello  ")).toBe(true);
  });

  it("returns true for single character", () => {
    expect(validateRequired("x")).toBe(true);
  });

  // ❌ Negative tests
  it("returns false for empty string", () => {
    expect(validateRequired("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(validateRequired("   ")).toBe(false);
  });

  it("returns false for newline/tab-only string", () => {
    expect(validateRequired("\t\n")).toBe(false);
  });
});
