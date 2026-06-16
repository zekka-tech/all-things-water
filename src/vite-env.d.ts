/// <reference types="vite/client" />

interface GtagFunction {
  (command: "config", target: string, params?: Record<string, unknown>): void;
  (command: "event", action: string, params?: Record<string, unknown>): void;
  (command: "js", date: Date): void;
  (command: "set", params: Record<string, unknown>): void;
}

interface Window {
  gtag?: GtagFunction;
  dataLayer?: unknown[];
}

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_CONTACT_FORM_ENDPOINT?: string;
  readonly VITE_NEWSLETTER_ENDPOINT?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_COMPANY_EMAIL?: string;
  readonly VITE_COMPANY_PHONE?: string;
  readonly VITE_COMPANY_ADDRESS?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ADMIN_PASSWORD?: string;
}
