# All Things Water — CTO Advisor Assessment & Investment Case

*Prepared: June 2026 · Scope: storefront repo (`all-things-water` branch) + South African
/ African market context · Status: post production-readiness hardening + P0/P1 customer features (commits `eb39954`, `6d62bbb`)*

This document is a senior engineering + commercial review. It is written for the founder
and for prospective investors. It is deliberately honest about both strengths and gaps:
the goal is a defensible production deployment and a fundable, differentiated business —
not a marketing brochure.

---

## 1. Executive summary

**All Things Water (ATW)** is a direct-to-consumer e-commerce storefront selling bottled
water, dispensers/chillers, water filters and accessories, delivered across South Africa.
The product is a real, operating single-tenant PWA storefront (React 18 + Vite + Supabase
+ PayFast) that has just been hardened to production-grade security and reliability.

**Commercial thesis:** South Africa’s municipal water reliability is structurally poor
(Blue Drop 2023/24 outcomes), middle-to-upper income households and SMEs already buy
bottled water and office dispensers, and grocery/etail friction (Takealot, Makro, Pick n
Pay aspac) is poor at the *replenishment* and *bundled hardware + consumables* motion.
There is a real, addressable niche for a specialist water merchant with a fast, mobile-first
storefront, subscription/repeat logic, and Johannesburg/Pretoria-centric same-/next-day
delivery.

**Verdict:** A solid, production-ready foundation with a **thin** commercial moat today. The
build is genuinely above the median for SA SMB storefronts (typed, tested, RLS-guarded,
CSP-hardened, PayFast-integrated). The go-to-market and repeat-purchase engine — not the
code — is the binding constraint on valuation. Fundable at pre-seed/angel if GTM and unit
economics are concrete; not yet a Series-A case.

---

## 2. Product & capability review

### 2.1 What the storefront actually does (verified in repo)

| Capability | Status | Evidence |
| --- | --- | --- |
| Catalog with search, category filter (URL-synced), sort | ✅ | `src/pages/Shop.tsx`, `src/data/products.ts` |
| Persistent, stock-aware cart (clamp to stock) | ✅ | `src/context/CartContext.tsx` + tests |
| Multi-section checkout + validation (env-validated) | ✅ | `src/pages/Checkout.tsx`, `src/lib/validation.ts` |
| Server-side order creation via Edge Function + `create_order` RPC | ✅ | `supabase/functions/orders/index.ts` |
| PayFast hosted checkout (sandbox + prod), signed query, ITN endpoint | ✅ | `payments-payfast-initiate/`, `payments-payfast-itn/` |
| Recoverable checkout: cart preserved until payment confirmation | ✅ (this phase) | `src/pages/CheckoutReturn.tsx` |
| Admin: auth-gated products, stock, orders, audit log | ✅ | `src/pages/Admin.tsx`, `004_admin_audit.sql` |
| SEO: per-route canonical, JSON-LD, sitemap, robots | ✅ (this phase) | `src/components/Seo.tsx`, `scripts/generate-sitemap.ts`, `public/sitemap.xml` |
| Consent-aware analytics + Sentry | ✅ (this phase) | `src/lib/consent.ts`, `src/main.tsx` |
| PWA (manifest, installable) | ✅ | `public/manifest.webmanifest` |
| Dark mode, responsive, a11y focus | ✅ | `ThemeContext`, components |

### 2.2 Notable production-readiness fixes landed in this phase

- **RLS hardening:** `create_order` RPC is now `service_role`-only; public/anon/authenticated
  execute revoked; `admin_audit_log` restricted to service role; anon order-visibility RLS
  policy removed so orders are mediated server-side only (`006_security_hardening.sql`).
- **CSP tightened** to match the real payment + analytics surface (PayFast sandbox/prod,
  GA/GTM, Sentry, Supabase); stale font policy removed (`public/_headers`).
- **SPA routing fallback** for Cloudflare Pages (`public/_redirects`).
- **Sitemap generation** decoupled from browser asset imports (`src/data/productCatalog.ts`),
  so it runs in plain `tsx` without Vite aliases.
- **Test suite stabilized** under a single-threaded pool; flaky form tests rewritten to
  deterministic events; CI-safe timeouts (`vitest.config.ts`).

### 2.3 Capability gaps (honest, prioritised)

