drop policy if exists "Anon can view own order by ref" on public.orders;

drop policy if exists "Service role can manage audit log" on public.admin_audit_log;
create policy "Service role can manage audit log" on public.admin_audit_log
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.admin_audit_log from anon, authenticated;

revoke execute on function public.create_order(
  text, text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, boolean
) from public, anon, authenticated;

grant execute on function public.create_order(
  text, text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, boolean
) to service_role;

alter function public.create_order(
  text, text, text, text, text, text, text, text, integer, integer, integer, text, jsonb, boolean
) set search_path = public;
