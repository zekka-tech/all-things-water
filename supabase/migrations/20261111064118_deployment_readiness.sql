-- Keep scheduled HTTP requests within the current environment. Set the Vault
-- secret project_url to this project's https://<ref>.supabase.co URL.
-- Public catalogue reads exclude internal purchasing costs.
revoke select on public.products from anon, authenticated;
grant select (id, slug, name, tagline, description, category, price, unit,
  stock, reserved_stock, image, features, featured, volume_ml, visible,
  created_at, updated_at) on public.products to anon, authenticated;

create or replace function public.invoke_cron_function(fn text, secret_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  tok text;
  project_url text;
begin
  if (fn, secret_name) not in (
    ('subscriptions-run', 'subscription_cron_secret'),
    ('monitor', 'monitor_cron_secret'),
    ('back-in-stock-notify', 'back_in_stock_cron_secret')
  ) then
    raise exception 'Unknown scheduled function' using errcode = '22023';
  end if;
  select decrypted_secret into tok from vault.decrypted_secrets where name = secret_name;
  select rtrim(decrypted_secret, '/') into project_url from vault.decrypted_secrets where name = 'project_url';
  if project_url is null or project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$' then
    raise warning 'project_url missing or invalid; skipping scheduled function';
    return;
  end if;
  if tok is null or length(tok) < 16 then
    raise warning 'cron secret missing or too short; skipping scheduled function';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok),
    body := '{}'::jsonb, timeout_milliseconds := 30000
  );
end;
$$;

create or replace function public.drain_back_in_stock_waitlist()
returns void language plpgsql security definer set search_path = '' as $$
declare
  pid text;
begin
  -- The per-product sender validates destination and secret configuration.
  for pid in
    select distinct s.product_id
    from public.back_in_stock_subscriptions s
    join public.products p on p.id = s.product_id
    where not s.notified and p.visible and p.stock > p.reserved_stock
    order by s.product_id limit 50
  loop
    -- This endpoint requires a product id rather than the generic empty body.
    perform public.notify_stock_product(pid);
  end loop;
end;
$$;

create or replace function public.notify_stock_product(p_product_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  tok text;
  project_url text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'back_in_stock_cron_secret';
  select rtrim(decrypted_secret, '/') into project_url from vault.decrypted_secrets where name = 'project_url';
  if project_url is null or project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     or tok is null or length(tok) < 16 then
    raise warning 'waitlist scheduler configuration missing or invalid; skipping';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/back-in-stock-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok),
    body := jsonb_build_object('productId', p_product_id), timeout_milliseconds := 30000
  );
end;
$$;

-- One transaction for status, warehouse stock, status history and audit. The
-- order lock makes retries safe and prevents two dispatches of the same order.
create or replace function public.update_order_status(
  p_order_id uuid, p_status text, p_note text, p_performed_by text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  o public.orders%rowtype;
  r jsonb;
  item record;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return jsonb_build_object('error', 'Order not found', 'code', 404); end if;
  if o.status = p_status then
    return jsonb_build_object('changed', false, 'previousStatus', o.status, 'newStatus', p_status);
  end if;
  if not (
    (o.status = 'pending_payment' and p_status = 'cancelled') or
    (o.status = 'paid' and p_status in ('processing', 'shipped', 'cancelled')) or
    (o.status = 'processing' and p_status in ('shipped', 'cancelled')) or
    (o.status = 'shipped' and p_status = 'delivered')
  ) then
    return jsonb_build_object('error', 'Order status changed or transition is invalid', 'code', 409);
  end if;
  if o.status = 'pending_payment' then
    r := public.release_order_reservation(p_order_id, 'cancelled', p_note);
    if r ? 'error' then return r || jsonb_build_object('code', 409); end if;
  else
    update public.orders set status = p_status where id = p_order_id;
    if p_status = 'shipped' then
      perform public.dispatch_order_stock(p_order_id);
    elsif p_status = 'cancelled' then
      -- Paid stock has already left products.stock; unshipped cancellations
      -- put it back. Physical warehouse counts change only upon dispatch.
      for item in select product_id, quantity from public.order_items where order_id = p_order_id order by product_id loop
        update public.products set stock = stock + item.quantity where id = item.product_id;
      end loop;
    end if;
    insert into public.order_status_events(order_id, status, note) values (p_order_id, p_status, p_note);
  end if;
  insert into public.admin_audit_log(action, changes, performed_by)
    values ('order_status_updated', jsonb_build_object('orderId', p_order_id, 'orderRef', o.order_ref, 'from', o.status, 'to', p_status), p_performed_by);
  return jsonb_build_object('changed', true, 'previousStatus', o.status, 'newStatus', p_status);
end;
$$;

-- Only the authenticated admin Edge Function may call this RPC. A bad row
-- raises, rolling the whole batch back, including the server-derived audit.
create or replace function public.update_catalog(p_updates jsonb, p_performed_by text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  entry jsonb;
  original public.products%rowtype;
begin
  if jsonb_typeof(p_updates) is distinct from 'array' or jsonb_array_length(p_updates) > 200 then
    raise exception 'Invalid product updates' using errcode = '22023';
  end if;
  for entry in select value from jsonb_array_elements(p_updates) order by value->>'id' loop
    select * into original from public.products where id = entry->>'id' for update;
    if not found then raise exception 'Product not found' using errcode = '22023'; end if;
    if entry ? 'stock' and (entry->>'stock')::integer < original.reserved_stock then
      raise exception 'Stock cannot be lower than reserved stock' using errcode = '22023';
    end if;
    update public.products set
      name = coalesce(entry->>'name', name),
      price = coalesce((entry->>'price')::integer, price),
      cost = coalesce((entry->>'cost')::integer, cost),
      stock = coalesce((entry->>'stock')::integer, stock),
      visible = coalesce((entry->>'visible')::boolean, visible)
    where id = original.id;
    insert into public.admin_audit_log(action, product_id, product_name, changes, performed_by)
      values ('product_updated', original.id, original.name,
        jsonb_build_object('before', jsonb_build_object('name', original.name, 'price', original.price, 'cost', original.cost, 'stock', original.stock, 'visible', original.visible), 'after', entry - 'id'),
        p_performed_by);
  end loop;
end;
$$;

revoke all on function public.notify_stock_product(text) from public, anon, authenticated;
revoke all on function public.invoke_cron_function(text, text) from public, anon, authenticated;
revoke all on function public.drain_back_in_stock_waitlist() from public, anon, authenticated;
revoke all on function public.update_order_status(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.update_catalog(jsonb, text) from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, text, text, text) to service_role;
grant execute on function public.update_catalog(jsonb, text) to service_role;
