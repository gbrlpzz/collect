-- Contributor sign-in codes: the admin-minted, email-delivered alternative to
-- magic links. Codes share the device-link bridge table (sha256-hashed,
-- single-use, short TTL) and add two controls:
--   1. an attempt cap so a guessed code cannot be brute-forced inside its
--      short window (10 failed tries invalidate the code), and
--   2. a mint throttle so a self-service request cannot flood one address
--      with codes (3 per 20 minutes per user).

alter table private.session_link_codes
  add column if not exists attempts integer not null default 0;

create or replace function public.consume_session_link_code(p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if length(p_code_hash) <> 64 then
    return null;
  end if;
  update private.session_link_codes
  set used_at = now()
  where code = p_code_hash
    and used_at is null
    and expires_at > now()
    and attempts < 10
  returning user_id into owner_id;
  return owner_id;
end;
$$;

create or replace function public.bump_session_link_attempt(p_code_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(p_code_hash) <> 64 then
    return;
  end if;
  update private.session_link_codes
  set attempts = attempts + 1
  where code = p_code_hash
    and used_at is null
    and expires_at > now();
end;
$$;

create or replace function public.count_recent_session_link_codes(
  p_user_id uuid,
  p_window_minutes integer default 20
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent bigint;
begin
  select count(*)
    into recent
    from private.session_link_codes
    where user_id = p_user_id
      and created_at > now() - make_interval(mins => p_window_minutes);
  return recent;
end;
$$;

revoke all on function public.bump_session_link_attempt(text)
  from public, anon, authenticated;
revoke all on function public.count_recent_session_link_codes(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.bump_session_link_attempt(text)
  to service_role;
grant execute on function public.count_recent_session_link_codes(uuid, integer)
  to service_role;
