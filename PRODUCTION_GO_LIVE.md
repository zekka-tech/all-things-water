# Production Go-Live Checklist

Use this checklist to configure and deploy the storefront for production. The environment is split between frontend build variables in Cloudflare Pages and backend secrets for Supabase Edge Functions.

## Cloudflare Pages

Project: `all-things-water`  
Dashboard path: `Pages -> all-things-water -> Settings -> Environment variables`

Set these in the `Production` environment for core checkout:

```text
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_SITE_URL=https://all-things-water.pages.dev
VITE_COMPANY_EMAIL=info@allthingswater.co.za
VITE_COMPANY_PHONE=+27...
VITE_COMPANY_ADDRESS=Your real business address
VITE_WHATSAPP_NUMBER=+27...
```

Optional frontend integrations:

```text
VITE_SENTRY_DSN=<frontend-sentry-dsn>
VITE_ANALYTICS_ENABLED=true
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_CONTACT_FORM_ENDPOINT=https://<your-form-endpoint>
VITE_NEWSLETTER_ENDPOINT=https://<your-newsletter-endpoint>
VITE_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>
```

If `VITE_TURNSTILE_SITE_KEY` is set, set the matching `TURNSTILE_SECRET_KEY` in
the Supabase Edge Function secrets so the `business-quote` function verifies the
challenge server-side (it fails closed on a bad/missing token; if the secret is
unset, verification is skipped).

If `VITE_CONTACT_FORM_ENDPOINT` or `VITE_NEWSLETTER_ENDPOINT` are unset, the site fails gracefully rather than reporting false success.

## Supabase Edge Function Secrets

Dashboard path: `Supabase -> Project Settings -> Edge Functions -> Secrets`

Required for core production checkout:

```text
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PAYFAST_MERCHANT_ID=<live-merchant-id>
PAYFAST_MERCHANT_KEY=<live-merchant-key>
PAYFAST_PASSPHRASE=<live-passphrase>
PAYFAST_SANDBOX=false
PUBLIC_SITE_URL=https://all-things-water.pages.dev
```

Strongly recommended:

```text
RESEND_API_KEY=<your-resend-api-key>
MERCHANT_EMAIL=orders@allthingswater.co.za
```

Without `RESEND_API_KEY` and `MERCHANT_EMAIL`, checkout can still run, but confirmation, merchant notification, and back-in-stock emails will be degraded.

Security & observability hardening (recommended for production):

```text
ALLOWED_ORIGINS=https://allthingswater.co.za,https://all-things-water.pages.dev
PAYFAST_ITN_IP_CHECK=true
ALERT_SLACK_WEBHOOK_URL=<incoming-webhook-for-ops-alerts>
ALERT_EMAIL=ops@allthingswater.co.za
SALES_EMAIL=sales@allthingswater.co.za
SUBSCRIPTION_CRON_SECRET=<long-random-string>
```

- `SALES_EMAIL` — recipient for B2B office-water quote requests (falls back to `MERCHANT_EMAIL`).
- `SUBSCRIPTION_CRON_SECRET` — shared secret required to invoke the `subscriptions-run` scheduler. Invoke it daily (Supabase scheduled function/pg_cron or external cron) with `Authorization: Bearer <secret>`. See `supabase/README.md`.
- `MONITOR_CRON_SECRET` — shared secret for the `monitor` SLO check (invoke every 5–15 min). Point an external uptime monitor at the public `health` endpoint. See `OBSERVABILITY.md`.

- `ALLOWED_ORIGINS` — comma-separated browser origins permitted to call the Edge Functions. If unset, CORS falls back to `*`; set it in production to lock the browser surface to your real domains.
- `PAYFAST_ITN_IP_CHECK` — when not `false`, the ITN endpoint rejects POSTs whose source IP is outside PayFast's published ranges (defense in depth on top of signature + server validation). Set to `false` only if a proxy rewrites the source IP.
- `ALERT_SLACK_WEBHOOK_URL` / `ALERT_EMAIL` — where critical alerts (failed order creation, ITN signature/amount anomalies, payment-confirmed-but-update-failed) are delivered. If unset, alerts still land in structured logs.

## Production Rules

- Never put `SUPABASE_SERVICE_ROLE_KEY`, PayFast credentials, or `RESEND_API_KEY` in any `VITE_` variable.
- `VITE_SITE_URL` and `PUBLIC_SITE_URL` must match the live canonical domain exactly.
- `PAYFAST_SANDBOX` must be `false` in production.
- `ALLOWED_ORIGINS` must be set (otherwise Edge Function CORS answers `*`).
- `SUBSCRIPTION_CRON_SECRET`, `MONITOR_CRON_SECRET` and `BACK_IN_STOCK_CRON_SECRET` must each be at least 16 random characters (shorter values are rejected). Generate with `openssl rand -hex 32`.

### Supabase Auth (dashboard → Authentication)

These are set in `supabase/config.toml` for local dev but must be mirrored by hand in the hosted project:

- **Email confirmations ON.** Guest orders appear in an account only for a *verified* email.
- **Minimum password length 10, letters + digits** (matches the sign-up form).
- **Secure password change ON.**
- **Leaked-password protection ON** (HaveIBeenPwned check; Pro plan).
- **MFA (TOTP) enabled** and used by every account in `public.admins`.

If you move from `all-things-water.pages.dev` to a custom domain such as `https://allthingswater.co.za`, update both `VITE_SITE_URL` and `PUBLIC_SITE_URL`.

## Deployment Steps

1. Set the Cloudflare Pages production variables.
2. Set the Supabase Edge Function secrets.
3. Apply database migrations (`supabase db push`) — through `017_least_privilege_and_loyalty.sql`. Run `npm run test:db` first; it applies every migration to a throwaway database and runs the RLS/privilege tests.
4. Redeploy Cloudflare Pages production.
5. Redeploy the Supabase functions that depend on secrets:
   - `orders`
   - `payments-payfast-initiate`
   - `payments-payfast-itn`
   - `order-cancel`
   - `order-status`
   - `admin-orders`
   - `admin-sync`
   - `back-in-stock`
   - `back-in-stock-notify`
   - `business-quote`
   - `subscriptions-run`
   - `admin-warehouses`
   - `health`
   - `monitor`

## Continuous integration

CI (`.github/workflows/ci.yml`) gates every push/PR with typecheck, lint, unit
tests, build, Deno checks/tests, a production-dependency audit, and the
database job (`npm run test:db`: every migration applied to a fresh
supabase/postgres container, then `supabase/tests/security.sql`). Secret
scanning (gitleaks) is blocking. The Playwright e2e + axe and Lighthouse CWV
jobs run as informational until verified green in your environment (flip
`continue-on-error: false` to make them hard gates). The axe job currently
fails on colour contrast: `brand-600` (#0082cd) on white is 4.13:1 vs the
4.5:1 WCAG AA minimum.

To run the **full PayFast-sandbox funnel** in CI, set repository variable
`RUN_PAYFAST_E2E=true` and add secrets `E2E_SUPABASE_URL` and
`E2E_SUPABASE_ANON_KEY` pointing at a Supabase project that has the Edge
Functions deployed with `PAYFAST_SANDBOX=true`. Locally:

```bash
E2E_PAYFAST=1 VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run e2e
```

## Go-Live Validation

Verify these before announcing production:

- product pages load correctly
- checkout creates an order
- PayFast redirect works
- cancelled payments return to `/checkout/cancel`
- successful payments return to `/checkout/return`
- order confirmation emails send
- merchant notification emails send
- back-in-stock emails send if enabled
