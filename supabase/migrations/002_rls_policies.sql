-- Enable RLS
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;

-- Products: public read access for visible products
create policy "Anyone can view visible products"
  on public.products for select
  using (visible = true);

-- Products: service role can do all (for seed scripts and admin)
create policy "Service role full access"
  on public.products for all
  to service_role
  using (true)
  with check (true);

-- Orders: service role full access (Edge Functions use service_role)
create policy "Service role full access"
  on public.orders for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access"
  on public.order_items for all
  to service_role
  using (true)
  with check (true);

create policy "Service role full access"
  on public.order_status_events for all
  to service_role
  using (true)
  with check (true);

