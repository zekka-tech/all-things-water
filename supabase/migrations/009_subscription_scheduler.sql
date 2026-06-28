-- Subscription scheduler (standing orders).
--
-- PCI-safe "standing order with one-click pay" model: we never store card
-- tokens. When a subscription is due, this RPC creates a pending order via the
-- existing create_order RPC (which reserves inventory). The subscriptions-run
-- Edge Function then emails the customer a signed PayFast pay link so they can
-- pay with one click — exactly the flow PayFast expects.

-- ────────────────────────────────────────────────────────────────────
-- process_due_subscriptions
--
-- Selects active subscriptions due today (or overdue), creates one pending
-- order per subscription, advances next_delivery_date to a strictly-future
-- date based on the frequency, and returns a jsonb array summarising each
-- created (or skipped) subscription. Safe to re-run: advancing the delivery
-- date makes a second run on the same day a no-op for already-processed rows,
-- and `for update skip locked` prevents two concurrent runs double-processing.
-- ────────────────────────────────────────────────────────────────────
create or replace function public.process_due_subscriptions(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_subtotal integer;
  v_delivery_fee integer;
  v_total integer;
  v_order_ref text;
  v_items jsonb;
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
    limit greatest(coalesce(p_limit, 50), 1)
    for update skip locked
  loop
    -- Mirror the orders Edge Function pricing: free delivery >= R500 else R75.
    v_subtotal := v_sub.unit_price * v_sub.quantity;
    v_delivery_fee := case when v_subtotal >= 500 then 0 else 75 end;
    v_total := v_subtotal + v_delivery_fee;
    v_order_ref := 'ATW-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 6));
    v_items := jsonb_build_array(jsonb_build_object(
      'productId', v_sub.product_id,
      'quantity', v_sub.quantity,
      'price', v_sub.unit_price,
      'name', v_sub.product_name
    ));

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
      v_items,
      false,
      v_sub.user_id,
      null
    );

    -- create_order returns an `error` key on insufficient stock / missing
    -- product. Record it as skipped and leave next_delivery_date untouched so
    -- the next run retries once inventory is replenished. Never crash the loop.
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

    -- Advance to the next strictly-future delivery date. Looping guards against
    -- a missed cron run leaving the subscription perpetually "due".
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
        updated_at = now()
    where id = v_sub.id;

    v_summary := v_summary || jsonb_build_object(
      'subscriptionId', v_sub.id,
      'orderId', v_result->>'orderId',
      'orderRef', v_result->>'orderRef',
      'email', v_sub.customer_email,
      'total', v_total,
      'nextDeliveryDate', v_next,
      'skipped', false
    );
  end loop;

  return v_summary;
end;
$$;

-- Scheduler is service-role only — never callable from the browser.
revoke execute on function public.process_due_subscriptions(integer) from public, anon, authenticated;
grant execute on function public.process_due_subscriptions(integer) to service_role;
