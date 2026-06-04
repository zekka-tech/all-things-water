/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_CONTACT_FORM_ENDPOINT?: string;
  readonly VITE_NEWSLETTER_ENDPOINT?: string;
  readonly VITE_WHATSAPP_NUMBER?: string;
  readonly VITE_COMPANY_EMAIL?: string;
  readonly VITE_COMPANY_PHONE?: string;
  readonly VITE_COMPANY_ADDRESS?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}
