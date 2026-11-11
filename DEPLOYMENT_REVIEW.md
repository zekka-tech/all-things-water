# Deployment readiness review — 2026-11-11

This review covers the storefront, cart and account state, admin workflows,
Supabase functions, migrations and permissions, payments, scheduled jobs,
static hosting, dependencies and CI. Changes are local and have not been
deployed. Historical live-service observations in PRODUCTION_GO_LIVE.md have
not been revalidated by this review.

## Fixed findings

| Finding | Result |
| --- | --- |
| Storefront and subscription picker used bundled prices and stock | Public catalogue loads from Supabase, subtracts reservations, refreshes on navigation/focus, and disables checkout on refresh failure. Bundled catalogue remains available for development without a backend. |
| Admin product edits/visibility were browser-only; stock saves ignored failures | Admin reads current server rows, persists editable fields through an authorized endpoint, reports failed saves, and keeps drafts available for retry. Catalogue writes and server-derived audit records commit in one transaction. |
| Purchasing costs were in the public bundle and readable through the Data API | Bundled costs removed; public product column grants exclude cost. Admin reads use the authorized service endpoint. |
| Status updates, dispatch and audit were separate commits | A row-locked RPC commits them together. Shipping retries cannot dispatch twice; cancellation restores paid, unshipped sellable inventory once. This does not issue a payment refund. |
| Scheduled jobs contained the production project URL | Scheduler destinations now come from each environment's Vault `project_url`; missing/invalid configuration skips requests. |
| Auth listeners made Auth API calls while the session lock was held | Customer listeners use delivered session state, clear expired/signed-out users and reject stale restoration results; admin checks defer until the callback returns. |
| Saved cart rows trusted arbitrary product objects and quantities | Restore keeps validated ids/quantities, reloads trusted product data, merges duplicate rows, clamps stock and rejects nonfinite quantities. |
| API timeout ended when headers arrived | Timeout now covers body parsing, cleans up in `finally`, and normalizes response errors. Backend body limits stop oversized streams before buffering them fully. |
| HTTP success alone could mark an ad-hoc charge paid | Require PayFast's explicit success response and payment id. Unknown outcomes alert for reconciliation without sending another collection link. Live subscription runs require a passphrase. |
| Return URLs cleared carts and emitted purchases before payment verification | Token-bound status polling verifies payment before clearing the cart or recording the server's total. Arbitrary return URLs do neither. Cancellation copy does not promise that no payment occurred. |
| Retrying payment initiation created another reservation | Known orders are reused for unchanged retries; changed details release the previous reservation before a new order is created. |
| A price change could silently change the amount sent to PayFast | Checkout includes the displayed total; order creation rejects a mismatch against current server prices before reserving inventory. |
| Tracking could run despite the analytics switch or withdrawn consent | Marketing honors the analytics switch; event dispatch and error reporting recheck consent. |
| Release checks and tests were incomplete | Blocking browser checks, staging branch CI, release environment validation, automatic Deno test discovery, bounded Vitest workers and complete source coverage reporting. Removed unused catalogue helper tests, including a vacuous assertion. |
| Dependency audit found moderate minimatch advisories | Scoped override selects patched minimatch; npm install reported zero vulnerabilities. Supabase clients and committed lockfiles pin their resolved versions. |

## Deployment sequence

1. Back up the target database. Validate staging using a separate Supabase project,
   PayFast sandbox account/settings, email recipients and cron secrets.
2. Configure Vault `project_url` **before applying the new migration**. It must
   contain that environment's `https://<ref>.supabase.co` origin. Create/update
   it through the target project's SQL editor; never commit secret values.
   Existing `subscription_cron_secret`, `monitor_cron_secret` and
   `back_in_stock_cron_secret` remain required and must match Edge Function secrets.
3. Apply `20261111064118_deployment_readiness.sql` after the existing 21 migrations.
   It changes function definitions and public product column grants without
   deleting business data. Do not rewrite or remove already-applied migrations.
4. Deploy functions, especially `admin-sync`, `order-status`,
   `payments-payfast-initiate`, `payments-payfast-itn`, and `subscriptions-run`.
   Shared helpers also changed: redeploy all functions to keep them consistent.
