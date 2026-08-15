-- Notify the maintainer inbox whenever someone submits the homepage
-- "Request access" interest form (an insert into preview_requests). The
-- notification is advisory only: it fires after the row is durably
-- committed, never blocks or fails the insert, and never grants access on
-- its own (preview_requests already never grants accounts; see
-- 20260813090000_preview_requests.sql). pg_net's HTTP call is asynchronous
-- and best-effort, matching every other email send in this project
-- (see supabase/functions/_shared/mail.ts).
--
-- Deliberately no hardcoded project URL or credential in this file: both
-- the target Edge Function URL and the shared secret it checks are read
-- from Supabase Vault by name, set out-of-band with
-- `select vault.create_secret(value, name)`. A self-hosted fork that never
-- configures those two Vault entries gets a silent no-op instead of a
-- notification aimed at the wrong deployment (same principle as the
-- homepage form itself never falling back to a hardcoded project; see
-- src/homepage/PreviewForm.tsx).
create extension if not exists pg_net with schema extensions;

create or replace function private.notify_preview_request()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, vault, pg_catalog
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  select decrypted_secret into webhook_url
    from vault.decrypted_secrets
    where name = 'preview_request_webhook_url'
    limit 1;
  select decrypted_secret into webhook_secret
    from vault.decrypted_secrets
    where name = 'preview_request_webhook_secret'
    limit 1;

  -- Not configured for this deployment: skip rather than call an
  -- unconfigured or unauthenticated endpoint.
  if webhook_url is null or webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url => webhook_url,
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    body => jsonb_build_object(
      'email', new.email,
      'organization', new.organization,
      'use_case', new.use_case,
      'name', new.name,
      'source', new.source,
      'created_at', new.created_at
    )
  );
  return new;
end;
$$;

comment on function private.notify_preview_request() is
  'Fires the notify-preview-request Edge Function (best-effort email to the maintainer) after every accepted homepage interest-form insert.';

drop trigger if exists preview_requests_notify on public.preview_requests;
create trigger preview_requests_notify
  after insert on public.preview_requests
  for each row
  execute function private.notify_preview_request();
