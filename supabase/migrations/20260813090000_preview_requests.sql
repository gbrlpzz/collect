-- Research-preview interest form for the collect homepage (2026-08-13).
-- The public landing page submits interest + use case. Access stays
-- invite-only: this table only records requests, it never grants accounts.
create table if not exists public.preview_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null check (char_length(email) between 3 and 320),
  organization text,
  use_case text not null check (char_length(use_case) between 10 and 4000),
  source text not null default 'homepage' check (char_length(source) <= 64)
);

alter table public.preview_requests enable row level security;

-- The form is public by design: anyone may request a preview.
-- Read/update/delete stay locked to the table owner (service role).
create policy "preview_requests_insert_anon" on public.preview_requests
  for insert to anon, authenticated
  with check (true);

comment on table public.preview_requests is
  'Interest requests from the public homepage; never grants accounts (invite-only).';
