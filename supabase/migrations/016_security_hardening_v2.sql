-- Security hardening v2 (audit 2026-10).
--
-- Closes the findings recorded as R14–R21 in SECURITY_AUDIT.md:
--   R14  create_order (16-arg overload from 007/008) was never revoked from
--        PUBLIC, so anyone with the public anon key could call it via
--        /rest/v1/rpc/create_order with their own prices and totals.
--   R15  create_order trusted caller-supplied prices/subtotal/total. It now
--        prices every line from public.products and rejects mismatches, so it
--        is authoritative even if called by a buggy or compromised caller.
--   R16  Subscription orders were priced from subscriptions.unit_price, a
--        column the customer could write through RLS. Subscriptions are now
--        priced from the live catalogue, and customers can only change status,
--        auto_pay and frequency.
--   R17  public.rate_limits had no RLS — anon could read/delete buckets.
--   R18  RLS policies read auth.users directly (permission denied for the
--        authenticated role) and matched guest orders on an unverified email.
--   R19  Scheduler called uuid_generate_v4() under `search_path = public`;
--        on Supabase uuid-ossp lives in the `extensions` schema, so the call
--        fails. Replaced with the built-in gen_random_uuid().
--   R20  Direct anon INSERT on back_in_stock_subscriptions bypassed the Edge
--        Function's validation and rate limiting.
--   R21  New functions default to EXECUTE for PUBLIC; flip the default so a
--        future migration cannot repeat R14 by accident.

-- ────────────────────────────────────────────────────────────────────
-- 1. Lock down function execution (R14, R21)
-- ────────────────────────────────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
alter default privileges in schema public grant execute on functions to service_role;

-- The only RPC the browser is meant to call.
grant execute on function public.get_or_create_loyalty(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 2. rate_limits: RLS on, no client access (R17)
-- ────────────────────────────────────────────────────────────────────
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

drop policy if exists "Service role full access to rate_limits" on public.rate_limits;
create policy "Service role full access to rate_limits"
  on public.rate_limits for all to service_role using (true) with check (true);

-- Server-only tables: belt and braces on top of RLS.
revoke all on table public.payment_tokens from anon, authenticated;
revoke all on table public.slo_samples from anon, authenticated;
revoke all on table public.business_quotes from anon, authenticated;
revoke all on table public.warehouses from anon, authenticated;
revoke all on table public.product_warehouse_stock from anon, authenticated;
revoke all on table public.admin_audit_log from anon, authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 3. Verified-email helper + RLS policy rewrite (R18)
--
-- Guest orders are linked to an account by email. Only do that for an email
-- the user has proven they own; otherwise anyone who registers victim@x
-- (with confirmations off) could read the victim's addresses and phone.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.current_user_verified_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null;
$$;

revoke execute on function public.current_user_verified_email() from public, anon;
grant execute on function public.current_user_verified_email() to authenticated, service_role;

drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
  on public.orders for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or lower(customer_email) = (select public.current_user_verified_email())
  );

drop policy if exists "Users can view their own order items" on public.order_items;
create policy "Users can view their own order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.user_id = (select auth.uid())
          or lower(o.customer_email) = (select public.current_user_verified_email())
        )
    )
  );

-- Customers may read orders but never the payment-binding token.
revoke select on table public.orders from anon, authenticated;
grant select (
  id, order_ref, status, total, subtotal, delivery_fee, delivery_method,
  customer_name, customer_email, customer_phone,
  delivery_address, delivery_city, delivery_postal_code, delivery_notes,
  delivery_slot, created_at, updated_at, user_id
) on table public.orders to authenticated;

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or lower(customer_email) = (select public.current_user_verified_email())
  );

drop policy if exists "Users can create their own subscriptions" on public.subscriptions;
create policy "Users can create their own subscriptions"
  on public.subscriptions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own subscriptions (pause/cancel)" on public.subscriptions;
create policy "Users can update their own subscriptions (pause/cancel)"
  on public.subscriptions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Column-level: a customer can pause/cancel, toggle auto-pay and change
