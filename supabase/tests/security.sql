-- Database security regression tests (audit R14–R24).
--
-- Run against a database with all migrations applied:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
-- Simulates PostgREST by switching to the anon/authenticated roles and
-- setting request.jwt.claims. Everything runs in one transaction and is
-- rolled back, so it is safe against a local or CI database.
-- Any failed expectation raises and exits non-zero.

begin;

insert into public.products (id, slug, name, tagline, description, category, price, unit, stock, image)
values
  ('t-cooler', 't-cooler', 'Test Cooler', 't', 'd', 'coolers', 2645, 'each', 10, '/x.png'),
  ('t-bottle', 't-bottle', 'Test Bottle', 't', 'd', 'bottled-water', 10, 'each', 100, '/y.png');

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice.test@example.com', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'victim.test@example.com', null);

-- ── anon ────────────────────────────────────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$ begin
  perform public.create_order('M','m@example.com','','a','c','2000','','delivery',
    1,0,1,'ATW-T-EVIL','[{"productId":"t-cooler","quantity":1}]'::jsonb,false,null,null);
  raise exception 'FAIL R14: anon can execute create_order';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  perform count(*) from public.rate_limits;
  raise exception 'FAIL R17: anon can read rate_limits';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  insert into public.back_in_stock_subscriptions (email, product_id) values ('spam@example.com', 't-cooler');
  raise exception 'FAIL R20: anon can insert back_in_stock_subscriptions';
exception when insufficient_privilege or check_violation then null;
end $$;

reset role;

-- ── service role: create_order is authoritative on price ───────────────
set local role service_role;

do $$
declare r jsonb;
begin
  r := public.create_order('M','m@example.com','','a','c','2000','','delivery',
    1,0,1,'ATW-T-TAMPER','[{"productId":"t-cooler","quantity":1,"price":1}]'::jsonb,false,null,null);
  assert r->>'error' = 'Price mismatch', 'FAIL R15: tampered total accepted: ' || r::text;

  r := public.create_order('Guest','victim.test@example.com','','a','c','2000','','delivery',
    30,75,105,'ATW-T-OK','[{"productId":"t-bottle","quantity":3,"price":0,"name":"FAKE"}]'::jsonb,false,null,null);
  assert r ? 'orderId', 'FAIL: valid order rejected: ' || r::text;
  assert (select product_price from public.order_items where order_id = (r->>'orderId')::uuid) = 10,
    'FAIL R15: line price not taken from catalogue';

  r := public.create_order('M','m@example.com','','a','c','2000','','delivery',
    20,75,95,'ATW-T-DUP','[{"productId":"t-bottle","quantity":1},{"productId":"t-bottle","quantity":1}]'::jsonb,false,null,null);
  assert r->>'error' = 'Duplicate items in order', 'FAIL: duplicate lines accepted';

  r := public.create_order('M','m@example.com','','a','c','2000','','delivery',
    -20,75,55,'ATW-T-NEG','[{"productId":"t-bottle","quantity":-2}]'::jsonb,false,null,null);
  assert r->>'error' = 'Invalid item', 'FAIL: negative quantity accepted';
end $$;

reset role;

-- ── authenticated: subscriptions ────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"alice.test@example.com"}';

insert into public.subscriptions (
  user_id, customer_name, customer_email, delivery_address, delivery_city,
  delivery_postal_code, product_id, product_name, quantity, unit_price, frequency, next_delivery_date
) values (
  'aaaaaaaa-0000-0000-0000-000000000002', 'A', 'alice.test@example.com', 'a', 'c',
  '2000', 't-cooler', 'Cheap', 1, 1, 'monthly', '2020-01-01'
);

do $$ begin
  assert (select unit_price from public.subscriptions where product_id = 't-cooler') = 2645,
    'FAIL R16: customer-chosen unit_price stored';
  assert (select user_id from public.subscriptions where product_id = 't-cooler')
    = 'aaaaaaaa-0000-0000-0000-000000000001', 'FAIL R16: subscription created for another user';
end $$;

do $$ begin
  update public.subscriptions set unit_price = 1;
  raise exception 'FAIL R16: customer can update unit_price';
exception when insufficient_privilege then null;
end $$;

update public.subscriptions set status = 'paused', auto_pay = true;  -- allowed

do $$ begin
  perform checkout_token from public.orders;
  raise exception 'FAIL R18: customer can read checkout_token';
exception when insufficient_privilege then null;
end $$;

