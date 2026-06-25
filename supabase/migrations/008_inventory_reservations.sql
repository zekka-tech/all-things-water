alter table public.products
  add column if not exists reserved_stock integer not null default 0 check (reserved_stock >= 0);

alter table public.orders
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists checkout_token uuid not null default uuid_generate_v4();

create unique index if not exists idx_orders_checkout_token
  on public.orders(checkout_token);

update public.orders
set reservation_expires_at = created_at + interval '30 minutes'
where status = 'pending_payment'
  and reservation_expires_at is null;

create or replace function public.release_order_reservation(
  p_order_id uuid,
  p_target_status text default 'cancelled',
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_note text;
begin
  if p_target_status not in ('cancelled', 'expired') then
    return jsonb_build_object('error', 'Invalid target status');
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Order not found');
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('error', 'Order already paid', 'status', v_order.status);
  end if;

  if v_order.status = p_target_status then
    return jsonb_build_object('released', false, 'status', v_order.status);
  end if;

  if v_order.status <> 'pending_payment' then
    return jsonb_build_object('error', 'Order cannot be released', 'status', v_order.status);
  end if;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.products
    set reserved_stock = greatest(reserved_stock - v_item.quantity, 0)
    where id = v_item.product_id;
  end loop;

  update public.orders
  set
    status = p_target_status,
    reservation_expires_at = null,
    updated_at = now()
  where id = p_order_id;

  v_note := coalesce(
    p_note,
    case
      when p_target_status = 'expired' then 'Payment window expired; inventory released'
      else 'Payment cancelled; inventory released'
    end
  );

  insert into public.order_status_events (order_id, status, note)
  values (p_order_id, p_target_status, v_note);

  return jsonb_build_object('released', true, 'status', p_target_status);
end;
$$;

create or replace function public.expire_pending_order_reservations(
  p_limit integer default 50
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_count integer := 0;
begin
  for v_order_id in
    select id
    from public.orders
    where status = 'pending_payment'
      and reservation_expires_at is not null
      and reservation_expires_at <= now()
    order by reservation_expires_at asc
    limit greatest(coalesce(p_limit, 50), 1)
    for update skip locked
  loop
    perform public.release_order_reservation(
      v_order_id,
      'expired',
      'Payment window expired; inventory released'
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_payfast_payment_id text,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_note text;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Order not found');
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('alreadyPaid', true, 'status', v_order.status);
  end if;

  if v_order.status <> 'pending_payment' then
    return jsonb_build_object('error', 'Order cannot be marked paid', 'status', v_order.status);
  end if;

  for v_item in
    select
      oi.product_id,
      oi.quantity,
      p.stock,
      p.reserved_stock
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
    for update of p
  loop
    if v_item.reserved_stock < v_item.quantity then
      return jsonb_build_object(
        'error', 'Reservation mismatch',
        'productId', v_item.product_id,
        'reserved', v_item.reserved_stock,
        'required', v_item.quantity
      );
    end if;

    if v_item.stock < v_item.quantity then
      return jsonb_build_object(
        'error', 'Insufficient stock to capture reservation',
        'productId', v_item.product_id,
        'available', v_item.stock,
        'required', v_item.quantity
      );
    end if;
  end loop;

  for v_item in
    select product_id, quantity
    from public.order_items
    where order_id = p_order_id
  loop
    update public.products
    set
      stock = stock - v_item.quantity,
      reserved_stock = reserved_stock - v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders
  set
    status = 'paid',
    payfast_payment_id = p_payfast_payment_id,
    reservation_expires_at = null,
    updated_at = now()
  where id = p_order_id;

  v_note := coalesce(
    p_note,
    case
      when coalesce(p_payfast_payment_id, '') <> ''
        then format('Payment confirmed via PayFast (%s)', p_payfast_payment_id)
      else 'Payment confirmed'
    end
  );

  insert into public.order_status_events (order_id, status, note)
  values (p_order_id, 'paid', v_note);

  return jsonb_build_object('orderId', p_order_id, 'status', 'paid');
end;
$$;

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
  v_reservation_expires_at timestamptz := now() + interval '30 minutes';
begin
  perform public.expire_pending_order_reservations(100);

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
  end loop;

  insert into public.orders (
    order_ref,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    delivery_city,
    delivery_postal_code,
    delivery_notes,
    delivery_method,
    subtotal,
    delivery_fee,
    total,
    status,
    whatsapp_optin,
    user_id,
    delivery_slot,
    reservation_expires_at
  ) values (
    p_order_ref,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_delivery_address,
    p_delivery_city,
    p_delivery_postal_code,
    p_delivery_notes,
    p_delivery_method,
    p_subtotal,
    p_delivery_fee,
    p_total,
    'pending_payment',
    p_whatsapp_optin,
    p_user_id,
    p_delivery_slot,
    v_reservation_expires_at
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::integer;
    v_name := (v_item->>'name')::text;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_price,
      quantity,
      line_total
    )
    values (v_order_id, v_product_id, v_name, v_price, v_quantity, v_price * v_quantity);

    update public.products
    set reserved_stock = reserved_stock + v_quantity
    where id = v_product_id;
  end loop;

  insert into public.order_status_events (order_id, status, note)
  values (
    v_order_id,
    'pending_payment',
    format('Order created; inventory reserved until %s', to_char(v_reservation_expires_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS UTC'))
  );

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderRef', p_order_ref,
    'reservationExpiresAt', v_reservation_expires_at
  );
end;
$$;

revoke execute on function public.release_order_reservation(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.expire_pending_order_reservations(integer) from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text, text) from public, anon, authenticated;

grant execute on function public.release_order_reservation(uuid, text, text) to service_role;
grant execute on function public.expire_pending_order_reservations(integer) to service_role;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;
grant execute on function public.create_order(
  text, text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, boolean, uuid, text
) to service_role;
