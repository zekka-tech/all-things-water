import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, consent } = vi.hoisted(() => ({
  mockEnv: { gaMeasurementId: "", metaPixelId: "", cdpEndpoint: "" },
  consent: { ok: true },
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/consent", () => ({ hasTrackingConsent: () => consent.ok }));

import { trackMarketing } from "./marketing";

let beacon: ReturnType<typeof vi.fn>;

beforeEach(() => {
  beacon = vi.fn().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  mockEnv.gaMeasurementId = "";
  mockEnv.metaPixelId = "";
  mockEnv.cdpEndpoint = "";
  consent.ok = true;
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { fbq?: unknown }).fbq;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("trackMarketing", () => {
  it("does nothing without tracking consent", () => {
    consent.ok = false;
    mockEnv.cdpEndpoint = "https://cdp.example/collect";
    trackMarketing({ type: "purchase", orderRef: "ATW-1", value: 100 });
    expect(beacon).not.toHaveBeenCalled();
    expect(window.gtag).toBeUndefined();
  });

  it("posts to the CDP endpoint via sendBeacon when configured + consented", () => {
    mockEnv.cdpEndpoint = "https://cdp.example/collect";
    trackMarketing({ type: "purchase", orderRef: "ATW-2", value: 250 });
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe("https://cdp.example/collect");
  });

  it("is a no-op (no throw) when no destinations are configured", () => {
    expect(() =>
      trackMarketing({ type: "add_to_cart", productId: "p1", name: "X", price: 10, quantity: 1 }),
    ).not.toThrow();
    expect(beacon).not.toHaveBeenCalled();
  });
});
