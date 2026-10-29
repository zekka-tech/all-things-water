-- Scheduled invocation of the three Edge Functions that expect a cron caller:
--   subscriptions-run      daily      (recurring orders)
--   monitor                every 10m  (SLO check)
--   back-in-stock-notify   every 30m  (waitlist drain)
--
-- Each function authenticates the caller with `Authorization: Bearer <secret>`
-- and rejects secrets shorter than 16 characters. The secrets live in Vault and
-- are read by name at call time, so this file carries no credentials and is
-- safe to commit. Insert them once per environment, out of band:
--
--   select vault.create_secret('<value>', 'subscription_cron_secret');
--   select vault.create_secret('<value>', 'monitor_cron_secret');
--   select vault.create_secret('<value>', 'back_in_stock_cron_secret');
--
-- The values must match SUBSCRIPTION_CRON_SECRET / MONITOR_CRON_SECRET /
-- BACK_IN_STOCK_CRON_SECRET in the Edge Function secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Neither scheduler nor HTTP client belongs on the client API surface
-- (migrations 016/017 keep anon/authenticated least-privilege by default).
revoke all on schema cron from anon, authenticated;
revoke all on schema net from anon, authenticated;

-- security definer so the job can read Vault; the client roles cannot call it,
-- and `fn` is never interpolated from user input — only from the fixed schedule
-- definitions below.
create or replace function public.invoke_cron_function(fn text, secret_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok text;
begin
  select decrypted_secret into tok
    from vault.decrypted_secrets
    where name = secret_name;

  -- Missing secret must not abort the job run or leak the name upward.
  if tok is null or length(tok) < 16 then
    raise warning 'cron secret % missing or too short; skipping %', secret_name, fn;
    return;
  end if;

  perform net.http_post(
    url := 'https://csrqtidbliacfhklnbad.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || tok
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke all on function public.invoke_cron_function(text, text) from public, anon, authenticated;

-- Re-running the migration must not stack duplicate jobs.
select cron.unschedule(jobname)
  from cron.job
  where jobname in ('subscriptions-run-daily', 'monitor-slo', 'back-in-stock-notify');

-- 02:15 UTC = 04:15 SAST, outside trading hours.
select cron.schedule('subscriptions-run-daily', '15 2 * * *',
  $$select public.invoke_cron_function('subscriptions-run', 'subscription_cron_secret')$$);

select cron.schedule('monitor-slo', '*/10 * * * *',
  $$select public.invoke_cron_function('monitor', 'monitor_cron_secret')$$);

select cron.schedule('back-in-stock-notify', '*/30 * * * *',
  $$select public.invoke_cron_function('back-in-stock-notify', 'back_in_stock_cron_secret')$$);
