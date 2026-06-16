import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { validateEnv } from "@/lib/validateEnv";
import { initErrorReporter } from "@/lib/sentry";
import { setTracker } from "@/lib/analytics";
import "./index.css";

// ── Environment validation ──
const warnings = validateEnv();
if (warnings.length > 0) {
  warnings.forEach((w) => console.warn("[Env]", w));
}

// ── Error reporter (Sentry) ──
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  initErrorReporter({
    captureException(error, context) {
      console.error("[Sentry]", error, context);
      try {
        const body = JSON.stringify({
          exception: { values: [{ type: error.name, value: error.message }] },
          ...(context && { extra: context }),
        });
        const match = sentryDsn.match(/https:\/\/(.+)@(.+)\/(\d+)/);
        if (match) {
          const [, key, host, projectId] = match;
          const envelope = `${JSON.stringify({ sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${body}`;
          fetch(`https://${host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`, {
            method: "POST",
            body: envelope,
          }).catch(() => {
            // Silently ignore network errors for error reporting
          });
        }
      } catch {
        // Silently ignore network errors for error reporting
      }
    },
    captureMessage(message, level = "info") {
      console.log(`[Sentry:${level}]`, message);
    },
    setUser(user) {
      if (user) console.log("[Sentry] setUser:", user);
    },
  });
}

// ── Analytics tracker (GA4) ──
const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";
if (analyticsEnabled && gaId) {
  setTracker({
    trackPageView(path) {
      console.log("[GA4] Page view:", path);
      try {
        window.gtag?.("config", gaId, { page_path: path });
      } catch {
        // gtag may not be loaded
      }
    },
    trackEvent(name, props) {
      console.log("[GA4] Event:", name, props);
      try {
        window.gtag?.("event", name, props ?? {});
      } catch {
        // gtag may not be loaded
      }
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <CartProvider>
            <App />
          </CartProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
