import { loadEnv } from "vite";

const mode = process.argv[2];
if (!["staging", "production"].includes(mode)) {
  throw new Error("Use staging or production.");
}
const env = loadEnv(mode, process.cwd(), "VITE_");
const errors = [];
const origin = (key) => {
  try {
    const url = new URL(env[key]);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash
    ) throw new Error();
    return url.origin;
  } catch {
    errors.push(
      `${key} must be an HTTPS origin without credentials, path, query or fragment.`,
    );
    return null;
  }
};
const backend = origin("VITE_SUPABASE_URL");
origin("VITE_SITE_URL");
const key = env.VITE_SUPABASE_ANON_KEY ?? "";
try {
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1] ?? "", "base64url").toString(),
    );
    if (payload.role !== "anon" || key.split(".").length !== 3) {
      throw new Error();
    }
  }
} catch {
  errors.push(
    "VITE_SUPABASE_ANON_KEY must be a public anon JWT or publishable key.",
  );
}
for (const name of Object.keys(env)) {
  if (
    /SERVICE_ROLE|SECRET|PASSPHRASE|MERCHANT_KEY|RESEND_API_KEY|CRON_SECRET/i
      .test(name)
  ) {
    errors.push(
      `${name} is server-only and must not be exposed through VITE_.`,
    );
  }
}
for (const name of ["VITE_CONTACT_FORM_ENDPOINT", "VITE_NEWSLETTER_ENDPOINT"]) {
  if (!env[name]) continue;
  try {
    if (new URL(env[name]).origin !== backend) throw new Error();
  } catch {
    errors.push(`${name} must point to this environment's Supabase project.`);
  }
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `${mode} frontend configuration is valid. Backend secrets and payment mode require separate verification.`,
  );
}
