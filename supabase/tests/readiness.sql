-- Behavioural regressions for transactional admin writes and environment isolation.
begin;
insert into public.products(id, slug, name, tagline, description, category, price, unit, stock, image)
values ('ready-product', 'ready-product', 'Original', 't', 'd', 'accessories', 100, 'each', 20, '/x');

set local role anon;
do $$ begin
  perform cost from public.products;
  raise exception 'Internal purchasing costs exposed to anonymous clients';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.update_catalog('[]', 'attacker');
  raise exception 'Anonymous catalogue mutation allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.update_order_status(gen_random_uuid(), 'shipped', null, 'attacker');
  raise exception 'Anonymous status mutation allowed';
exception when insufficient_privilege then null;
end $$;
reset role;

set local role service_role;
do $$ begin
  perform public.update_catalog('[{"id":"ready-product","price":120,"name":"Updated","visible":false}]', 'admin-test');
  assert (select price = 120 and name = 'Updated' and not visible from public.products where id = 'ready-product'),
    'Catalogue changes were not persisted';
  assert (select count(*) from public.admin_audit_log where product_id = 'ready-product') = 1,
    'Catalogue save did not produce server audit';
  begin
    perform public.update_catalog('[{"id":"ready-product","price":200},{"id":"zz-missing","stock":5}]', 'admin-test');
    raise exception 'Missing product did not abort the batch';
  exception when invalid_parameter_value then null;
  end;
  assert (select price from public.products where id = 'ready-product') = 120, 'Partial batch committed';
  assert (select count(*) from public.admin_audit_log where product_id = 'ready-product') = 1, 'Failed batch left audit rows';
  update public.products set reserved_stock = 2 where id = 'ready-product';
  begin
    perform public.update_catalog('[{"id":"ready-product","stock":1}]', 'admin-test');
    raise exception 'Reserved inventory could be overwritten';
  exception when invalid_parameter_value then null;
  end;
  update public.products set reserved_stock = 0, visible = true where id = 'ready-product';
end $$;

do $$
declare r jsonb; oid uuid; wh uuid;
begin
  select id into wh from public.warehouses where code = 'JHB';
  insert into public.product_warehouse_stock(product_id, warehouse_id, on_hand) values ('ready-product', wh, 20);
  r := public.create_order('Customer', 'ready@example.com', '', '', '', '', '', 'collection',
    240, 0, 240, 'READY-SHIP', '[{"productId":"ready-product","quantity":2}]', false);
  oid := (r->>'orderId')::uuid;
  assert oid is not null, 'Could not create order';
  update public.orders set fulfillment_warehouse_id = wh where id = oid;
  perform public.mark_order_paid(oid, 'ready-payment', 'test');
  r := public.update_order_status(oid, 'shipped', 'test', 'admin-test');
  assert (r->>'changed')::boolean, 'Shipping did not change order';
  perform public.update_order_status(oid, 'shipped', 'retry', 'admin-test');
  assert (select on_hand from public.product_warehouse_stock where product_id = 'ready-product' and warehouse_id = wh) = 18,
    'Retry dispatched warehouse stock twice';
  assert (select count(*) from public.order_status_events where order_id = oid and status = 'shipped') = 1, 'Duplicate status history';
  assert (select count(*) from public.admin_audit_log where action = 'order_status_updated' and changes->>'orderId' = oid::text) = 1,
    'Duplicate admin audit';
  r := public.update_order_status(oid, 'processing', null, 'admin-test');
  assert (r->>'code')::integer = 409, 'Backward transition allowed';

  r := public.create_order('Customer', 'ready@example.com', '', '', '', '', '', 'collection',
    120, 0, 120, 'READY-CANCEL', '[{"productId":"ready-product","quantity":1}]', false);
  oid := (r->>'orderId')::uuid;
  perform public.mark_order_paid(oid, 'ready-cancel-payment', 'test');
  assert (select stock from public.products where id = 'ready-product') = 17, 'Payment did not consume stock';
  perform public.update_order_status(oid, 'cancelled', 'test', 'admin-test');
  perform public.update_order_status(oid, 'cancelled', 'retry', 'admin-test');
  assert (select stock from public.products where id = 'ready-product') = 18, 'Cancellation did not restore stock exactly once';
end $$;
reset role;

-- Inject a warehouse failure and prove status + audit do not commit first.
create function public.test_reject_dispatch() returns trigger language plpgsql as $$
begin raise exception 'simulated dispatch failure'; end;
$$;
create trigger reject_dispatch before update on public.product_warehouse_stock for each row execute function public.test_reject_dispatch();
set local role service_role;
do $$
declare r jsonb; oid uuid;
begin
  r := public.create_order('Customer', 'ready@example.com', '', '', '', '', '', 'collection',
    120, 0, 120, 'READY-ROLLBACK', '[{"productId":"ready-product","quantity":1}]', false);
  oid := (r->>'orderId')::uuid;
  update public.orders set fulfillment_warehouse_id = (select id from public.warehouses where code = 'JHB') where id = oid;
  perform public.mark_order_paid(oid, 'ready-rollback-payment', 'test');
  begin
    perform public.update_order_status(oid, 'shipped', null, 'admin-test');
    raise exception 'Expected dispatch failure';
  exception when raise_exception then
    if sqlerrm <> 'simulated dispatch failure' then raise; end if;
  end;
  assert (select status from public.orders where id = oid) = 'paid', 'Failed dispatch left order shipped';
  assert not exists(select 1 from public.order_status_events where order_id = oid and status = 'shipped'), 'Failed dispatch left history';
end $$;
reset role;

do $$ begin
  perform vault.create_secret('https://isolated-staging.supabase.co', 'project_url');
  perform vault.create_secret('monitor-test-secret-0123456789', 'monitor_cron_secret');
  delete from net.http_request_queue;
  perform public.invoke_cron_function('monitor', 'monitor_cron_secret');
  assert (select url from net.http_request_queue limit 1) = 'https://isolated-staging.supabase.co/functions/v1/monitor',
    'Scheduler crossed environments';
  delete from net.http_request_queue;
  delete from vault.secrets where name = 'project_url';
  perform public.invoke_cron_function('monitor', 'monitor_cron_secret');
  assert not exists(select 1 from net.http_request_queue), 'Unconfigured scheduler used a fallback project';
end $$;

\echo 'readiness.sql: all checks passed'
rollback;
