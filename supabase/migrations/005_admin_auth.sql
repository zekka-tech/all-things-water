-- Real server-side admin authorization.
--
-- Replaces the previous shared-password scheme (which was baked into the client
-- bundle and therefore public) with Supabase Auth + a server-controlled allowlist.
--
-- Setup (run once, after applying this migration):
--   1. Create the admin user in Supabase Auth (Dashboard → Authentication → Users
--      → "Add user", or via the Admin API). Disable public sign-ups in
--      Authentication → Providers so only invited users exist.
--   2. Grant them admin rights:
--        insert into public.admins (user_id, email)
--        select id, email from auth.users where email = 'admin@allthingswater.co.za';

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- An authenticated user may read ONLY their own admin row. This lets the client
-- confirm "am I an admin?" after login without exposing the full allowlist.
-- All writes happen out-of-band (service role / SQL), never from the client.
create policy "Users can read their own admin row" on public.admins
  for select using (auth.uid() = user_id);

-- Track who performed each audited change.
alter table public.admin_audit_log
  add column if not exists performed_by text;
