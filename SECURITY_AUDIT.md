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
| Dependency hygiene | B+ | Prod deps clean; one dev-server-only advisory tracked |
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

### Open / accepted (with mitigations)

| # | Severity | Finding | Recommendation / mitigation |
| --- | --- | --- | --- |
| O1 | Low (dev-only) | **`esbuild` advisory** via Vite's dev server (`GHSA-67mh-4wv8-2f99`) lets any site POST to the dev server. Affects `npm run dev` only — **not** the production bundle or runtime. | Do not run the dev server on untrusted networks. Fix requires Vite 8 (breaking major); schedule the upgrade. CI gates only on production deps (`npm audit --omit=dev`). |
| O2 | Low | **CSP allows `'unsafe-inline'` for scripts** (GA/GTM requirement on static hosting). | Bounded risk: the app renders no inline user content. Hardening path: nonce/hash-based CSP or self-host analytics; or drop GTM. |
| O3 | Low | **`payments-payfast-initiate` is keyed by `orderId` only** — an actor who guesses/learns a pending order id can regenerate its pay link. No new data is exposed (name/email are already in the order and the payment still settles to the legitimate merchant). | Bind initiation to the order's `checkout_token` (already issued) for defence in depth. |
| O4 | Low | **In-memory rate limiter is per-instance** (Edge Functions are distributed), so limits are best-effort. | Acceptable given signature + validation defences on the money path. For stronger guarantees use a shared store (Supabase table or Upstash Redis). |
| O5 | Info | **No bot/abuse protection** on public forms (contact, newsletter, business quote). | Add Cloudflare Turnstile to public POST forms; the B2B/quote function already rate-limits and length-caps input. |
| O6 | Info | **No automated dependency/secret scanning** beyond `npm audit`. | Enable GitHub Dependabot + secret scanning; add `gitleaks` to CI. |
| O7 | Info | **Migrations are not CI-gated for idempotency.** | Add a `supabase db reset` job in CI to prove migrations apply cleanly from scratch. |

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

1. **(Low)** Bind `payments-payfast-initiate` to `checkout_token` (O3).
2. **(Low)** Add Cloudflare Turnstile to public forms (O5).
3. **(Info)** Enable Dependabot + secret scanning; add `gitleaks` to CI (O6).
4. **(Info)** Add `supabase db reset` migration-apply gate to CI (O7).
5. **(Planned)** Schedule the Vite 8 upgrade to clear the dev-server advisory (O1).

---

*End of audit.*
