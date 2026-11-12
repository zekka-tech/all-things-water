# Production Go-Live Checklist

Use this checklist to configure and deploy the storefront for production. The environment is split between frontend build variables in Cloudflare Pages and backend secrets for Supabase Edge Functions.

## Current status (2026-11-08)

**Readiness review update (2026-11-11):** the observations below are historical.
Follow [DEPLOYMENT_REVIEW.md](DEPLOYMENT_REVIEW.md) for the new migration,
per-environment Vault `project_url`, backend-first rollout and release build
commands. Local validation does not revalidate these hosted-service observations.

Canonical domain is **`https://allthingswater.co.za`** (with `www.` as an alias);
`all-things-water.pages.dev` remains as the Pages origin and a permitted origin.

| Area | State |
| --- | --- |
| Custom domain + TLS | Live — `allthingswater.co.za`, `www.` and the `pages.dev` origin all serve over HTTPS |
| Migrations | 21 of 21 applied, through `021_contact_and_newsletter.sql` |
| Edge Functions | 16 deployed, all ACTIVE (matches `supabase/functions/`) |
| Cloudflare Pages production vars | All 11 `VITE_*` set, `VITE_COMPANY_ADDRESS` included; confirmed baked into the live bundle built from `d7685a6` |
| Cloudflare Pages preview vars | **None set** — preview deployments have no Supabase config, so a PR preview cannot complete a checkout |
| Edge Function secrets | All set |
| Resend | Domain `allthingswater.co.za` verified (eu-west-1), sending enabled, and `RESEND_API_KEY` confirmed working: Resend's request log shows `POST /emails` returning 200 from the Edge Runtime (`ref=csrqtidbliacfhklnbad`), every send `delivered`. `EMAIL_FROM` is unset, so the default `All Things Water <orders@allthingswater.co.za>` applies — valid on this domain |
| Cloudflare Email Routing | Live — enabled, status `ready`, destination verified. A single catch-all rule covers `orders@`/`ops@`/`sales@`/`info@` |
| Turnstile | Live — site key present in the production bundle, `TURNSTILE_SECRET_KEY` set, so `contact`, `newsletter` and `business-quote` fail closed on a bad token |
| Cron | Applied as `019_cron_scheduler.sql`; all 3 jobs active; all 3 Vault secrets present |
| Health | `GET /functions/v1/health` returns `status: ok` |
| PayFast | **Live and accepted by PayFast** — `PAYFAST_SANDBOX=false`. Verified 2026-11-08 by submitting a real order's parameters to `www.payfast.co.za/eng/process`: PayFast answers 200 with its payment page for R 2 965,00 against order `ATW-76367D7547`. That proves the merchant ID and key are valid and the signature matches, so the passphrase agrees with the PayFast dashboard |

**Remaining to go live:** nothing in configuration, and the outbound half of
the payment flow is now proven as far as PayFast's own payment page. What has
never run is everything *after* the customer pays:

1. **The ITN callback.** No payment has completed, so
   `payments-payfast-itn` has never received a real notification. Put one real
   low-value order through and confirm it flips to paid. If the payment succeeds
   but the order stays `pending_payment`, suspect the notify URL: the code sends
   `https://csrqtidbliacfhklnbad.supabase.co/functions/v1/payments-payfast-itn`
   on every transaction, but a PayFast account can be set to accept only a
   whitelisted one, and `PAYFAST_ITN_IP_CHECK` is `true`, so the POST must also
   originate from PayFast's published IP ranges.
2. **The transactional emails.** The Resend key is proven to authenticate and
   deliver, but only SLO alerts have ever been sent through it. The order
   confirmation and the merchant notification have never fired on a real order.

Until a payment completes, the storefront can take money without anyone being
told about it, so treat that single transaction as the real go-live gate.

`SLO_DB_LATENCY_MS` is set to `2000`, raised from the 1000 default on
2026-11-08. Over the preceding 10 days the `db.probe` sample was p50 398 ms,
p95 695 ms, p99 965 ms and max 1761 ms, so a 1000 ms objective breached 9 times
in 1291 probes and sent 10 `[ATW alert] monitor.slo_breach` emails while the
database was never once unreachable. 2000 ms still catches a real degradation
without training the alert mailbox to be ignored.

