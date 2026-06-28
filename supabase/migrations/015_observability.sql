-- Observability: SLO sampling + order-flow health signal.
--
-- Backs the `monitor` Edge Function (scheduled synthetic checks) and gives the
-- order/payment path a black-box health signal without instrumenting every
-- request. Service-role only.

create table if not exists public.slo_samples (
  id uuid primary key default uuid_generate_v4(),
  check_name text not null,
  ok boolean not null,
  latency_ms integer,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_slo_samples_check_created
  on public.slo_samples(check_name, created_at desc);

alter table public.slo_samples enable row level security;

create policy "Service role full access to slo_samples"
  on public.slo_samples for all to service_role using (true) with check (true);

-- Black-box health of the order/payment flow over a window.
--   createdLastWindow  — orders created in the window
--   paidLastWindow     — orders that became paid in the window
--   pendingTotal       — orders currently awaiting payment
--   pendingStuck       — pending-payment orders older than 1h (proxy for a
--                        stalled ITN callback or a non-running expiry sweep)
create or replace function public.order_flow_health(p_window_minutes integer default 60)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'createdLastWindow',
      (select count(*) from public.orders
        where created_at >= now() - make_interval(mins => p_window_minutes)),
    'paidLastWindow',
      (select count(*) from public.orders
        where status = 'paid'
          and updated_at >= now() - make_interval(mins => p_window_minutes)),
    'pendingTotal',
      (select count(*) from public.orders where status = 'pending_payment'),
    'pendingStuck',
      (select count(*) from public.orders
        where status = 'pending_payment' and created_at < now() - interval '1 hour')
  );
$$;

create or replace function public.prune_slo_samples(p_older_than_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.slo_samples
  where created_at < now() - make_interval(days => greatest(coalesce(p_older_than_days, 30), 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.order_flow_health(integer) from public, anon, authenticated;
revoke execute on function public.prune_slo_samples(integer) from public, anon, authenticated;
grant execute on function public.order_flow_health(integer) to service_role;
grant execute on function public.prune_slo_samples(integer) to service_role;
