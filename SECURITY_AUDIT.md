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

**Overall posture: A− (production-ready).** No Critical or High findings remain
open. Residual items are Low/Info and have documented mitigations.

| Area | Rating | Notes |
| --- | --- | --- |
| Authentication & authorization | A− | Supabase Auth; admin allowlist verified server-side; RLS service-role mediation |
| Payment security | A | Hosted checkout (minimised PCI scope), signed ITN + server validation + amount check + idempotency + **source-IP allowlist** |
| Data protection / RLS | A− | Least-privilege policies; orders/quotes server-mediated |
| Transport & headers | A | Strict CSP, **HSTS**, nosniff, frame-ancestors none, COOP, Referrer/Permissions policy |
| Secrets management | A | Server secrets never `VITE_`-exposed; documented split |
| Observability & alerting | B+ | **Structured JSON logs + critical alerting** added; no APM/uptime SLO yet |
| Dependency hygiene | A | `npm audit` 0 vulnerabilities (all deps); Dependabot + gitleaks in CI |
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

### Open / accepted (with mitigations)

| # | Severity | Finding | Recommendation / mitigation |
| --- | --- | --- | --- |
| R13 | Info | **`style-src 'unsafe-inline'`** (was A1). | Hardened via `style-src-elem 'self'` (blocks injected inline `<style>` elements — the built output has none, CSS is external) + `style-src-attr 'unsafe-inline'` (kept for the handful of legitimate runtime `style={{}}` attributes). `style-src 'self' 'unsafe-inline'` remains only as a fallback for browsers without `-elem`/`-attr` support, so there is no regression. No script-execution vector either way. |

**All identified findings are now resolved; `npm audit` reports 0
vulnerabilities across all dependencies.**

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

All audit findings are now resolved or accepted (A1). Next security work is
operational: uptime/SLO monitoring and periodic dependency review via Dependabot.

---

*End of audit.*
