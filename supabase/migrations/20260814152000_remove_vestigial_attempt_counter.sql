-- Remove the per-code failed-attempt counter. It could never fire: the
-- counter is keyed by the SHA-256 of the code, so incrementing a failed try
-- requires submitting the exact code — which is precisely the case that
-- consumes the code successfully. A wrong guess never matches any row.
-- The effective brute-force control is the per-IP budget enforced by the
-- sign-in-code request and exchange endpoints (see _shared/rateLimit.ts).

alter table private.session_link_codes
  drop column if exists attempts;

drop function if exists public.bump_session_link_attempt(text);

-- The consume guard no longer needs the inert attempts < 10 predicate.
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
  returning user_id into owner_id;
  return owner_id;
end;
$$;

revoke all on function public.consume_session_link_code(text)
  from public, anon, authenticated;
grant execute on function public.consume_session_link_code(text)
  to service_role;
