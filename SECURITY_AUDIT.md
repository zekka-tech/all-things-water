# All Things Water — Security Audit & Code-Quality Review

*Scope: full repository (`all-things-water`) — React storefront, Supabase Edge
Functions, Postgres migrations/RLS, PayFast integration, CI. Conducted as a
high-level production-readiness security sweep. Severity uses CVSS-style bands
(Critical/High/Medium/Low/Info). "Status" reflects state after this hardening
pass.*

---

## 1. Executive summary

The application is **above the median for SA SMB storefronts** on security: it
is typed, tested, RLS-guarded, the payment surface is minimised via PayFast
hosted checkout, and order creation is mediated entirely server-side with the
service role. This pass closed the remaining production gaps — observability,
ITN source verification, CORS lockdown, transport headers, and a dependency
advisory — and documents the residual, lower-risk items with recommendations.

**Overall posture: A− (production-ready once migrations 016–017 are applied).**

> **Update — v2 audit (2026-10).** A second, deeper pass found issues the first
> one missed, including two High-severity ones: the public anon key could call
> `create_order` directly with attacker-chosen prices (R14/R15), and the
> `orders` function trusted an unverified JWT to decide which account an order
> belongs to (R25). It also found the payment token leaking to Google/Meta via
> the cancel URL (R34) and a loyalty bug that paid unlimited referral bonuses
> (R23). All are fixed below (§2, "v2 audit"). No Critical or High findings
> remain open. Database controls are now covered by SQL regression tests run in
> CI (`npm run test:db`).

| Area | Rating | Notes |
| --- | --- | --- |
| Authentication & authorization | A− | Supabase Auth; admin allowlist verified server-side; RLS service-role mediation |
| Payment security | A | Hosted checkout (minimised PCI scope), signed ITN + server validation + amount check + idempotency + **source-IP allowlist** |
| Data protection / RLS | A | RLS on every table, least-privilege grants, function EXECUTE locked down by default, SQL regression tests in CI |
| Transport & headers | A | Strict CSP, **HSTS**, nosniff, frame-ancestors none, COOP, Referrer/Permissions policy |
| Secrets management | A | Server secrets never `VITE_`-exposed; documented split |
| Observability & alerting | B+ | **Structured JSON logs + critical alerting** added; no APM/uptime SLO yet |
| Dependency hygiene | A− | Production deps: 0 vulnerabilities. One unpatched dev-only advisory accepted (R39). Dependabot + gitleaks in CI |
| Input validation | A− | Client + server validation; length caps; SA-format validators |

---

## 2. Findings & remediations

### Resolved in this pass

| # | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| R1 | Medium | **No structured logging or alerting** on order/payment failures — `console.error` only, not queryable or alertable for an order-taking store. | Added `_shared/log.ts` (single-line JSON logs + `alert()` fan-out to Slack/email). Wired into `orders` and `payments-payfast-itn` on every failure path (RPC failure, amount mismatch, signature mismatch, paid-but-update-failed, unhandled exceptions). |
| R2 | Medium | **PayFast ITN lacked source-IP verification** — relied solely on signature + validation callback. | Added `_shared/payfast-ip.ts` CIDR allowlist of PayFast's published ITN ranges; enforced in `payments-payfast-itn` (sandbox/proxy-aware, fail-open when no IP resolvable). Unit-tested. |
| R3 | Medium | **CORS wildcard (`*`)** on Edge Functions. | `ALLOWED_ORIGINS` allowlist in `_shared/cors.ts` with per-request origin reflection; falls back to `*` only when unset (preview/unconfigured). |
| R4 | Low | **Missing transport-hardening headers** (HSTS, COOP). | Added `Strict-Transport-Security` (preload) and `Cross-Origin-Opener-Policy` to `public/_headers`. |
| R5 | Low | **`js-yaml` advisory** (quadratic DoS via merge keys) in the dependency tree. | `npm audit fix` (non-breaking). |

### Resolved in follow-up pass

| # | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| R6 | Low | **`payments-payfast-initiate` keyed by `orderId` only** (was O3). | The `orders` endpoint now returns the order's `checkout_token` to its creator and `payments-payfast-initiate` requires + verifies it (403 on mismatch). |
| R7 | Info | **No bot protection on public forms** (was O5). | Cloudflare Turnstile wired into Contact + Business forms (env-gated) with server-side `siteverify` in `business-quote` (fails closed when `TURNSTILE_SECRET_KEY` is set). |
| R8 | Info | **No automated dependency/secret scanning** (was O6). | `.github/dependabot.yml` (npm + actions, grouped) + a blocking **gitleaks** CI job. |
| R9 | Info | **Migrations not CI-gated** (was O7). | CI `supabase db reset` job applies all migrations from scratch (informational until verified, then a hard gate). |
| R10 | Low (dev-only) | **`esbuild` dev-server advisory** (was O1). | Upgraded to **Vite 8** (Rolldown) — advisory cleared. Also dropped the `@lhci/cli` dep (Lighthouse now runs via the GitHub Action), bringing `npm audit` to **0 vulnerabilities** across all deps. |
| R11 | Low | **CSP `script-src 'unsafe-inline'`** (was O2). | Removed. The only inline script (SW registration) was externalised (`/register-sw.js`) and Vite's inline module-preload polyfill disabled, so the built HTML carries no inline scripts. |
| R12 | Low | **Per-instance in-memory rate limiter** (was O4). | Added a Postgres `check_rate_limit` RPC (migration 011) as an authoritative cross-instance L2 on `orders`, `payments-payfast-initiate`, `business-quote`, and `back-in-stock`; the in-memory limiter remains a cheap L1. Fails open on limiter error. |

### v2 audit (2026-10)

**Database** (migrations `016_security_hardening_v2.sql`, `017_least_privilege_and_loyalty.sql`; tests in `supabase/tests/security.sql`)

| # | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| R14 | **High** | The 16-argument `create_order` overload (migrations 007/008) was never revoked from `PUBLIC`, so anyone holding the public anon key could call `/rest/v1/rpc/create_order` directly. | `EXECUTE` revoked on every `public` function for `public`/`anon`/`authenticated`; default privileges flipped so new functions start locked (R21). Only `get_or_create_loyalty` and `current_user_verified_email` are granted to `authenticated`. |
| R15 | **High** | `create_order` trusted caller-supplied line prices, subtotal and total. | Prices and names now come from `public.products` under row lock; totals are recomputed and a mismatch is rejected. Duplicate lines and non-integer or out-of-range quantities are rejected. |
| R16 | Medium | Subscription orders were priced from `subscriptions.unit_price`, a column the customer could write. | Scheduler prices from the live catalogue. A trigger sets price, name, owner and status on insert. Customers can update only `status`, `auto_pay` and `frequency` (column grants). |
| R17 | Medium | `public.rate_limits` had no RLS; anon could read or delete limiter buckets. | RLS on, client access revoked. |
| R18 | Medium | RLS policies matched guest orders on an *unverified* email, so registering `victim@x` exposed the victim's addresses and phone. Customers could also read `checkout_token`. | `current_user_verified_email()` requires `email_confirmed_at`. Column-level `SELECT` on `orders` excludes `checkout_token`. |
| R19 | Low | Scheduler called `uuid_generate_v4()` with `search_path = public`; on Supabase that extension lives in `extensions`, so the scheduler failed. | Uses built-in `gen_random_uuid()`. |
| R20 | Low | Anon could `INSERT` into `back_in_stock_subscriptions` directly, bypassing validation and rate limiting. | Policy dropped; only the Edge Function (service role) writes. |
| R21 | Low | New functions default to `EXECUTE` for `PUBLIC`. | `ALTER DEFAULT PRIVILEGES` revokes it. |
| R22 | Medium | `anon`/`authenticated` held Supabase's default `ALL` on most tables. RLS blocked row access, but **`TRUNCATE` ignores RLS** (verified: anon's `TRUNCATE products` got past the privilege check and was stopped only by a foreign key). A future permissive policy would also have opened writes on `products`/`admins`. | All table and sequence grants revoked; re-granted exactly what the browser uses (catalogue `SELECT`; own orders/items/loyalty/admin row `SELECT`; subscriptions `SELECT`/`INSERT` + three updatable columns). Default privileges revoked for new tables. |
| R23 | Medium | The referral bonus fired whenever the referred customer had exactly one order *currently* in status `paid`. Orders move on to processing/shipped/delivered, so **every later purchase re-awarded the referrer 100 points**. Referrals could also be attached after a first purchase, or between two accounts referring each other. | Bonus recorded once per account (`referral_bonus_awarded_at`). Referral attachable only before the first purchase, and never as a loop. Historic data backfilled. |
| R24 | Low | Points earned on a paid order were kept after the order was cancelled. | Each order records `loyalty_points_awarded`; cancellation reverses it (floored at zero). |