Unset by choice, each degrading one feature only: `ALERT_SLACK_WEBHOOK_URL`
(alerts still reach the logs and `ALERT_EMAIL`), `EMAIL_FROM`,
`SLO_MAX_STUCK_ORDERS` (default 3 applies),
`VITE_SENTRY_DSN`, and the analytics set `VITE_GA_MEASUREMENT_ID` /
`VITE_META_PIXEL_ID` / `VITE_CDP_ENDPOINT` — note `VITE_ANALYTICS_ENABLED` is
`false`, so a measurement ID alone changes nothing until that is `true` too.

Email posture: the root domain publishes `v=spf1 include:_spf.mx.cloudflare.net -all`
and `DMARC p=reject; adkim=s; aspf=r`. Resend sends over the `send.` subdomain and
signs with a root DKIM selector, so DKIM aligns strictly and SPF aligns in relaxed
mode. The root itself still hard-fails any direct sender, and the `*._domainkey`
null key keeps every selector but `resend` and `cf2024-1` revoked.

## Cloudflare Pages

Project: `all-things-water`  
Dashboard path: `Pages -> all-things-water -> Settings -> Environment variables`

Set these in the `Production` environment for core checkout:

```text
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_SITE_URL=https://allthingswater.co.za
VITE_COMPANY_EMAIL=hello@allthingswater.co.za
VITE_COMPANY_PHONE=+27769641460
VITE_COMPANY_ADDRESS=Your real business address
VITE_WHATSAPP_NUMBER=+27769641460
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

If `VITE_CONTACT_FORM_ENDPOINT` or `VITE_NEWSLETTER_ENDPOINT` are unset, they
default to the configured Supabase project's functions. Without an endpoint or
Supabase configuration, the forms report that submission is unavailable.

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
PUBLIC_SITE_URL=https://allthingswater.co.za
```

**Paste the values, not the brackets.** The `<...>` above marks a placeholder.
On 2026-11-08 all three PayFast credentials were saved with the angle brackets
still wrapped around them, and PayFast rejected the checkout with *"The merchant
id field is required"* — the brackets are part of the stored value and nothing
in the stack strips them. Clear each field completely before typing. To check a
stored secret without reading it back, compare `supabase secrets list` (which
prints a SHA-256 of each value) against the hash of what you expect.

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
MONITOR_CRON_SECRET=<long-random-string>
BACK_IN_STOCK_CRON_SECRET=<long-random-string>
```

- `SALES_EMAIL` — recipient for B2B office-water quote requests (falls back to `MERCHANT_EMAIL`).
- `SUBSCRIPTION_CRON_SECRET` — shared secret required to invoke the `subscriptions-run` scheduler. Invoke it daily (Supabase scheduled function/pg_cron or external cron) with `Authorization: Bearer <secret>`. See `supabase/README.md`.
- `MONITOR_CRON_SECRET` — shared secret for the `monitor` SLO check (invoke every 5–15 min). Point an external uptime monitor at the public `health` endpoint. See `OBSERVABILITY.md`.
- `BACK_IN_STOCK_CRON_SECRET` — shared secret that lets a scheduler invoke `back-in-stock-notify` with `Authorization: Bearer <secret>` (admins can also trigger it while signed in).

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

The move from `all-things-water.pages.dev` to `https://allthingswater.co.za` is done, and both `VITE_SITE_URL` and `PUBLIC_SITE_URL` already point at it. Any future domain change has to update both.

## Deployment Steps

1. Set the Cloudflare Pages production variables.
2. Set the Supabase Edge Function secrets.
3. Configure this environment's Vault `project_url`, then apply database migrations (`supabase db push`) through `20261111064118_deployment_readiness.sql`. Run `npm run test:db` first; it applies every migration to a throwaway database and runs the security and transaction tests.
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
   - `contact`
   - `newsletter`
   - `subscriptions-run`
   - `admin-warehouses`
   - `health`
   - `monitor`

## Continuous integration

CI (`.github/workflows/ci.yml`) gates every push/PR with typecheck, lint, unit
tests, build, Deno checks/tests, a production-dependency audit, and the
database job (`npm run test:db`: every migration applied to a fresh
supabase/postgres container, then `supabase/tests/security.sql`). Secret
scanning (gitleaks) and Playwright e2e + axe are blocking. Lighthouse CWV remains
informational. CI also covers the `staging` and `all-things-water` branches.

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
