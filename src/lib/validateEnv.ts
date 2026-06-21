const WARN_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SENTRY_DSN",
  "VITE_GA_MEASUREMENT_ID",
  "VITE_WHATSAPP_NUMBER",
  "VITE_COMPANY_PHONE",
] as const;

export function validateEnv(): string[] {
  const warnings: string[] = [];

  for (const key of WARN_VARS) {
    if (!import.meta.env[key]) {
      warnings.push(
        `${key} is not set — some features will be disabled or use fallbacks.`,
      );
    }
  }

  return warnings;
}
