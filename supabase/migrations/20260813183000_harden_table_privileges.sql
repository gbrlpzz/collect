-- Harden table privileges: Supabase's default privileges grant ALL (including
-- TRUNCATE, which bypasses RLS) on every table to anon and authenticated.
-- Verified against production: an anonymous request could TRUNCATE
-- submissions/audit_events (table wipe) and had SELECT/DELETE everywhere
-- (row access was still gated by RLS, but table-level TRUNCATE was not).
--
-- 1. anon keeps exactly one table privilege in the whole schema: INSERT on
--    preview_requests (the public homepage interest form).
-- 2. authenticated keeps its row-level DML but loses table-level TRUNCATE,
--    REFERENCES, TRIGGER, MAINTAIN on every table.
-- 3. Default privileges stop re-granting the dangerous set to future objects.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
grant insert on public.preview_requests to anon;

revoke truncate, references, trigger, maintain on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;
revoke all on all functions in schema public from authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- The homepage interest form is public by design, but one row per address
-- (with a 24-hour re-request window) keeps the queue clean. The check runs
-- security definer so RLS on the table cannot hide earlier rows from it.
create or replace function private.preview_request_allowed(p_email text)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select p_email is not null
    and char_length(p_email) between 3 and 320
    and not exists (
      select 1 from public.preview_requests prior
      where lower(prior.email) = lower(p_email)
        and prior.created_at > now() - interval '24 hours'
    );
$$;

create unique index if not exists preview_requests_email_unique
  on public.preview_requests (lower(email));

drop policy if exists "preview_requests_insert_anon" on public.preview_requests;
create policy "preview_requests_insert_anon" on public.preview_requests
  for insert to anon, authenticated
  with check (private.preview_request_allowed(email));
