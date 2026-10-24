-- Loyalty points + referral program.
--
-- Account-based: each authenticated customer has a loyalty account with a points
-- balance and a unique referral code. Points are awarded server-side when an
-- order transitions to 'paid' (trigger), so they can never be granted from the
-- browser. A referral bonus is paid to the referrer on the referred user's
-- first paid order.

create table if not exists public.loyalty_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  referral_code text not null unique,
  referred_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_loyalty_referred_by on public.loyalty_accounts(referred_by)
  where referred_by is not null;

alter table public.loyalty_accounts enable row level security;

create policy "Service role full access to loyalty"
  on public.loyalty_accounts for all
  to service_role using (true) with check (true);

-- Users may read their own loyalty account; all writes are mediated by the
-- SECURITY DEFINER RPC and the award trigger below.
create policy "Users can view their own loyalty account"
  on public.loyalty_accounts for select
  to authenticated
  using (user_id = auth.uid());

create trigger set_updated_at_loyalty before update on public.loyalty_accounts
  for each row execute function public.set_updated_at();

-- Points config: 1 point per R10 spent; flat referral bonus.
-- ────────────────────────────────────────────────────────────────────

-- Fetch (or lazily create) the caller's loyalty account. Optionally links a
-- referral code on first creation (or if not yet linked), never to self.
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
begin
  if v_uid is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into v_rec from public.loyalty_accounts where user_id = v_uid;

  if not found then
    loop
      v_code := upper(substr(md5(random()::text || clock_timestamp()::text || v_uid::text), 1, 8));
      exit when not exists (select 1 from public.loyalty_accounts where referral_code = v_code);
    end loop;

    if p_ref_code is not null and length(trim(p_ref_code)) > 0 then
      select user_id into v_referrer
      from public.loyalty_accounts
      where referral_code = upper(trim(p_ref_code)) and user_id <> v_uid;
    end if;

    insert into public.loyalty_accounts (user_id, referral_code, referred_by)
    values (v_uid, v_code, v_referrer)
    returning * into v_rec;

  elsif v_rec.referred_by is null
        and p_ref_code is not null and length(trim(p_ref_code)) > 0 then
    select user_id into v_referrer
    from public.loyalty_accounts
    where referral_code = upper(trim(p_ref_code)) and user_id <> v_uid;
    if v_referrer is not null then
      update public.loyalty_accounts
      set referred_by = v_referrer, updated_at = now()
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

-- Award points when an order becomes paid (and a referral bonus on the
-- referred user's first paid order). Buyer's account is created on demand.
create or replace function public.award_loyalty_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_paid_count integer;
  v_referrer uuid;
begin
  if new.status = 'paid'
     and old.status is distinct from 'paid'
     and new.user_id is not null then

    v_points := floor(new.total / 10.0);

    insert into public.loyalty_accounts (user_id, referral_code)
    values (
      new.user_id,
      upper(substr(md5(random()::text || clock_timestamp()::text || new.user_id::text), 1, 8))
    )
    on conflict (user_id) do nothing;

    update public.loyalty_accounts
    set points = points + v_points,
        lifetime_points = lifetime_points + v_points,
        updated_at = now()
    where user_id = new.user_id;

    select count(*) into v_paid_count
    from public.orders
    where user_id = new.user_id and status = 'paid';

    if v_paid_count = 1 then
      select referred_by into v_referrer
      from public.loyalty_accounts where user_id = new.user_id;
      if v_referrer is not null then
        update public.loyalty_accounts
        set points = points + 100,
            lifetime_points = lifetime_points + 100,
            updated_at = now()
        where user_id = v_referrer;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_award_loyalty_on_paid on public.orders;
create trigger trg_award_loyalty_on_paid
  after update on public.orders
  for each row execute function public.award_loyalty_on_paid();

revoke execute on function public.get_or_create_loyalty(text) from public, anon;
grant execute on function public.get_or_create_loyalty(text) to authenticated;