| Gap | Impact | Priority | Status |
| --- | --- | --- | --- |
| **Recurring/subscription orders** | Bottled water + filters are inherently replenishment purchases | **P0 for retention** | Schema ready (`subscriptions` table in migration 007); subscription-creation UI + scheduler pending |
| **Customer accounts / order history** | Logged-out-only purchase caps LTV | **P0** | ✅ **Implemented** — Supabase Auth account page with real order history |
| **Lifecycle email** | No order shipping/delivery email to customers | **P0** | ✅ **Implemented** — shipping + delivery templates via Resend, admin-triggered |
| **Reviews/ratings on PDPs** | Reviews exist in data model but the storefront PDP review widget was broken | P1 | ✅ **Fixed** (prior phase) |
| **Delivery-area + scheduling self-service** | No date/time slot selection | P1 | ✅ **Implemented** — delivery window picker in checkout |
| **Back-in-stock notifications** | No way to capture demand for sold-out SKUs | P1 | ✅ **Implemented** — table + edge fn + PDP widget |
| **Admin order management with real orders** | Admin used mock data only | P0 | ✅ **Implemented** — real order fetch + status updates + lifecycle email triggers |
| **Loyalty / referral** | No program; LTV tooling absent | P2 | Pending |
| **Inventory multi-warehouse** | Single stock count; no branch-level allocation | P2 | Pending |
| **Marketing stack confirmed** | Analytics is consent-gated and generic GA/GTM; no CDP/klaviyo email lifecycle | P1 | Lifecycle email ✅; marketing CDP pending |

---

## 3. Technical build quality & production readiness

### 3.1 Grades

| Dimension | Grade | Notes |
| --- | --- | --- |
| Code quality / typing | **B+** | TS strict, colocated tests, `@/` alias; some `any` leakage in edge function bodies |
| Test coverage | **B** | Cart, theme, validation, admin-auth, env, format, analytics, components. No e2e (Playwright) yet. |
| Security posture | **A−** (post-hardening) | RLS, service-role mediation, CSP, nosniff, frame-ancestors none, rate-limit on order/payfast endpoints |
| Reliability / observability | **B−** | Sentry consent-gated; no structured edge-function logging/alerting beyond `console.error`; no uptime/SLA SLOs |
| Deployment | **B+** | Cloudflare Pages + Supabase; reproducible `npm run build`; sitemap generated |
| Performance | **B** | Code-split vendor/Admin chunks, lazy images; no Lighthouse/Core Web Vitals budget enforced in CI |
| Accessibility | **B** | Semantic markup, focus states; needs a formal a11y audit (axe) in CI |
| Payment integration | **A−** | PayFast signed query, ITN endpoint, hosted checkout (PCI scope minimised) |
| Documentation | **B** | README + DO_NOT_MERGE; no runbook, no env matrix documented in repo |

### 3.2 Residual risks (production)

1. **Edge-function observability.** `console.error` to stdout is not enough for an order-
   taking store. Add structured JSON logging + an alert channel (Resend/Slack) for failed
   order creation and PayFast ITN failures.
2. **No e2e test for the purchase funnel.** A single Playwright journey
   (browse → add → checkout → PayFast sandbox → return) would catch regressions the unit
   suite cannot.
3. **Supabase migration hygiene.** Migrations are authored but there is no CI gate proving
   they are idempotent / apply cleanly. Add a `supabase db reset` step in CI.
4. **Core Web Vitals budget.** The Admin chunk is 215 kB (gzip 57 kB); a per-route budget in
   CI would prevent regressions on storefront entry.
5. **Secrets posture.** Ensure service-role key, PayFast passphrase, and Resend key live
   only in Supabase Edge Function secrets — never in `VITE_`-prefixed browser env.

---

## 4. Market context — South Africa & Africa

### 4.1 Demand drivers (why water, why now)

- **Municipal water reliability is a persistent structural risk.** The Department of Water
  and Sanitation’s *Blue Drop* programme reports continue to show a large fraction of
  municipal water systems failing compliance, driving sustained at-home/office demand for
  bottled water and dispensers. Load-shedding compounds this (pumps fail → taps run dry).
- **Urban middle/SME base.** Gauteng (Johannesburg/Pretoria) and the Western Cape have dense
  concentrations of households and SMEs already accustomed to buying 18.9 L dispenser bottles
  and countertop/floorstanding coolers.
- **E-commerce penetration is maturing.** Takealot and Makro have normalised online household
  goods purchasing; PayFast, Paystack, and Yoco have made card acceptance trivial. The friction
   is no longer payment — it is *specialist assortment + replenishment + service*.

### 4.2 Competitive landscape (South Africa)

