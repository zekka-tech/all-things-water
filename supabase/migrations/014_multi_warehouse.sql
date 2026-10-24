-- Multi-warehouse inventory.
--
-- Adds per-warehouse on-hand tracking and region-based fulfilment routing
-- WITHOUT changing the proven reservation money-path: `products.stock` /
-- `reserved_stock` remain the authoritative sellable counts (create_order /
-- mark_order_paid are untouched). `product_warehouse_stock` is the physical
-- on-hand breakdown; orders are routed to a fulfilment warehouse at creation,
-- and that warehouse's on-hand is decremented on dispatch ('shipped').
-- (Reservations remain global — a documented MVP limitation.)

create table if not exists public.warehouses (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  name text not null,
  province text,
  serves_regions text[] not null default '{}',
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_warehouse_stock (
  product_id text not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  updated_at timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);

create index if not exists idx_pws_warehouse on public.product_warehouse_stock(warehouse_id);

alter table public.orders
  add column if not exists fulfillment_warehouse_id uuid references public.warehouses(id);

alter table public.warehouses enable row level security;
alter table public.product_warehouse_stock enable row level security;

create policy "Service role full access to warehouses"
  on public.warehouses for all to service_role using (true) with check (true);
create policy "Service role full access to product_warehouse_stock"
  on public.product_warehouse_stock for all to service_role using (true) with check (true);

create trigger set_updated_at_pws before update on public.product_warehouse_stock
  for each row execute function public.set_updated_at();

-- Coarse SA postal-code → region mapping (first digit).
create or replace function public.region_for_postal(p_postal_code text)
returns text
language sql
immutable
as $$
  select case left(coalesce(nullif(trim(p_postal_code), ''), '0'), 1)
    when '0' then 'GP' when '1' then 'GP' when '2' then 'GP'
    when '3' then 'KZN' when '4' then 'KZN'
    when '5' then 'EC' when '6' then 'EC'
    when '7' then 'WC' when '8' then 'WC'
    when '9' then 'FS'
    else 'GP'
  end;
$$;

-- Choose the fulfilment warehouse for a delivery: the highest-priority active
-- warehouse that serves the postal code's region, else the highest-priority
-- active warehouse overall.
create or replace function public.pick_fulfillment_warehouse(p_postal_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region text := public.region_for_postal(p_postal_code);
  v_id uuid;
begin
  select id into v_id from public.warehouses
  where active and v_region = any(serves_regions)
  order by priority asc limit 1;

  if v_id is null then
    select id into v_id from public.warehouses
    where active
    order by priority asc limit 1;
  end if;

  return v_id;
end;
$$;

-- Decrement a dispatched order's on-hand at its fulfilment warehouse.
create or replace function public.dispatch_order_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wh uuid;
  v_item record;
  v_count integer := 0;
begin
  select fulfillment_warehouse_id into v_wh from public.orders where id = p_order_id;
  if v_wh is null then
    return jsonb_build_object('dispatched', false, 'reason', 'no fulfilment warehouse');
  end if;

  for v_item in
    select product_id, quantity from public.order_items where order_id = p_order_id
  loop
    insert into public.product_warehouse_stock (product_id, warehouse_id, on_hand)
    values (v_item.product_id, v_wh, 0)
    on conflict (product_id, warehouse_id) do nothing;

    update public.product_warehouse_stock
    set on_hand = greatest(on_hand - v_item.quantity, 0), updated_at = now()
    where product_id = v_item.product_id and warehouse_id = v_wh;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('dispatched', true, 'warehouseId', v_wh, 'lines', v_count);
end;
$$;

-- Seed a default warehouse serving all regions and backfill on-hand from the
-- current product stock so the per-warehouse view is coherent on day one.
insert into public.warehouses (code, name, province, serves_regions, priority)
values ('JHB', 'Johannesburg DC', 'Gauteng', array['GP','KZN','EC','WC','FS'], 1)
on conflict (code) do nothing;

insert into public.product_warehouse_stock (product_id, warehouse_id, on_hand)
select p.id, w.id, p.stock
from public.products p
cross join public.warehouses w
where w.code = 'JHB'
on conflict (product_id, warehouse_id) do nothing;

revoke execute on function public.pick_fulfillment_warehouse(text) from public, anon, authenticated;
revoke execute on function public.dispatch_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.pick_fulfillment_warehouse(text) to service_role;
grant execute on function public.dispatch_order_stock(uuid) to service_role;
