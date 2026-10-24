-- Least-privilege table grants + loyalty integrity (audit 2026-10, R22–R24).
--
--   R22  anon/authenticated held Supabase's default ALL on most tables. RLS
--        blocked rows, but TRUNCATE is not subject to RLS, and any future
--        permissive policy would have opened writes on products/admins.
--        Grants now match exactly what the browser uses.
--   R23  The referral bonus fired whenever the referred customer had exactly
--        one order *currently* in status 'paid'. Orders move on to
--        processing/shipped/delivered, so every later purchase re-awarded the
--        referrer 100 points. The bonus is now recorded once per account.
--        Referrals can also no longer be attached after a first purchase or
--        form a two-account loop.
--   R24  Points earned on an order were kept when a paid order was cancelled.

-- ────────────────────────────────────────────────────────────────────
-- 1. Table grants (R22)
-- ────────────────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Public catalogue (RLS: visible rows only). Also used by the health probe.
grant select on public.products to anon, authenticated;

-- Signed-in customers: their own rows only, enforced by RLS policies.
grant select on public.admins to authenticated;            -- own row (admin UI gate)
grant select on public.loyalty_accounts to authenticated;  -- own account
grant select on public.order_items to authenticated;       -- items of own orders

-- Orders: every column except the payment-binding checkout_token.
grant select (
  id, order_ref, status, total, subtotal, delivery_fee, delivery_method,
  customer_name, customer_email, customer_phone,
  delivery_address, delivery_city, delivery_postal_code, delivery_notes,
  delivery_slot, created_at, updated_at, user_id
) on public.orders to authenticated;

-- Subscriptions: create, read, and pause/cancel/toggle auto-pay/cadence.
-- Price, product name, owner and status on insert are set by
-- enforce_subscription_integrity() (migration 016).
grant select, insert on public.subscriptions to authenticated;
grant update (status, auto_pay, frequency) on public.subscriptions to authenticated;

-- ────────────────────────────────────────────────────────────────────
-- 2. Loyalty bookkeeping columns (R23, R24)
-- ────────────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists loyalty_points_awarded integer not null default 0
    check (loyalty_points_awarded >= 0);

alter table public.loyalty_accounts
  add column if not exists referral_bonus_awarded_at timestamptz;

-- Backfill: referred accounts that already bought have had their bonus.
update public.loyalty_accounts la
set referral_bonus_awarded_at = now()
where la.referred_by is not null
  and la.referral_bonus_awarded_at is null
  and exists (
    select 1 from public.orders o
    where o.user_id = la.user_id
      and o.status in ('paid', 'processing', 'shipped', 'delivered')
  );

-- Backfill: record points already granted on historic orders so a later
-- cancellation reverses the right amount.
update public.orders
set loyalty_points_awarded = floor(total / 10.0)
where user_id is not null
  and status in ('paid', 'processing', 'shipped', 'delivered')
  and loyalty_points_awarded = 0;

-- ────────────────────────────────────────────────────────────────────
-- 3. Points trigger: award once, reverse on cancellation (R23, R24)
--
-- BEFORE UPDATE so the order row itself records what was awarded.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.loyalty_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_referrer uuid;
  v_bonus_at timestamptz;
begin
  if new.user_id is null or new.status is not distinct from old.status then
    return new;
  end if;

  -- Award on the first transition into 'paid'.
  if new.status = 'paid' and coalesce(old.loyalty_points_awarded, 0) = 0 then
    v_points := floor(new.total / 10.0);

    insert into public.loyalty_accounts (user_id, referral_code)
    values (
      new.user_id,
      upper(substr(md5(gen_random_uuid()::text || new.user_id::text), 1, 8))
    )
    on conflict (user_id) do nothing;

    update public.loyalty_accounts
    set points = points + v_points,
        lifetime_points = lifetime_points + v_points
    where user_id = new.user_id
    returning referred_by, referral_bonus_awarded_at into v_referrer, v_bonus_at;

    new.loyalty_points_awarded := v_points;

    -- One referral bonus per referred account, ever.
    if v_referrer is not null and v_bonus_at is null then
      update public.loyalty_accounts
      set referral_bonus_awarded_at = now()
      where user_id = new.user_id;

      update public.loyalty_accounts
      set points = points + 100,
          lifetime_points = lifetime_points + 100
      where user_id = v_referrer;
    end if;

  -- Reverse the order's points when a paid order is cancelled. Points
  -- already spent cannot go below zero.
  elsif new.status = 'cancelled' and coalesce(old.loyalty_points_awarded, 0) > 0 then
    update public.loyalty_accounts
    set points = greatest(points - old.loyalty_points_awarded, 0),
        lifetime_points = greatest(lifetime_points - old.loyalty_points_awarded, 0)
    where user_id = new.user_id;

    new.loyalty_points_awarded := 0;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_loyalty_on_paid on public.orders;
drop function if exists public.award_loyalty_on_paid();

drop trigger if exists trg_loyalty_on_order_status on public.orders;
create trigger trg_loyalty_on_order_status
  before update of status on public.orders
  for each row execute function public.loyalty_on_order_status();

-- ────────────────────────────────────────────────────────────────────
-- 4. Referral attachment rules (R23)
-- ────────────────────────────────────────────────────────────────────
create or replace function public.get_or_create_loyalty(p_ref_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rec public.loyalty_accounts%rowtype;
  v_code text;
  v_referrer uuid;
  v_ref text := upper(left(trim(coalesce(p_ref_code, '')), 16));
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_rec from public.loyalty_accounts where user_id = v_uid;

  if not found then
    loop
      v_code := upper(substr(md5(gen_random_uuid()::text || v_uid::text), 1, 8));
      exit when not exists (select 1 from public.loyalty_accounts where referral_code = v_code);
    end loop;

    insert into public.loyalty_accounts (user_id, referral_code)
    values (v_uid, v_code)
    on conflict (user_id) do nothing;

    select * into v_rec from public.loyalty_accounts where user_id = v_uid;
  end if;

  -- A referral can be attached once, before the customer's first purchase,
  -- and never to someone the customer referred themselves.
  if v_ref <> '' and v_rec.referred_by is null and v_rec.referral_bonus_awarded_at is null
     and not exists (
       select 1 from public.orders o
       where o.user_id = v_uid
         and o.status in ('paid', 'processing', 'shipped', 'delivered')
     ) then
    select user_id into v_referrer
    from public.loyalty_accounts
    where referral_code = v_ref
      and user_id <> v_uid
      and referred_by is distinct from v_uid;

    if v_referrer is not null then
      update public.loyalty_accounts
      set referred_by = v_referrer
      where user_id = v_uid
      returning * into v_rec;
    end if;
  end if;

  return jsonb_build_object(
    'points', v_rec.points,
    'lifetimePoints', v_rec.lifetime_points,
    'referralCode', v_rec.referral_code,
    'referred', v_rec.referred_by is not null
  );
end;
$$;

-- Re-assert the function lockdown from migration 016.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.get_or_create_loyalty(text) to authenticated;
grant execute on function public.current_user_verified_email() to authenticated;