| Competitor | Position | Strength | Where ATW should win |
| --- | --- | --- | --- |
| **Aquazania** | Established bottled-water + dispenser brand (national) | Brand trust, recurring office delivery, long-standing routes | Faster digital checkout, transparent pricing, subscription, mobile-first |
| **Aquelle** | Bottled water + coolers (retail + delivery) | Retail distribution, brand awareness | Direct-to-home UX, fewer cold calls, live delivery-area self-service |
| **Oasis Water** | Bottled water + water-vending | Footprint, price point | Premium/curated assortment, recurring delivery, filters category |
| **Valpré / Aqua Vita / local producers** | Bottled water (FMCG) | Grocery-channel distribution | DTC convenience, subscription bundling hardware+consumables |
| **Takealot / Makro / Pick n Pay aspac** | Generalist marketplace | Reach, logistics, trust | Specialist assortment, recurring, real product knowledge, servoce |
| **JoJo Tanks (rainwater/storage)** | Adjacent hardware/water storage | Hardware brand | Out of ATW’s core; not a direct competitor |

**Moat assessment:** Today the moat is **thin** — no proprietary supply, no exclusive brand,
no switching cost (guest checkout only). Defensible moats to *build*:

1. **Replenishment flywheel:** subscription + standing orders for 18.9 L bottles and
   cartridge filters (a true recurring, predictable-revenue engine that generalist
   marketplaces under-serve).
2. **Local-delivery UX:** same-/next-day windows in Gauteng with transparent, self-serve
   scheduling — service level Aquazania-type incumbents don’t match digitally.
3. **Bundled expertise:** curated dispenser + filter + bottle bundles with guidance,
   reviewed by category — the “specialist water merchant” positioning.
4. **LTV data:** once accounts exist, predictive “you’ll need filters in 6 weeks”
   notification becomes a defensible retention loop.

### 4.3 Broader Africa

Cross-border expansion (e.g. into Namibia, Botswana, Kenya, Nigeria) is **not** a near-term
play unless supply chain and cold-chain logistics are solved. The realistic path: dominate
Gauteng + Western Cape first, then evaluate a single selected neighbouring market only after
the repeat-purchase engine is proven. Do not pitch pan-Africa ambition as the investment
thesis; it dilutes credibility.

---

## 5. SWOT

**Strengths**
- Production-grade, hardened stack today (security, RLS, CSP, PayFast, consent).
- Fast, mobile-first, installable PWA — materially better UX than most incumbent SA water
  merchant sites (WordPress/WooCommerce sprawl).
- Typed + tested codebase — cheap to iterate and hand over.

**Weaknesses**
- No accounts, subscriptions, or loyalty — LTV engine missing.
- Thin commercial moat; replicable by any competent operator with capital.
- Logistics/fleet not represented in the product; delivery-area logic is basic.
- Single-tenant; no multi-tenant/SaaS angle (and none should be pursued).

**Opportunities**
- Subscription/recurring revenue for bottles + filters (high-margin, predictable).
- Gauteng same-/next-day as a positioning wedge vs. incumbents.
- Corporate office-water contracts (B2B) with invoicing — currently only guest checkout.
- Bundled hardware + consumables + filter-change reminders.

**Threats**
- Aquazania/Auelle verticalising their digital offering if ATW gains share.
- Takealot/Makro undercutting on price and bundling water into grocery baskets.
- Input cost shocks (premium imported brands, bottle deposit logistics).
- Water regulator / health-permit overhead on branded bottled water supply.

---

## 6. Advertising & go-to-market plan to acquire users

A specialist water merchant should win on **intent capture + replenishment**, not on brand
awareness spend. Recommended sequencing, smallest first:

### Phase 1 — Intent & local (weeks 0–6)
- **Google Search (brand + category + location):** “bottled water delivery Johannesburg”,
  “water dispenser buy Pretoria”, “water filter replacement cartridge”. Geo-targeted to
  Gauteng + WC. This is the single highest-ROI channel for a specialist merchant.
- **Google Shopping feed** for the ~30 highest-margin SKUs (dispensers, filters, bottle
  consumables). Enforce ZAR, stock-aware, and delivery-area eligibility signage.
- **Local SEO:** product + category pages already canonicalised via `Seo.tsx`; build out one
  landing page per metro (Johannesburg, Pretoria, Cape Town, Durban) using the same
  taxonomy. Schema via `JsonLd.tsx` already supports retailer/product structured data.

### Phase 2 — Retention machinery (weeks 4–10) *(requires P0 build)*
- **Customer accounts + standing orders / subscriptions.** A user signs up once and gets
  “bottle swap every 2 weeks” and “filter change every 6 months” by default.
