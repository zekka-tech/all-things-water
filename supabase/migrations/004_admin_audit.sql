-- Admin audit log for tracking all product/stock changes
create table public.admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  product_id text,
  product_name text,
  changes jsonb not null default '{}'::jsonb,
  performed_at timestamptz not null default now()
);

-- Index for querying by product
create index idx_admin_audit_product on public.admin_audit_log(product_id);

-- Index for time-based queries
create index idx_admin_audit_performed_at on public.admin_audit_log(performed_at desc);

-- RLS: service_role can read/write, anon cannot access
alter table public.admin_audit_log enable row level security;

create policy "Service role can manage audit log" on public.admin_audit_log
  for all using (true) with check (true);
