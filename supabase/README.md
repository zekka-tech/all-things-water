# Supabase Backend

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Install the Supabase CLI: `brew install supabase/tap/supabase` or `npm install supabase --save-dev`
3. Link your project: `supabase link --project-ref <your-project-ref>`

## Migrations

Apply migrations to your linked project:

```bash
supabase db push
```

For local development:

```bash
supabase start
supabase db reset  # applies all migrations fresh
```

### Migration files

- `001_initial_schema.sql` — Core tables: products, orders, order_items, order_status_events
- `002_rls_policies.sql` — Row-level security: public read on visible products, service_role for all writes

## Seeding

The seed script loads products from `src/data/products.ts` into your Supabase database.

```bash
# Set environment variables
export SUPABASE_URL="https://<your-project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key from dashboard>"

# Run seed
deno run --allow-env --allow-net supabase/seed.ts
```

Or with the Supabase CLI (local dev):

```bash
supabase db seed
```

## Edge Functions

Edge Functions are served from `supabase/functions/` using the Deno runtime
(configured via `deno.json`).

Available functions:

- `orders` — accepts cart items + customer details, validates stock, creates
  an order atomically via the `create_order` RPC, returns `{ orderId, orderRef }`
- `payments-payfast-initiate` — builds a signed PayFast redirect URL for the
  given order
- `payments-payfast-itn` — handles PayFast ITN (instant transaction
  notification) — verifies signature, validates via server-to-server call,
  marks order as paid, fires Resend email notifications

Deploy all functions:

```bash
supabase functions deploy
```

Or deploy individually:

```bash
supabase functions deploy orders
supabase functions deploy payments-payfast-initiate
supabase functions deploy payments-payfast-itn
```

### Function secrets

Set these in the Supabase dashboard → Edge Functions → Secrets, or via CLI:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set PAYFAST_MERCHANT_ID=...
supabase secrets set PAYFAST_MERCHANT_KEY=...
supabase secrets set PAYFAST_PASSPHRASE=...
supabase secrets set RESEND_API_KEY=...
supabase secrets set PUBLIC_SITE_URL=https://your-domain.com
supabase secrets set MERCHANT_EMAIL=orders@allthingswater.co.za
```

## Testing

### Type-check (deno check)

```bash
# From project root:
npm run deno:check

# Or directly:
cd supabase/functions && deno check **/*.ts
```

### Unit tests

The PayFast signature builder has a dedicated Deno test suite.

```bash
# From project root:
npm run deno:test

# Or directly:
cd supabase/functions && deno test --allow-env --allow-net _shared/payfast.test.ts
```

Tests cover:
- URL encoding (`pfEncode`)
- Signature generation (`buildSignature`) — deterministic, order-sensitive, passphrase-dependent
- Signature verification (`verifySignature`)
- Signed query building (`buildSignedQuery`)
- Form-param parsing (`parseFormParams`) — order preservation, URL-decoding
- Edge cases: empty params, missing values, trailing ampersands
- Known-answer vectors cross-checked against an independent MD5 implementation
  (guards against encoding/ordering regressions)

## Environment Variables

Set in the Supabase dashboard under **Settings → API** or in `.env.local` for local dev:

| Variable | Scope | Description |
|---|---|---|
| `SUPABASE_URL` | public | Project URL |
| `SUPABASE_ANON_KEY` | public | Anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Service role key for admin operations |
| `PAYFAST_MERCHANT_ID` | server-only | PayFast merchant ID |
| `PAYFAST_MERCHANT_KEY` | server-only | PayFast merchant key |
| `PAYFAST_PASSPHRASE` | server-only | PayFast passphrase for ITN validation |
| `PAYFAST_SANDBOX` | server-only | Set to `true` for test mode |
| `RESEND_API_KEY` | server-only | Resend API key for transactional emails |
| `PUBLIC_SITE_URL` | server-only | Canonical site URL for return/cancel URLs |