do $$ begin
  assert public.get_or_create_loyalty(null) ? 'referralCode', 'FAIL: loyalty RPC unavailable to customers';
end $$;

reset role;

-- ── authenticated: guest orders only visible to a verified email ───────
set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"victim.test@example.com"}';
do $$ begin
  assert (select count(*) from public.orders where order_ref = 'ATW-T-OK') = 0,
    'FAIL R18: unverified email can read guest orders';
end $$;
reset role;

update auth.users set email_confirmed_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000002';

set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000002","email":"victim.test@example.com"}';
do $$ begin
  assert (select count(*) from public.orders where order_ref = 'ATW-T-OK') = 1,
    'FAIL R18: verified email cannot read their guest order';
end $$;
reset role;

-- ── scheduler: live price + gen_random_uuid under search_path=public ───
set local role service_role;
update public.subscriptions set status = 'active' where product_id = 't-cooler';
do $$
declare r jsonb;
begin
  r := public.process_due_subscriptions(10);
  assert jsonb_array_length(r) = 1 and (r->0->>'skipped')::boolean = false,
    'FAIL R16/R19: scheduler did not create the order: ' || r::text;
  assert (r->0->>'total')::int = 2645, 'FAIL R16: scheduler used a non-catalogue price';
end $$;
reset role;


-- ── R22: least-privilege table grants ──────────────────────────────────
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  truncate public.products;
  raise exception 'FAIL R22: anon can truncate products';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update public.products set price = 1;
  raise exception 'FAIL R22: anon holds UPDATE on products';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  assert (select count(*) from public.products where id = 't-cooler') = 1,
    'FAIL R22: anon cannot read the catalogue';
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"alice.test@example.com"}';
do $$ begin
  insert into public.admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
  raise exception 'FAIL R22: customer can insert into admins';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  delete from public.subscriptions;
  raise exception 'FAIL R22: customer holds DELETE on subscriptions';
exception when insufficient_privilege then null;
end $$;
reset role;

-- ── R23/R24: referral bonus once; points reversed on cancellation ─────
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'referrer.test@example.com', now());
insert into public.loyalty_accounts (user_id, referral_code)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'REFTEST1');

set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001","email":"alice.test@example.com"}';
do $$ begin
  assert (public.get_or_create_loyalty('reftest1')->>'referred')::boolean,
    'FAIL R23: valid referral not attached';
end $$;
reset role;

set local role service_role;
do $$
declare r jsonb; o1 uuid; o2 uuid;
begin
  r := public.create_order('Alice','alice.test@example.com','','a','c','2000','','delivery',
    2645,0,2645,'ATW-T-L1','[{"productId":"t-cooler","quantity":1}]'::jsonb,false,
    'aaaaaaaa-0000-0000-0000-000000000001',null);
  o1 := (r->>'orderId')::uuid;
  r := public.create_order('Alice','alice.test@example.com','','a','c','2000','','delivery',
    2645,0,2645,'ATW-T-L2','[{"productId":"t-cooler","quantity":1}]'::jsonb,false,
    'aaaaaaaa-0000-0000-0000-000000000001',null);
  o2 := (r->>'orderId')::uuid;

  update public.orders set status = 'paid' where id = o1;
  update public.orders set status = 'shipped' where id = o1;
  update public.orders set status = 'paid' where id = o2;

  assert (select points from public.loyalty_accounts
          where user_id = 'aaaaaaaa-0000-0000-0000-000000000003') = 100,
    'FAIL R23: referral bonus awarded more than once';
  assert (select points from public.loyalty_accounts
          where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 528,
    'FAIL: purchase points not awarded (expected 264 x 2)';

  update public.orders set status = 'cancelled' where id = o2;
  assert (select points from public.loyalty_accounts
          where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 264,
    'FAIL R24: points kept after a paid order was cancelled';
end $$;
reset role;

-- A referral cannot be attached after a first purchase.
set local role authenticated;
set local request.jwt.claims =
  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000003","email":"referrer.test@example.com"}';
do $$ begin
  -- Referrer tries to claim Alice's code: a two-account loop.
  perform public.get_or_create_loyalty(
    (select referral_code from public.loyalty_accounts
     where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'));
end $$;
reset role;
do $$ begin
  assert (select referred_by from public.loyalty_accounts
          where user_id = 'aaaaaaaa-0000-0000-0000-000000000003') is null,
    'FAIL R23: mutual referral loop allowed';
end $$;

\echo 'security.sql: all checks passed'
rollback;
