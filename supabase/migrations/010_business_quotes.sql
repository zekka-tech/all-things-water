-- B2B office-water quote requests.
--
-- The highest-LTV segment (office dispenser + cooler contracts). Captured via
-- the public /business page, mediated entirely server-side: the Edge Function
-- inserts with the service role, so no anon/authenticated write policy exists
-- on this table (RLS is on with service-role-only access).

create table if not exists public.business_quotes (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  team_size text,
  interest text,
  message text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_quotes_status
  on public.business_quotes(status);
create index if not exists idx_business_quotes_created
  on public.business_quotes(created_at desc);

alter table public.business_quotes enable row level security;

-- Service role only. No anon/authenticated policies — all access is mediated by
-- the business-quote / admin Edge Functions.
create policy "Service role full access to business_quotes"
  on public.business_quotes for all
  to service_role
  using (true) with check (true);

-- Reuse the shared updated_at trigger (defined in earlier migrations).
create trigger set_updated_at_business_quotes before update on public.business_quotes
  for each row execute function public.set_updated_at();
