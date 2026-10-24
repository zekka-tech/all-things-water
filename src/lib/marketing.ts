/**
 * Consent-gated marketing event layer (the CDP/performance-marketing wedge).
 *
 * Fans a small, typed set of commerce events out to whichever destinations are
 * configured: GA4 (gtag), Meta Pixel (fbq), and an optional first-party CDP
 * webhook. All destinations load their scripts EXTERNALLY (no inline) so the
 * strict CSP (no script-src 'unsafe-inline') holds — the only requirement is
 * that each destination's host is allowlisted in `public/_headers`.
 *
 * Nothing here runs without tracking consent: `initMarketing()` is called from
 * the consent-gated path in `main.tsx`, and every emit re-checks consent.
 */
import { env } from "@/lib/env";
import { hasTrackingConsent } from "@/lib/consent";

export type MarketingEvent =
  | { type: "add_to_cart"; productId: string; name: string; price: number; quantity: number }
  | { type: "begin_checkout"; value: number; items: number }
  | { type: "purchase"; orderRef: string; value: number }
  | { type: "generate_lead"; company?: string }
  | { type: "subscribe"; productId: string; frequency: string };

const CURRENCY = "ZAR";
let initialized = false;

function loadScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  document.head.appendChild(s);
}

function initGa(): void {
  if (!env.gaMeasurementId || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  const gtag: GtagFunction = ((...args: unknown[]) => {
    (window.dataLayer as unknown[]).push(args);
  }) as unknown as GtagFunction;
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", env.gaMeasurementId);
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${env.gaMeasurementId}`);
}

function initMetaPixel(): void {
  if (!env.metaPixelId || window.fbq) return;
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  }) as FbqFunction;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;
  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", env.metaPixelId);
  fbq("track", "PageView");
}

/** Initialise configured destinations. Idempotent; consent-gated. */
export function initMarketing(): void {
  if (initialized || !hasTrackingConsent()) return;
  initGa();
  initMetaPixel();
  initialized = true;
}

function toGa(e: MarketingEvent): { name: string; params: Record<string, unknown> } {
  switch (e.type) {
    case "add_to_cart":
      return {
        name: "add_to_cart",
        params: {
          currency: CURRENCY,
          value: e.price * e.quantity,
          items: [{ item_id: e.productId, item_name: e.name, price: e.price, quantity: e.quantity }],
        },
      };
    case "begin_checkout":
      return { name: "begin_checkout", params: { currency: CURRENCY, value: e.value } };
    case "purchase":
      return {
        name: "purchase",
        params: { currency: CURRENCY, value: e.value, transaction_id: e.orderRef },
      };
    case "generate_lead":
      return { name: "generate_lead", params: { company: e.company } };
    case "subscribe":
      return {
        name: "subscribe",
        params: { item_id: e.productId, frequency: e.frequency },
      };
  }
}

function toMeta(e: MarketingEvent): { name: string; params: Record<string, unknown> } {
  switch (e.type) {
    case "add_to_cart":
      return { name: "AddToCart", params: { currency: CURRENCY, value: e.price * e.quantity } };
    case "begin_checkout":
      return { name: "InitiateCheckout", params: { currency: CURRENCY, value: e.value } };
    case "purchase":
      return { name: "Purchase", params: { currency: CURRENCY, value: e.value } };
    case "generate_lead":
      return { name: "Lead", params: {} };
    case "subscribe":
      return { name: "Subscribe", params: {} };
  }
}

/** Emit one commerce event to every configured destination. No-op without consent. */
export function trackMarketing(event: MarketingEvent): void {
  if (!hasTrackingConsent()) return;
  // Lazily init in case consent was granted after first load.
  if (!initialized) initMarketing();

  try {
    if (window.gtag) {
      const { name, params } = toGa(event);
      window.gtag("event", name, params);
    }
  } catch {
    /* never let analytics break the app */
  }

  try {
    if (window.fbq) {
      const { name, params } = toMeta(event);
      window.fbq("track", name, params);
    }
  } catch {
    /* ignore */
  }

  if (env.cdpEndpoint) {
    try {
      const body = JSON.stringify({ ...event, ts: new Date().toISOString() });
      // sendBeacon survives navigation (e.g. purchase before redirect).
      if (navigator.sendBeacon) {
        navigator.sendBeacon(env.cdpEndpoint, new Blob([body], { type: "application/json" }));
      } else {
        void fetch(env.cdpEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }
}