-- cadence — nothing that affects price, product, owner or schedule.
revoke update on table public.subscriptions from anon, authenticated;
grant update (status, auto_pay, frequency) on table public.subscriptions to authenticated;
revoke insert on table public.subscriptions from anon;

-- ────────────────────────────────────────────────────────────────────
-- 4. Subscriptions: server-owned price, product name and owner (R16)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.enforce_subscription_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_name text;
begin
  -- Service role and SQL maintenance are trusted; only police end users.
  if coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select price, name into v_price, v_name
    from public.products
    where id = new.product_id and visible = true;

    if not found then
      raise exception 'Product not available for subscription' using errcode = '22023';
    end if;

    if new.quantity is null or new.quantity < 1 or new.quantity > 100 then
      raise exception 'Quantity must be between 1 and 100' using errcode = '22023';
    end if;

    new.user_id := auth.uid();
    new.customer_email := coalesce(auth.jwt() ->> 'email', new.customer_email);
    new.unit_price := v_price;
    new.product_name := v_name;
    new.status := 'active';
    new.next_delivery_date := greatest(coalesce(new.next_delivery_date, current_date), current_date);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_subscription_integrity on public.subscriptions;
create trigger trg_enforce_subscription_integrity
  before insert on public.subscriptions
  for each row execute function public.enforce_subscription_integrity();

-- ────────────────────────────────────────────────────────────────────
-- 5. Back-in-stock: only via the Edge Function (R20)
-- ────────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can subscribe to back-in-stock" on public.back_in_stock_subscriptions;
revoke all on table public.back_in_stock_subscriptions from anon, authenticated;

drop policy if exists "Service role full access to back_in_stock" on public.back_in_stock_subscriptions;
create policy "Service role full access to back_in_stock"
  on public.back_in_stock_subscriptions for all to service_role using (true) with check (true);

-- ────────────────────────────────────────────────────────────────────
-- 6. Field-length / sanity constraints on new rows (NOT VALID keeps any
--    legacy rows; every new insert/update is checked).
-- ────────────────────────────────────────────────────────────────────
alter table public.orders
  add constraint orders_customer_name_len check (char_length(customer_name) between 1 and 200) not valid,
  add constraint orders_customer_email_len check (char_length(customer_email) between 3 and 254) not valid,
  add constraint orders_customer_phone_len check (customer_phone is null or char_length(customer_phone) <= 30) not valid,
  add constraint orders_delivery_address_len check (delivery_address is null or char_length(delivery_address) <= 500) not valid,
  add constraint orders_delivery_city_len check (delivery_city is null or char_length(delivery_city) <= 100) not valid,
  add constraint orders_delivery_postal_len check (delivery_postal_code is null or char_length(delivery_postal_code) <= 10) not valid,
  add constraint orders_delivery_notes_len check (delivery_notes is null or char_length(delivery_notes) <= 1000) not valid,
  add constraint orders_delivery_slot_len check (delivery_slot is null or char_length(delivery_slot) <= 100) not valid,
  add constraint orders_amounts_valid check (
    subtotal > 0 and delivery_fee >= 0 and total = subtotal + delivery_fee
  ) not valid;

alter table public.subscriptions
  add constraint subscriptions_quantity_max check (quantity <= 100) not valid,
  add constraint subscriptions_text_len check (
    char_length(customer_name) <= 200
    and char_length(customer_email) <= 254
    and (customer_phone is null or char_length(customer_phone) <= 30)
    and char_length(delivery_address) <= 500
    and char_length(delivery_city) <= 100
    and char_length(delivery_postal_code) <= 10
    and (delivery_notes is null or char_length(delivery_notes) <= 1000)
  ) not valid;