- **Lifecycle email (Resend):** order confirmation, delivery window, 30-day filter reminder,
  90-day re-order nudge. Triggered from order events.

### Phase 3 — Performance expansion (weeks 8–16)
- **Meta + TikTok** performance creative with *water-outage/maintenance hooks* (load-shedding
  water-shedding) — locally relevant, high CTR. Run only in confirmed delivery zones.
- **Retargeting** of cart abandoners (cart is already persistent) — needs the accounts work
  for identity resolution, otherwise rely on pixel + consent.
- **Influencer / micro-creator** in health, home, and family niches in Gauteng — barter +
  affiliate first; pay only after CPA baseline exists.

### Phase 4 — B2B / office water (weeks 10–20)
- Outbound to SME offices for dispenser + cooler contracts with invoicing. This is the
  highest-LTV segment and the one Aquazania dominates on relationship; ATW’s wedge is a
  self-service sign-up + transparent SLA, then upsell bottled delivery.

### KPIs to govern spend
- **CPA < R150** for first-order (Phase 1 target).
- **Repeat-purchase rate ≥ 35% within 90 days** (the metric that justifies the moat thesis).
- **Contribution margin per order** after delivery, excluding ad cost ≥ 25%.
- **Cart abandonment recovered rate ≥ 12%.**

---

## 7. Investment case

### 7.1 The bet
ATW is an investment in a **specialist, replenishment-driven DTC water merchant** in a market
where (a) demand is structurally protected by poor municipal water reliability, (b) digital
execution among incumbents is weak, and (c) generalist marketplaces don’t own the recurring
hardware+consumables relationship. The codebase is already production-ready; capital should
buy GTM velocity and the subscription engine, not rebuild the platform.

### 7.2 What the money should do
1. Build accounts + subscription (P0) — the LTV engine. (#1 use of funds.)
2. Phase-1 paid acquisition (search + shopping) with hard CPA discipline.
3. One delivery vehicle + driver in Gauteng to own same-day SLA (the differentiating
   capability that incumbents don’t digitise).
4. Lifecycle/resend + a fractional growth marketer.

### 7.3 What this is *not*
- Not a SaaS platform play; do not pivot to multi-tenant.
- Not a pan-Africa play in this round; geographic expansion is a Series-A topic.
- Not a beverage brand play; ATW is a *merchant*, not a bottler (avoids regulatory + capex).

### 7.4 Milestones for the next round
- ≥ 1,000 paying customers, ≥ 35% 90-day repeat.
- ≥ 150 active subscriptions for bottles/filters.
- Contribution margin ≥ 25% ex-acquisition.
- One ZX-validated Purchase e2e test in CI and Blue-Drop-grade observability on order/ITN.

If those four are met, the story graduates from “shop” to “category-defining replenishment
business” and the moat becomes the recurring revenue + delivery UX, not the code.

### 7.5 Risks to the thesis
- Incumbent digital catch-up (mitigated by GTM speed + subscription lock-in).
- Margin compression from premium imported brands (mitigated by dispensers/filters mix).
- Logistics capex (mitigated by starting with a single Gauteng vehicle, not a fleet).

---

## 8. Recommended next engineering actions (post-commit `6d62bbb`)

</parameter>
Ranked by ROI on the investment case, items 1–4 from the prior list are now ✅ complete:

1. ~~**Customer accounts + standing orders / subscriptions**~~ (✅ P0 — accounts + order history shipped; subscription engine schema ready, creation UI pending)
2. ~~**Lifecycle email via Resend**~~ (✅ P0 — shipping + delivery templates, admin-triggered via order-status Edge Function)
3. ~~**Back-in-stock notifications**~~ (✅ P1 — table + edge fn + PDP widget shipped)
4. ~~**Delivery slot selection**~~ (✅ P1 — window picker in checkout)
5. ~~**Admin order management**~~ (✅ P0 — real orders + status advancement + lifecycle email triggers)

Remaining:
6. **Subscription creation UI + payment scheduler** (P1 — schema ready in migration 007, needs storefront CRUD + cron)
7. **Playwright e2e of the purchase funnel** against PayFast sandbox (P1 — regression safety)
8. **Structured logging + alerting** on `orders` and `payments-payfast-itn` Edge Functions (P1)
9. **Core Web Vitals budget** in CI + axe a11y check on storefront routes (P2)
10. **B2B invoicing flow** for office-water contracts (P2 — highest-LTV segment)

---

*End of assessment.*