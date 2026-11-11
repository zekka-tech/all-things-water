import { afterEach, describe, expect, it, vi } from "vitest";
import { apiPost, isPayfastUrl } from "./api";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("apiPost", () => {
  it("times out even after headers arrive when the response body stalls", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => Promise.resolve({
      ok: true,
      json: () => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
    })));
    const pending = apiPost("https://api.example/orders", {});
    const assertion = expect(pending).rejects.toMatchObject({ status: 0, message: "Request timed out. Please try again." });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it("normalizes malformed success responses and preserves API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("not-json"))
      .mockResolvedValueOnce(new Response('{"error":"Out of stock"}', { status: 409 })));
    await expect(apiPost("https://api.example/orders", {})).rejects.toMatchObject({ status: 0 });
    await expect(apiPost("https://api.example/orders", {})).rejects.toMatchObject({ status: 409, message: "Out of stock" });
  });
});

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