-- ────────────────────────────────────────────────────────────────────
-- 7. Authoritative create_order (R15, R19)
--
-- Same signature as 008 so callers are unchanged. Line prices and names come
-- from public.products; client-supplied `price`/`name` in p_items are ignored.
-- Subtotal, delivery fee and total are recomputed and must match what the
-- caller computed — a mismatch means a pricing bug or tampering.
-- Delivery rule mirrors _shared/delivery.ts: free at >= R500, else R75.
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
  v_reserved_stock integer;
  v_available integer;
  v_subtotal integer := 0;
  v_delivery_fee integer;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_reservation_expires_at timestamptz := now() + interval '30 minutes';
begin
  perform public.expire_pending_order_reservations(100);

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('error', 'No items in order');
  end if;
  if jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('error', 'Too many items in order');
  end if;
  if p_delivery_method not in ('delivery', 'collection') then
    return jsonb_build_object('error', 'Invalid delivery method');
  end if;

  -- Reject duplicate product lines; the Edge Function merges them first.
  if (select count(distinct e->>'productId') from jsonb_array_elements(p_items) e)
     <> jsonb_array_length(p_items) then
    return jsonb_build_object('error', 'Duplicate items in order');
  end if;

  -- Lock products in a stable order to avoid deadlocks between checkouts.
  for v_item in
    select e from jsonb_array_elements(p_items) e order by e->>'productId'
  loop
    v_product_id := v_item->>'productId';
    if jsonb_typeof(v_item->'quantity') <> 'number' then
      return jsonb_build_object('error', 'Invalid item', 'productId', v_product_id);
    end if;
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 or v_quantity > 1000 then
      return jsonb_build_object('error', 'Invalid item', 'productId', v_product_id);
    end if;

    select stock, reserved_stock, name, price
      into v_stock, v_reserved_stock, v_name, v_price
    from public.products
    where id = v_product_id and visible = true
    for update;

    if not found then
      return jsonb_build_object('error', 'Product not found', 'productId', v_product_id);
    end if;

    v_available := greatest(v_stock - v_reserved_stock, 0);
    if v_available < v_quantity then
      return jsonb_build_object(
        'error', 'Insufficient stock',
        'productId', v_product_id,
        'available', v_available,
        'requested', v_quantity
      );
    end if;

    v_subtotal := v_subtotal + v_price * v_quantity;
    v_lines := v_lines || jsonb_build_object(
      'productId', v_product_id, 'quantity', v_quantity, 'price', v_price, 'name', v_name
    );
  end loop;

  v_delivery_fee := case
    when p_delivery_method = 'collection' then 0
    when v_subtotal >= 500 then 0
    else 75
  end;

  if p_subtotal is distinct from v_subtotal
     or p_delivery_fee is distinct from v_delivery_fee
     or p_total is distinct from v_subtotal + v_delivery_fee then
    return jsonb_build_object(
      'error', 'Price mismatch',
      'expectedSubtotal', v_subtotal,
      'expectedDeliveryFee', v_delivery_fee
    );
  end if;

  insert into public.orders (
    order_ref, customer_name, customer_email, customer_phone,
    delivery_address, delivery_city, delivery_postal_code, delivery_notes,
    delivery_method, subtotal, delivery_fee, total, status,
    whatsapp_optin, user_id, delivery_slot, reservation_expires_at
  ) values (
    p_order_ref, p_customer_name, p_customer_email, p_customer_phone,
    p_delivery_address, p_delivery_city, p_delivery_postal_code, p_delivery_notes,
    p_delivery_method, v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee, 'pending_payment',
    coalesce(p_whatsapp_optin, false), p_user_id, p_delivery_slot, v_reservation_expires_at
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_product_id := v_line->>'productId';
    v_quantity := (v_line->>'quantity')::integer;
    v_price := (v_line->>'price')::integer;

    insert into public.order_items (
      order_id, product_id, product_name, product_price, quantity, line_total
    ) values (
      v_order_id, v_product_id, v_line->>'name', v_price, v_quantity, v_price * v_quantity
    );

    update public.products
    set reserved_stock = reserved_stock + v_quantity
    where id = v_product_id;
  end loop;

  insert into public.order_status_events (order_id, status, note)
  values (
    v_order_id,
    'pending_payment',
    format('Order created; inventory reserved until %s',
      to_char(v_reservation_expires_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS UTC'))
  );

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderRef', p_order_ref,
    'reservationExpiresAt', v_reservation_expires_at
  );
end;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 8. Scheduler: live catalogue pricing + gen_random_uuid (R16, R19)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.process_due_subscriptions(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_price integer;
  v_name text;
  v_subtotal integer;
  v_delivery_fee integer;
  v_total integer;
  v_order_ref text;
  v_result jsonb;
  v_next date;
  v_summary jsonb := '[]'::jsonb;
begin
  for v_sub in
    select *
    from public.subscriptions
    where status = 'active'
      and next_delivery_date <= current_date
    order by next_delivery_date asc
    limit least(greatest(coalesce(p_limit, 50), 1), 500)
    for update skip locked
  loop
    select price, name into v_price, v_name
    from public.products
    where id = v_sub.product_id and visible = true;

    if not found then
      v_summary := v_summary || jsonb_build_object(
        'subscriptionId', v_sub.id,
        'email', v_sub.customer_email,
        'productId', v_sub.product_id,
        'skipped', true,
        'reason', 'Product not available'
      );
      continue;
    end if;

    v_subtotal := v_price * v_sub.quantity;
    v_delivery_fee := case when v_subtotal >= 500 then 0 else 75 end;
    v_total := v_subtotal + v_delivery_fee;
    v_order_ref := 'ATW-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    v_result := public.create_order(
      v_sub.customer_name,
      v_sub.customer_email,
      coalesce(v_sub.customer_phone, ''),
      v_sub.delivery_address,
      v_sub.delivery_city,
      v_sub.delivery_postal_code,
      coalesce(v_sub.delivery_notes, ''),
      'delivery',
      v_subtotal,
      v_delivery_fee,
      v_total,
      v_order_ref,
      jsonb_build_array(jsonb_build_object(
        'productId', v_sub.product_id,
        'quantity', v_sub.quantity
      )),
      false,
      v_sub.user_id,
      null
    );

    if v_result ? 'error' then
      v_summary := v_summary || jsonb_build_object(
        'subscriptionId', v_sub.id,
        'email', v_sub.customer_email,
        'productId', v_sub.product_id,
        'skipped', true,
        'reason', v_result->>'error'
      );
      continue;
    end if;

    v_next := v_sub.next_delivery_date;
    loop
      v_next := case v_sub.frequency
        when 'weekly' then v_next + 7
        when 'fortnightly' then v_next + 14
        when 'monthly' then (v_next + interval '1 month')::date
      end;
      exit when v_next > current_date;
    end loop;

    update public.subscriptions
    set next_delivery_date = v_next,
        unit_price = v_price,
        product_name = v_name,
        updated_at = now()
    where id = v_sub.id;

    v_summary := v_summary || jsonb_build_object(
      'subscriptionId', v_sub.id,
      'orderId', v_result->>'orderId',
      'orderRef', v_result->>'orderRef',
      'email', v_sub.customer_email,
      'total', v_total,
      'nextDeliveryDate', v_next,
      'autoPay', v_sub.auto_pay,
      'userId', v_sub.user_id,
      'skipped', false
    );
  end loop;

  return v_summary;
end;
$$;

-- ────────────────────────────────────────────────────────────────────
-- 9. POPIA data retention: prune stale personal data (call from `monitor`)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.prune_stale_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bis integer;
  v_rl integer;
begin
  -- Back-in-stock requests: drop once notified 90 days ago, or after a year.
  delete from public.back_in_stock_subscriptions
  where (notified and created_at < now() - interval '90 days')
     or created_at < now() - interval '365 days';
  get diagnostics v_bis = row_count;

  v_rl := public.prune_rate_limits(5000);

  return jsonb_build_object('backInStock', v_bis, 'rateLimits', v_rl);
end;
$$;

-- Re-assert the lockdown for everything defined or replaced above.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.get_or_create_loyalty(text) to authenticated;
grant execute on function public.current_user_verified_email() to authenticated;
