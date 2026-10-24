import { CONTACT_PHONE_E164 } from "./contact";

export const env = {
  analyticsEnabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
  contactFormEndpoint:
    import.meta.env.VITE_CONTACT_FORM_ENDPOINT || "",
  newsletterEndpoint:
    import.meta.env.VITE_NEWSLETTER_ENDPOINT || "",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || CONTACT_PHONE_E164,
  companyEmail:
    import.meta.env.VITE_COMPANY_EMAIL || "info@allthingswater.co.za",
  companyPhone: import.meta.env.VITE_COMPANY_PHONE || CONTACT_PHONE_E164,
  companyAddress: import.meta.env.VITE_COMPANY_ADDRESS || "",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "",
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || "",
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID || "",
  cdpEndpoint: import.meta.env.VITE_CDP_ENDPOINT || "",
} as const;
