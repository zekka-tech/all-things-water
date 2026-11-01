-- Storage for the two public forms that had no backend at all.
--
-- The Contact page posts to VITE_CONTACT_FORM_ENDPOINT and the footer to
-- VITE_NEWSLETTER_ENDPOINT, but neither variable was set and neither Edge
-- Function existed, so both forms told visitors they were "currently
-- unavailable". These tables back the new `contact` and `newsletter`
-- functions.
--
-- Same shape as business_quotes (migration 010): RLS on, service-role-only,
-- no anon/authenticated policy. All writes are mediated server-side by the
-- Edge Functions, which apply Turnstile and rate limiting first.

create table if not exists public.contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_status
  on public.contact_messages(status);
create index if not exists idx_contact_messages_created
  on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

create policy "Service role full access to contact_messages"
  on public.contact_messages for all
  to service_role
  using (true) with check (true);

create trigger set_updated_at_contact_messages before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- Newsletter: email is unique so a repeat sign-up is idempotent rather than an
-- error, and re-subscribing after unsubscribing reuses the row.
create table if not exists public.newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_newsletter_status
  on public.newsletter_subscribers(status);

alter table public.newsletter_subscribers enable row level security;

create policy "Service role full access to newsletter_subscribers"
  on public.newsletter_subscribers for all
  to service_role
  using (true) with check (true);

create trigger set_updated_at_newsletter_subscribers before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- Migration 017 made table grants least-privilege, so a new table has no
-- client access until granted. Nothing is granted here on purpose: both tables
-- are service-role only, and supabase/tests/security.sql asserts that.