**Edge Functions and frontend**

| # | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| R25 | **High** | `orders` decoded the caller's JWT with `atob` **without verifying its signature**, so a forged token could attach orders (and loyalty points) to any account. | `_shared/auth.ts` `getVerifiedUser()` asks Supabase Auth to verify the token; `requireAdmin()` shared by all admin functions. |
| R26 | Medium | Transactional emails interpolated product names, customer names and quote fields as raw HTML. | `escapeHtml`/`safeHref` everywhere in `_shared/resend.ts`; tested with hostile input. |
| R27 | Medium | Bodies parsed with unbounded `req.json()`. Rate-limit keys used the whole `X-Forwarded-For` header, so padding it minted unlimited buckets. | `readJson()` with size caps and clean 400/413 errors. `clientIp()` returns one validated token. |
| R28 | Low | Shared secrets and PayFast signatures compared with `===`; cron secrets of any length accepted. | `timingSafeEqual`; `hasSharedSecret` requires 16+ characters. |
| R29 | Low | Outbound calls (PayFast, Resend, Slack, Turnstile) had no timeouts. | `AbortSignal.timeout` on every `fetch`. |
| R30 | Low | Admins could move orders between any statuses (e.g. shipped → processing → shipped, dispatching warehouse stock twice). | Forward-only transitions (`canTransition`) with an optimistic-concurrency update. |
| R31 | Low | `admin-orders` returned each order's `checkout_token`. | Stripped from the response. |
| R32 | Low | Checkout navigated to whatever `redirectUrl` the API returned. | `isPayfastUrl()` allows only `https://{www,sandbox}.payfast.co.za`. |
| R33 | Low | JSON-LD did not escape `<`, so a product field containing `</script>` could break out. | Escaped as `\u003c`. |
| R34 | Medium | PayFast's `cancel_url` carries the order's `checkout_token`. GA4 and Meta Pixel record the full page URL, so **the token reached Google and Meta** for every cancelled payment. (It can cancel the order or restart payment.) | `src/lib/sensitiveParams.ts` moves `token` from the URL into memory at startup, before analytics, pixels or the router run. |
| R35 | Moderate | `react-router` 6.x advisories (GHSA-wrjc-x8rr-h8h6 open redirect, GHSA-337j-9hxr-rhxg SSR). Not exploitable here (no user-controlled navigation, no SSR), but no 6.x fix exists. `postcss-selector-parser` DoS advisory via Tailwind. | Upgraded to React Router 7.18 (`react-router` package). `postcss-selector-parser` forced to 7.1.6 via `overrides`; CSS output verified byte-identical. |
| R36 | Low | Password minimum was 6 characters (Supabase default), and the same login protects admins. | 10 characters with letters and digits (`config.toml` + sign-up form). Hosted settings listed in `PRODUCTION_GO_LIVE.md`. |
| R37 | Low | CI ran Node 20 against `engines: >=22`. The workflow token had default scope. The migration job was non-blocking and ran no security tests. | Node 22, `permissions: contents: read`, blocking `database` job running `npm run test:db`. |
| R38 | Info | Order IDs reached UUID columns unvalidated (database errors instead of clean 400/404). Sentry `setUser` logged user PII to the console. | `isUuid()` in `order-cancel`, `order-status`, `payments-payfast-initiate`, `payments-payfast-itn`. `setUser` is a no-op. |
| R39 | Low (dev-only) | **`braces` ≤3.0.3 stack-exhaustion DoS** (GHSA-vfj7-8cjw-p6xm), pulled in by Tailwind 3's file watcher and glob libraries. No patched release existed. | Removed by upgrading to Tailwind 4, which no longer depends on `braces`. |

