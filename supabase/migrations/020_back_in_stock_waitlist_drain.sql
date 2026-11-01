-- Fix the back-in-stock cron job scheduled by migration 019.
--
-- 019 scheduled `back-in-stock-notify` the same way as `monitor` and
-- `subscriptions-run`: a single POST with an empty `{}` body. That is correct
-- for those two, which are sweep endpoints, but back-in-stock-notify is a
-- *per-product* endpoint — it requires `{"productId": "..."}` and answers a
-- bodyless call with `400 productId is required`. The job therefore failed on
-- every run and the waitlist was never drained (nothing else in the codebase
-- calls that function either).
--
-- The fan-out has to happen somewhere, so it happens here: find the products a
-- waiting customer could now actually buy, and call the function once per
-- product. The function still owns the email sending and the `notified`
-- bookkeeping; this only decides which products are due.

-- security definer to read Vault, like invoke_cron_function. search_path is
-- empty so every reference below is schema-qualified.
create or replace function public.drain_back_in_stock_waitlist()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok text;
  pid text;
  queued int := 0;
begin
  select decrypted_secret into tok
    from vault.decrypted_secrets
    where name = 'back_in_stock_cron_secret';

  -- Same contract as invoke_cron_function: warn and skip, never abort the run.
  if tok is null or length(tok) < 16 then
    raise warning 'cron secret back_in_stock_cron_secret missing or too short; skipping waitlist drain';
    return;
  end if;

  -- Only products that are visible and have uncommitted stock available, and
  -- that someone is still waiting on. Mirrors the eligibility checks the Edge
  -- Function re-applies per product, so we do not queue calls it will reject.
  -- The partial index on (product_id) where notified = false serves this.
  for pid in
    select distinct s.product_id
      from public.back_in_stock_subscriptions s
      join public.products p on p.id = s.product_id
     where s.notified = false
       and p.visible
       and p.stock - p.reserved_stock > 0
     order by s.product_id
     limit 50
  loop
    perform net.http_post(
      url := 'https://csrqtidbliacfhklnbad.supabase.co/functions/v1/back-in-stock-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || tok
      ),
      body := jsonb_build_object('productId', pid),
      timeout_milliseconds := 30000
    );
    queued := queued + 1;
  end loop;

  -- `limit 50` caps how many requests one run can queue into pg_net; the
  -- function itself caps emails at 500 per product per call. A deeper backlog
  -- drains over subsequent runs rather than flooding the queue at once.
  if queued > 0 then
    raise log 'back-in-stock waitlist drain queued % product(s)', queued;
  end if;
end;
$$;

-- Least-privilege by default (migrations 016/017): the client roles must not be
-- able to trigger email sends. Covered by supabase/tests/security.sql.
revoke all on function public.drain_back_in_stock_waitlist() from public, anon, authenticated;

-- Re-point the job. Idempotent: unschedule only if present, as in 019.
select cron.unschedule(jobname)
  from cron.job
  where jobname = 'back-in-stock-notify';

select cron.schedule('back-in-stock-notify', '*/30 * * * *',
  $$select public.drain_back_in_stock_waitlist()$$);
