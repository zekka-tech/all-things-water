import { describe, it, expect, vi, beforeEach } from "vitest";

const consent = vi.hoisted(() => ({ accepted: true }));
vi.mock("@/lib/consent", () => ({ hasTrackingConsent: () => consent.accepted }));
vi.mock("@/lib/env", () => ({ env: { analyticsEnabled: true } }));

// We test the analytics module. Since ANALYTICS_ENABLED is set at
// import time based on import.meta.env, we test the public API by
// injecting custom trackers via setTracker — this side-steps env
// variability and gives us deterministic tests.

import {
  setTracker,
  trackPageView,
  trackEvent,
} from "./analytics";

const noopTracker = {
  trackPageView: vi.fn(),
  trackEvent: vi.fn(),
};


describe("analytics", () => {
  beforeEach(() => {
    consent.accepted = true;
    // Reset to a no-op tracker so tests don't leak state
    setTracker(noopTracker);
  });
  it("stops an already-initialized tracker after consent is withdrawn", () => {
    const tracker = { trackPageView: vi.fn(), trackEvent: vi.fn() };
    setTracker(tracker);
    consent.accepted = false;
    trackPageView("/account");
    trackEvent("purchase");
    expect(tracker.trackPageView).not.toHaveBeenCalled();
    expect(tracker.trackEvent).not.toHaveBeenCalled();
  });
  it("trackPageView delegates to the active tracker", () => {
    // Arrange
    const mock = { trackPageView: vi.fn(), trackEvent: vi.fn() };
    setTracker(mock);

    // Act
    trackPageView("/shop");

    // Assert
    expect(mock.trackPageView).toHaveBeenCalledOnce();
    expect(mock.trackPageView).toHaveBeenCalledWith("/shop");
  });

  it("trackEvent delegates to the active tracker with name and props", () => {
    // Arrange
    const mock = { trackPageView: vi.fn(), trackEvent: vi.fn() };
    setTracker(mock);

    // Act
    trackEvent("add_to_cart", { product: "atw-001" });

    // Assert
    expect(mock.trackEvent).toHaveBeenCalledOnce();
    expect(mock.trackEvent).toHaveBeenCalledWith("add_to_cart", {
      product: "atw-001",
    });
  });

  it("trackEvent delegates to the active tracker with no props", () => {
    // Arrange
    const mock = { trackPageView: vi.fn(), trackEvent: vi.fn() };
    setTracker(mock);

    // Act
    trackEvent("page_viewed");

    // Assert
    expect(mock.trackEvent).toHaveBeenCalledOnce();
    expect(mock.trackEvent).toHaveBeenCalledWith("page_viewed", undefined);
  });

  it("setTracker replaces the active tracker", () => {
    // Arrange
    const tracker1 = { trackPageView: vi.fn(), trackEvent: vi.fn() };
    const tracker2 = { trackPageView: vi.fn(), trackEvent: vi.fn() };

    setTracker(tracker1);
    trackPageView("/first");

    // Act
    setTracker(tracker2);
    trackPageView("/second");

    // Assert
    expect(tracker1.trackPageView).toHaveBeenCalledWith("/first");
    expect(tracker2.trackPageView).toHaveBeenCalledWith("/second");
    expect(tracker1.trackPageView).toHaveBeenCalledTimes(1);
    expect(tracker2.trackPageView).toHaveBeenCalledTimes(1);
  });
});
