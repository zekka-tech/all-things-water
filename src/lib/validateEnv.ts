const CRITICAL_VARS = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

const WARN_VARS = [
  "VITE_ADMIN_PASSWORD",
  "VITE_SENTRY_DSN",
  "VITE_GA_MEASUREMENT_ID",
  "VITE_WHATSAPP_NUMBER",
  "VITE_COMPANY_PHONE",
] as const;

export function validateEnv(): string[] {
  const warnings: string[] = [];

  for (const key of CRITICAL_VARS) {
    if (!import.meta.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}. Check your .env file.`,
      );
    }
  }

  for (const key of WARN_VARS) {
    if (!import.meta.env[key]) {
      warnings.push(
        `${key} is not set — some features will be disabled or use fallbacks.`,
      );
    }
  }

  if (import.meta.env.VITE_ADMIN_PASSWORD === "atw-admin-2024") {
    warnings.push(
      "VITE_ADMIN_PASSWORD is using the default value — change it in production!",
    );
  }

  return warnings;
}
