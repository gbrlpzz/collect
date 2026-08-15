-- Administrator rights follow the allow-list.
--
-- Contributor accounts are open: anyone may sign in (with a provider, a link,
-- or a code) and sees nothing until a project is assigned. Administrator
-- rights are different — they are granted at sign-in only to an address the
-- deployment has explicitly allow-listed. Inviting an administrator therefore
-- means adding the address to that list, which only the service role may do.

create or replace function public.add_allowed_admin_pattern(
  p_pattern text,
  p_keep_pattern text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised text := lower(trim(p_pattern));
  keep text := lower(trim(coalesce(p_keep_pattern, '')));
begin
  if normalised is null or position('@' in normalised) = 0 then
    raise exception 'An email address or @domain suffix is required';
  end if;
  -- The first entry closes an open deployment. Keep the administrator who is
  -- issuing the invitation on the list, so nobody locks themselves out.
  if keep <> '' and position('@' in keep) > 0
     and not exists (select 1 from private.allowed_admin_patterns) then
    insert into private.allowed_admin_patterns (pattern)
    values (keep)
    on conflict (pattern) do nothing;
  end if;
  insert into private.allowed_admin_patterns (pattern)
  values (normalised)
  on conflict (pattern) do nothing;
end;
$$;

revoke all on function public.add_allowed_admin_pattern(text, text)
  from public, anon, authenticated;
grant execute on function public.add_allowed_admin_pattern(text, text)
  to service_role;
