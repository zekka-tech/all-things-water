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

Edge Functions are served from `supabase/functions/` (to be created as separate subtasks):

- `create-order` — creates an order and returns PayFast redirect URL
- `payfast-notify` — handles PayFast ITN (instant transaction notification)
- `payfast-return` — handles PayFast return URL redirect
- `order-confirmation` — sends confirmation email via Resend

Each function uses the service_role key for database access.

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
