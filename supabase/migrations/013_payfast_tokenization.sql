-- PayFast tokenized auto-billing for subscriptions.
--
-- Model: a subscription can opt into auto-pay. The first due charge is a normal
-- (tokenizing) PayFast checkout the customer pays once; PayFast returns a card
-- token on the ITN which we store here. Every subsequent due charge is billed
-- server-to-server via the PayFast ad-hoc API using that token — no customer
-- action. Tokens are sensitive: this table is service-role only (no client RLS).

create table if not exists public.payment_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  last_four text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_tokens_user_active
  on public.payment_tokens(user_id) where active;

alter table public.payment_tokens enable row level security;

-- Service role only. No anon/authenticated policy — tokens never reach the browser.
create policy "Service role full access to payment_tokens"
  on public.payment_tokens for all
  to service_role using (true) with check (true);

-- Opt-in flag on subscriptions.
alter table public.subscriptions
  add column if not exists auto_pay boolean not null default false;

-- Store a newly tokenized card for a user (deactivates any prior token).
create or replace function public.store_payment_token(
  p_user_id uuid,
  p_token text,
  p_last_four text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or coalesce(p_token, '') = '' then
    return;
  end if;
  update public.payment_tokens set active = false
    where user_id = p_user_id and active;
  insert into public.payment_tokens (user_id, token, last_four)
    values (p_user_id, p_token, p_last_four);
end;
$$;

-- Redefine the due-subscription processor to also surface auto_pay + user_id so
-- the scheduler can decide between an ad-hoc charge and a tokenizing pay link.
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

revoke execute on function public.store_payment_token(uuid, text, text) from public, anon, authenticated;
grant execute on function public.store_payment_token(uuid, text, text) to service_role;
grant execute on function public.process_due_subscriptions(integer) to service_role;
