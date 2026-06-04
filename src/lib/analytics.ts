export const ANALYTICS_ENABLED =
  import.meta.env.VITE_ANALYTICS_ENABLED === "true";

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
  activeTracker.trackPageView(path);
}

export function trackEvent(name: string, props?: Record<string, unknown>) {
  activeTracker.trackEvent(name, props);
}
