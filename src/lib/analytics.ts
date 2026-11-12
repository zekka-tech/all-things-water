import { env } from "@/lib/env";
import { hasTrackingConsent } from "@/lib/consent";

export const ANALYTICS_ENABLED = env.analyticsEnabled;

interface AnalyticsTracker {
  trackPageView(path: string): void;
  trackEvent(name: string, props?: Record<string, unknown>): void;
}

const consoleTracker: AnalyticsTracker = {
  trackPageView(path) {
    if (!ANALYTICS_ENABLED) return;
    console.log("[Analytics] Page view:", path);
  },
  trackEvent(name, props) {
    if (!ANALYTICS_ENABLED) return;
    console.log("[Analytics] Event:", name, props ?? {});
  },
};

let activeTracker: AnalyticsTracker = consoleTracker;

export function setTracker(tracker: AnalyticsTracker) {
  activeTracker = tracker;
}

export function trackPageView(path: string) {
  if (!ANALYTICS_ENABLED || !hasTrackingConsent()) return;
  activeTracker.trackPageView(path);
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!ANALYTICS_ENABLED || !hasTrackingConsent()) return;
  activeTracker.trackEvent(name, props);
}
