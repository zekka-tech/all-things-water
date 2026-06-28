-- Shared-store (Postgres) rate limiting.
--
-- The Edge Function in-memory limiter is per-instance and best-effort; this RPC
-- provides an atomic, cross-instance limit on the money/abuse paths. Functions
-- keep the in-memory limiter as a cheap L1 (flood protection) and call this as
-- the authoritative L2. Service-role only.

create table if not exists public.rate_limits (
  bucket text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

create index if not exists idx_rate_limits_reset_at
  on public.rate_limits(reset_at);

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer default 10,
  p_window_seconds integer default 60
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limits (bucket, count, reset_at)
  values (p_key, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set
      count = case
        when public.rate_limits.reset_at <= v_now then 1
        else public.rate_limits.count + 1
      end,
      reset_at = case
        when public.rate_limits.reset_at <= v_now
          then v_now + make_interval(secs => p_window_seconds)
        else public.rate_limits.reset_at
      end
  returning count, reset_at into v_count, v_reset;

  if v_count > p_max then
    return jsonb_build_object(
      'allowed', false,
      'retryAfter', greatest(ceil(extract(epoch from (v_reset - v_now)))::int, 1)
    );
  end if;

  return jsonb_build_object('allowed', true, 'remaining', greatest(p_max - v_count, 0));
end;
$$;

-- Opportunistic cleanup of expired buckets (call from any scheduled job).
create or replace function public.prune_rate_limits(p_limit integer default 1000)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select bucket from public.rate_limits
    where reset_at <= now()
    limit greatest(coalesce(p_limit, 1000), 1)
  )
  delete from public.rate_limits r using doomed d where r.bucket = d.bucket;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.prune_rate_limits(integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.prune_rate_limits(integer) to service_role;
