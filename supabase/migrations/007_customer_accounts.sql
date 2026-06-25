-- Customer accounts, back-in-stock notifications, and subscriptions.
--
-- This migration adds the tables and policies needed for the P0/P1
-- customer-facing features: account-linked order history, back-in-stock
-- alerts, and standing water/filter subscriptions.

-- ────────────────────────────────────────────────────────────────────
-- 1. Link orders to auth users (optional — set by the Edge Function)
-- ────────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_orders_user_id on public.orders(user_id)
  where user_id is not null;

-- Authenticated users can read their own orders (matched on email or user_id).
-- Service role already has full access via 002_rls_policies.sql.
create policy "Users can view their own orders"
  on public.orders for select
  to authenticated
  using (
    user_id = auth.uid()
    or customer_email = (
      select email from auth.users where id = auth.uid()
    )
  );

-- Users can read order_items only for their own orders.
create policy "Users can view their own order items"
  on public.order_items for select
  to authenticated
  using (
    order_id in (
      select id from public.orders
      where user_id = auth.uid()
         or customer_email = (select email from auth.users where id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- 2. Back-in-stock notifications
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.back_in_stock_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  product_id text not null references public.products(id) on delete cascade,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (email, product_id)
);

create index if not exists idx_backinstock_product
  on public.back_in_stock_subscriptions(product_id)
  where notified = false;

alter table public.back_in_stock_subscriptions enable row level security;

-- Anyone (guest checkout) can subscribe. We only need INSERT from anon.
create policy "Anyone can subscribe to back-in-stock"
  on public.back_in_stock_subscriptions for insert
  to anon, authenticated
  with check (true);

-- ────────────────────────────────────────────────────────────────────
-- 3. Subscriptions (standing orders for bottles / filters)
-- ────────────────────────────────────────────────────────────────────
create type public.subscription_frequency as enum
  ('weekly', 'fortnightly', 'monthly');

create type public.subscription_status as enum
  ('active', 'paused', 'cancelled');

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  delivery_address text not null,
  delivery_city text not null,
  delivery_postal_code text not null,
  delivery_notes text,
  product_id text not null references public.products(id) on delete cascade,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price > 0),
  frequency public.subscription_frequency not null,
  status public.subscription_status not null default 'active',
  next_delivery_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_subscriptions_next_delivery
  on public.subscriptions(next_delivery_date)
  where status = 'active';

alter table public.subscriptions enable row level security;

create policy "Service role full access to subscriptions"
  on public.subscriptions for all
  to service_role
  using (true) with check (true);

-- A user can read/pause/cancel their own subscriptions.
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (
    user_id = auth.uid()
    or customer_email = (select email from auth.users where id = auth.uid())
  );

create policy "Users can create their own subscriptions"
  on public.subscriptions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or customer_email = (select email from auth.users where id = auth.uid())
  );

create policy "Users can update their own subscriptions (pause/cancel)"
  on public.subscriptions for update
  to authenticated
  using (
    user_id = auth.uid()
    or customer_email = (select email from auth.users where id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or customer_email = (select email from auth.users where id = auth.uid())
  );

-- updated_at trigger
create trigger set_updated_at_subscriptions before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────
-- 4. Extend create_order RPC to accept an optional user_id
-- ────────────────────────────────────────────────────────────────────
create or replace function public.create_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_city text,
  p_delivery_postal_code text,
  p_delivery_notes text,
  p_delivery_method text,
  p_subtotal integer,
  p_delivery_fee integer,
  p_total integer,
  p_order_ref text,
  p_items jsonb,
  p_whatsapp_optin boolean,
  p_user_id uuid default null,
  p_delivery_slot text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_price integer;
  v_name text;
  v_stock integer;
begin
  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('error', 'No items in order');
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      return jsonb_build_object('error', 'Invalid item', 'productId', v_product_id);
    end if;

    select stock, name, price into v_stock, v_name, v_price
    from public.products
    where id = v_product_id and visible = true
    for update;

    if not found then
      return jsonb_build_object('error', 'Product not found', 'productId', v_product_id);
    end if;

    if v_stock < v_quantity then
      return jsonb_build_object(
        'error', 'Insufficient stock',
        'productId', v_product_id,
        'available', v_stock,
        'requested', v_quantity
      );
    end if;
  end loop;

  insert into public.orders (
    order_ref, customer_name, customer_email, customer_phone,
    delivery_address, delivery_city, delivery_postal_code,
    delivery_notes, delivery_method, subtotal, delivery_fee, total,
    status, whatsapp_optin, user_id, delivery_slot
  ) values (
    p_order_ref, p_customer_name, p_customer_email, p_customer_phone,
    p_delivery_address, p_delivery_city, p_delivery_postal_code,
    p_delivery_notes, p_delivery_method, p_subtotal, p_delivery_fee, p_total,
    'pending_payment', p_whatsapp_optin, p_user_id, p_delivery_slot
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::integer;
    v_name := (v_item->>'name')::text;

    insert into public.order_items (order_id, product_id, product_name, product_price, quantity, line_total)
    values (v_order_id, v_product_id, v_name, v_price, v_quantity, v_price * v_quantity);

    update public.products
    set stock = stock - v_quantity
    where id = v_product_id and stock >= v_quantity;
  end loop;

  insert into public.order_status_events (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Order created');

  return jsonb_build_object('orderId', v_order_id, 'orderRef', p_order_ref);
end;
$$;

-- Add delivery_slot column to orders
alter table public.orders
  add column if not exists delivery_slot text;

-- Re-grant service-role only (006 revoked public access)
grant execute on function public.create_order(
  text, text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, boolean, uuid, text
) to service_role;