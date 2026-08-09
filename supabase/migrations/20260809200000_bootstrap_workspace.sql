-- Make first-workspace creation explicit and race-safe.
-- The browser cannot call this function directly because it is executable only
-- by the service role used inside the authenticated bootstrap Edge Function.

create or replace function public.bootstrap_organization(target_name text, target_user uuid)
returns table(organization_id uuid, organization_name text)
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  new_id uuid;
begin
  -- Only one empty-database bootstrap can win, even if two people submit at
  -- the same time during an initial deployment.
  perform pg_advisory_xact_lock(hashtext('collect.bootstrap_workspace'));

  if exists (select 1 from public.organizations) then
    raise exception 'A workspace already exists';
  end if;

  insert into public.organizations (name, created_by)
  values (trim(target_name), target_user)
  returning id into new_id;

  return query
  select id, name
  from public.organizations
  where id = new_id;
end;
$$;

revoke all on function public.bootstrap_organization(text, uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_organization(text, uuid) to service_role;
