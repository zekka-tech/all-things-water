import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  captureReferralFromUrl,
  clearStoredReferral,
  getStoredReferral,
} from "./referral";

beforeEach(() => clearStoredReferral());
afterEach(() => clearStoredReferral());

describe("referral capture", () => {
  it("stores a valid ref code (uppercased)", () => {
    captureReferralFromUrl("?ref=abc123");
    expect(getStoredReferral()).toBe("ABC123");
  });

  it("ignores a missing or malformed ref code", () => {
    captureReferralFromUrl("?foo=bar");
    expect(getStoredReferral()).toBeNull();
    captureReferralFromUrl("?ref=" + "x".repeat(40));
    expect(getStoredReferral()).toBeNull();
  });

  it("clears a stored code", () => {
    captureReferralFromUrl("?ref=keep1");
    clearStoredReferral();
    expect(getStoredReferral()).toBeNull();
  });
});
