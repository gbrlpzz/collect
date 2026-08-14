-- Edge functions need to resolve an email to a user id, but the auth schema
-- is not exposed to PostgREST. This security-definer RPC (service role only)
-- is the supported bridge — never call from("auth.users") from a function.
create or replace function public.resolve_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id
    from auth.users
   where lower(email) = lower(p_email)
   limit 1;
$$;

revoke all on function public.resolve_user_id_by_email(text)
  from public, anon, authenticated;
grant execute on function public.resolve_user_id_by_email(text)
  to service_role;