### Open / accepted (with mitigations)

| # | Severity | Finding | Recommendation / mitigation |
| --- | --- | --- | --- |
| R13 | Info | **`style-src 'unsafe-inline'`** (was A1). | Hardened via `style-src-elem 'self'` (blocks injected inline `<style>` elements — the built output has none, CSS is external) + `style-src-attr 'unsafe-inline'` (kept for the handful of legitimate runtime `style={{}}` attributes). `style-src 'self' 'unsafe-inline'` remains only as a fallback for browsers without `-elem`/`-attr` support, so there is no regression. No script-execution vector either way. |
| R40 | Low | Subscription postal codes are not checked for deliverability server-side (checkout orders are). | Admin reviews subscription orders before dispatch. Fix: port the `_shared/delivery.ts` zones into `enforce_subscription_integrity()`. |
| R41 | Info | The cancel URL still carries `checkout_token` in browser history (it is removed from the address bar on load). | Low value: the token can only cancel or restart payment for an unpaid order, and it expires with the reservation (30 min). |

**Production dependencies: 0 vulnerabilities.**

---

## 3. Controls verified (positive findings)

- **Order creation is server-only.** `create_order` RPC is `service_role`-only
  (migration 006); anon/authenticated execute revoked; the browser never writes
  orders directly.
- **Payment integrity.** ITN verifies the MD5 signature, performs the
  server-to-server validation callback, checks `amount_gross` against the stored
  total, and is idempotent (`already paid` short-circuit + `mark_order_paid`).
- **Inventory safety.** Stock is reserved within the order transaction and
  pending reservations expire (migration 008), preventing oversell.
- **Admin authz.** `/admin` uses Supabase Auth; the `admins` allowlist is checked
  **server-side** in the Edge Functions — no admin secret ships to the browser.
- **Least-privilege RLS.** Authenticated users can read only their own orders and
  manage only their own subscriptions; `business_quotes` has no anon/authenticated
  policy at all (service-role mediated).
- **Secret hygiene.** Service-role key, PayFast credentials, Resend key, and the
  subscription cron secret are documented as Edge-Function-only and are never
  `VITE_`-prefixed.
- **Secure SDLC.** Strict TypeScript, colocated unit tests, Deno tests for the
  PayFast signature + IP logic, and a CI pipeline gating typecheck/lint/test/
  build/deno/audit.

---

## 4. Privacy & compliance (POPIA, South Africa)

- Privacy policy and cookie-consent are present; analytics are **consent-gated**.
- Data minimisation is reasonable (only fulfilment-necessary PII is collected).
- **Recommendations:** document a data-retention schedule and a DSAR (data
  subject access/deletion) runbook; confirm Resend + Supabase sub-processor
  agreements; add a retention/auto-purge policy for `back_in_stock_subscriptions`
  and `business_quotes` leads.

---

## 5. Prioritised next actions

1. ✅ Bind `payments-payfast-initiate` to `checkout_token` (R6).
2. ✅ Cloudflare Turnstile on public forms (R7).
3. ✅ Dependabot + gitleaks secret scanning in CI (R8).
4. ✅ `supabase db reset` migration-apply gate in CI (R9 — verify, then make blocking).
5. ✅ Vite 8 upgrade — dev-server advisory cleared; `npm audit` 0 vulns (R10).
6. ✅ Shared-store rate limiter (R12).
7. ✅ Strict script CSP — `script-src 'unsafe-inline'` removed (R11).

8. ✅ v2: function/table lockdown, authoritative pricing, verified JWTs, token-leak fix (R14–R38).

**Next:**
- Apply migrations 016–017 in production and mirror the Auth settings in `PRODUCTION_GO_LIVE.md`.
- Enforce MFA for every account in `public.admins`.
- R40 (subscription postal codes).
- Tailwind 4 migration (clears R39); fix the `brand-600` contrast failure found by the axe job.

---

*End of audit.*
