# All Things Water — Transactional Backend Plan

## Architecture Overview

```
Browser (React SPA)
  │
  ├─ Checkout form ──► POST /functions/v1/create-order ──► PayFast redirect
  │                                                          │
  │                          ┌───────────────────────────────┘
  │                          ▼
  │                     PayFast hosted payment page
  │                          │
  │              ┌───────────┴───────────┐
  │              ▼                       ▼
  │     /payfast-notify               /payfast-return
  │     (ITN webhook)                 (browser redirect)
  │              │                       │
  │              ▼                       ▼
  │         Update order            Show confirmation
  │         Send email              page to user
  │
  └─ Order lookup ──► GET /functions/v1/order/:ref ──► Order status + details
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Database | Supabase (PostgreSQL) |
| API / Logic | Supabase Edge Functions (Deno) |
| Payment | PayFast (SA-native redirect-based gateway) |
| Email | Resend (transactional emails) |
| Auth | None (guest checkout only — identified by order ref) |

## Payment Flow (PayFast)

1. **Create Order** — Edge Function `create-order` generates `order_ref` (e.g. `ATW-A1B2C3`), persists order + items to DB, then builds and returns a PayFast payment URL with:
   - `merchant_id`, `merchant_key` (from env)
   - `amount`, `item_name`, `m_payment_id` (order_ref)
   - `return_url`, `cancel_url`, `notify_url`
   - MD5 signature (order matters — PayFast docs)

2. **Redirect** — Browser redirects to PayFast. User pays via EFT, card, etc.

3. **ITN (Instant Transaction Notification)** — PayFast POSTs to `notify_url` (`/payfast-notify`):
   - Edge Function validates the request (IP whitelist check, signature re-computation, passphrase)
   - Updates order status to `paid`
   - Inserts `order_status_events` entry
   - Sends confirmation email via Resend
   - Returns HTTP 200 (PayFast expects this)

4. **Return URL** — PayFast redirects browser to `return_url` (`/payfast-return`):
   - Edge Function queries order by `m_payment_id` → redirects to frontend order confirmation page

5. **Sandbox mode** — When `PAYFAST_SANDBOX=true`, use `sandbox.payfast.co.za` instead of `www.payfast.co.za`

## Database Schema

Four tables in `public` schema, all protected by RLS:

- **products** — Catalog (readable by anon, writable by service_role)
- **orders** — Order headers (service_role for CRUD, anon can read own by ref)
- **order_items** — Line items (service_role only)
- **order_status_events** — Audit log (service_role only)

All monetary values stored as integers (ZAR). Prices from static `src/data/products.ts` are in whole ZAR; the DB schema uses `integer` for compatibility with the existing codebase. If sub-rand pricing is ever needed, multiply by 100 for cent-based storage.

## Edge Functions (to be built as separate subtasks)

### `create-order`
- **Trigger**: POST from checkout form
- **Input**: Customer details, delivery method, cart items
- **Actions**:
  1. Validate stock (SELECT … FOR UPDATE)
  2. Calculate totals (subtotal, delivery fee per existing rules)
  3. Generate `order_ref`
  4. INSERT order + order_items + status_event
  5. Build PayFast URL → return `{ paymentUrl }`
- **Env vars**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_SANDBOX, PUBLIC_SITE_URL

### `payfast-notify`
- **Trigger**: POST from PayFast (ITN)
- **Actions**:
  1. Validate request source (PayFast IP ranges)
  2. Re-compute signature with passphrase
  3. Verify `payment_status` = COMPLETE
  4. UPDATE order status → `paid`
  5. INSERT status_event
  6. Decrement stock
  7. Send confirmation email via Resend
  8. Return 200 OK
- **Env vars**: Same as create-order + RESEND_API_KEY

### `payfast-return`
- **Trigger**: GET from browser (PayFast redirect)
- **Actions**: Query order → redirect to frontend `/order-confirmed?ref=ATW-XXXX`
- **Env vars**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_SITE_URL

### `order-confirmation` (email)
- Called internally by `payfast-notify`
- Sends HTML email via Resend with order summary
- Uses Resend's React Email or inline HTML

## Frontend Changes Required

1. **Checkout page** — Replace `placeOrder` mock with fetch to `create-order` Edge Function
2. **Order confirmation page** — New route `/order-confirmed` reads `ref` param, optionally fetches order status
3. **Order lookup page** — New route `/orders/:ref` for customers to check status (fetches via anon RLS)

## Environment Variables

### Frontend (`VITE_*` — bundled, visible in browser)
| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |

### Edge Functions (server-only, set in Supabase dashboard)
| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL (available automatically) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for DB writes |
| `PAYFAST_MERCHANT_ID` | PayFast merchant ID |
| `PAYFAST_MERCHANT_KEY` | PayFast merchant key |
| `PAYFAST_PASSPHRASE` | PayFast passphrase for ITN signature |
| `PAYFAST_SANDBOX` | `true` for test mode, `false` for live |
| `RESEND_API_KEY` | Resend API key |
| `PUBLIC_SITE_URL` | Canonical URL for return/cancel URLs |

## Migration & Seed

```bash
# Apply migrations
supabase db push

# Seed products
deno run --allow-env --allow-net supabase/seed.ts
```

## Order Status Lifecycle

```
pending_payment → paid → processing → shipped → delivered
                             │
                             ├── cancelled (customer request, before shipping)
                             │
                             └── expired (payment not completed within timeout)
```
