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
  p_whatsapp_optin boolean
) returns jsonb
language plpgsql
security definer
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
  -- Validate items array
  if jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('error', 'No items in order');
  end if;

  -- Check stock for all items first (pessimistic lock)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;

    if v_product_id is null or v_quantity is null or v_quantity <= 0 then
      return jsonb_build_object('error', 'Invalid item', 'productId', v_product_id);
    end if;

    select stock, name, price into v_stock, v_name, v_price
    from public.products
    where id = v_product_id and visible = true;

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

  -- Create the order
  insert into public.orders (
    order_ref, customer_name, customer_email, customer_phone,
    delivery_address, delivery_city, delivery_postal_code,
    delivery_notes, delivery_method, subtotal, delivery_fee, total,
    status, whatsapp_optin
  ) values (
    p_order_ref, p_customer_name, p_customer_email, p_customer_phone,
    p_delivery_address, p_delivery_city, p_delivery_postal_code,
    p_delivery_notes, p_delivery_method, p_subtotal, p_delivery_fee, p_total,
    'pending_payment', p_whatsapp_optin
  )
  returning id into v_order_id;

  -- Insert order items and decrement stock
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

  -- Insert status event
  insert into public.order_status_events (order_id, status, note)
  values (v_order_id, 'pending_payment', 'Order created');

  return jsonb_build_object('orderId', v_order_id, 'orderRef', p_order_ref);
end;
$$;
