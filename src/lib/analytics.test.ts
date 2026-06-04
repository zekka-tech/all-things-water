import { describe, it, expect, vi, beforeEach } from "vitest";

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
    // Reset to a no-op tracker so tests don't leak state
    setTracker(noopTracker);
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
