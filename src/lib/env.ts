export const env = {
  analyticsEnabled: import.meta.env.VITE_ANALYTICS_ENABLED === "true",
  contactFormEndpoint:
    import.meta.env.VITE_CONTACT_FORM_ENDPOINT || "",
  newsletterEndpoint:
    import.meta.env.VITE_NEWSLETTER_ENDPOINT || "",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER || "",
  companyEmail:
    import.meta.env.VITE_COMPANY_EMAIL || "info@allthingswater.co.za",
  companyPhone: import.meta.env.VITE_COMPANY_PHONE || "",
  companyAddress: import.meta.env.VITE_COMPANY_ADDRESS || "",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
} as const;