5. Use `npm ci`, then `npm run build:staging` for staging or
   `npm run build:production` for production. Configure the corresponding Pages
   build command and environment variables. The ordinary `build` command supports
   backend-free CI smoke tests; it is not a release configuration check.
6. Deploy frontend output only after the backend. New frontend catalogue saves
   and status polling require the new backend. The backend accepts legacy stock
   payloads during the rollout.
7. Verify deployed health, signed-in account/admin access, catalogue reads,
   persisted admin edits, guest checkout, cancellation, confirmed payment,
   both transactional emails and each scheduled job's destination/result.

Frontend release builds require `VITE_SUPABASE_URL`, a public
`VITE_SUPABASE_ANON_KEY` (anon JWT or publishable key), and `VITE_SITE_URL`.
Contact/newsletter endpoints default to the configured project; explicit
overrides must stay within that environment. Staging builds emit `noindex`
page metadata; protect staging access and configure crawler controls at hosting
as well. Keep Cloudflare headers/CSP aligned with configured integrations.

To create a new Vault destination, run in the intended project's SQL editor:

```sql
select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'project_url');
-- For an existing secret, use vault.update_secret(id, new_secret) instead.
```

## Release gates outside this local review

- Run a completed PayFast sandbox payment through ITN, confirm database payment
  state, merchant notification and customer confirmation. The opt-in browser
  test stops at PayFast's payment page; it does not prove callback delivery.
- Before production approval, complete a controlled real payment and confirm
  notifications and operational reconciliation. No live charge was made here.
- Verify hosted Auth redirects, email confirmations, admin MFA, backend secrets,
  CORS, TLS/CSP, cron Vault configuration, delivery recipients and alert delivery
  separately for staging and production. Local config does not prove hosted state.
- Confirm backups and an actual restore procedure for the target environment.
  Replay migrations against staging's actual Postgres version as well; the local
  disposable harness uses the pinned Supabase Postgres 15 image.
  Roll frontend/functions back together if required; keep additive migration
  history and do not restore an old database over new orders.

## Operational limitations

Inventory reservations remain global; warehouse routing does not guarantee
local warehouse availability. Warehouse on-hand tracking still uses the existing
clamping dispatch behavior. Cancellation changes order/inventory state and
requires a separate merchant refund process where money was taken.
Confirmed checkout polling requires this browser tab's session storage; if it
is unavailable, the confirmation email/account remains the source of status.
Order-creation responses lost after a server commit still require reservation
expiry/reconciliation; the client retry fix applies to known order ids.
Email delivery is best effort after payment commits, so operations must monitor
send failures and reconcile/resend rather than treating a 200 callback as email
delivery proof. Static product reviews and business claims require owner approval.

## Verification results

- `npm run typecheck`, `npm run lint`, `npm run build` and `git diff --check`: passed.
- `npm run test:coverage`: 231 tests passed across 34 files. Whole-source line
  coverage is 53.67%; browser/SQL/Deno checks are separate and are not counted in
  that percentage. Coverage now includes previously omitted, unimported source
  files. No artificial coverage threshold or passing-only assertions were added.
- `npm run deno:check` and `npm run deno:test`, with frozen lockfile: passed;
  71 backend tests passed after the checkout total validation change.
- `npm run test:db`: all 22 migrations replayed successfully in an isolated
  database; both `security.sql` and `readiness.sql` passed.
- `npm run e2e -- --workers=1`: 16 desktop/mobile purchase-funnel and accessibility
  checks passed. Two PayFast sandbox cases were intentionally skipped because
  sandbox integration credentials were not supplied.
- `npm run test:release`: three configuration-boundary tests passed.
- `npm audit --audit-level=moderate`: zero known vulnerabilities.
- `npm run build:production`: correctly refused this workspace's missing
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_SITE_URL`. The ordinary
  bundle build passed; it does not certify a configured production deployment.
- The final checkout retry regression also passed after adding the displayed
  total to order requests. No live payment, hosted migration or deployment was run.

References used for integration review:
[Supabase function authorization](https://supabase.com/docs/guides/functions/auth),
[Postgres RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[PayFast ad-hoc API responses](https://developers.payfast.co.za/api),
[Vite environment loading](https://vite.dev/guide/api-javascript#loadenv).
