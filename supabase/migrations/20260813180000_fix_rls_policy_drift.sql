-- Fix two RLS policies whose unqualified column correlations resolved to
-- the wrong (inner) table, silently changing their meaning:
--
-- 1. project_schemas_select_visible checked pm.project_id = project_id, but
--    inside the subquery the unqualified project_id resolves to
--    project_members.project_id (self-comparison, always true). Any
--    authenticated project member could therefore read every published
--    schema of every project and organization. Qualify the outer column.
--
-- 2. devices_select_self checked dps.device_id = id, but inside the
--    subquery the unqualified id resolves to projects.id (a device id can
--    never equal a project id), so the administrator arm could not read
--    devices through RLS. Qualify the outer column.

drop policy if exists project_schemas_select_visible on public.project_schemas;
create policy project_schemas_select_visible
on public.project_schemas for select to authenticated
using (
  (
    published_at is not null
    and (
      exists (
        select 1 from public.project_members pm
        where pm.project_id = project_schemas.project_id
          and pm.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.projects p
        join public.organization_members om
          on om.organization_id = p.organization_id
        where p.id = project_schemas.project_id
          and om.user_id = (select auth.uid())
          and om.role = 'admin'
      )
    )
  )
  or (
    published_at is null
    and exists (
      select 1
      from public.projects p
      join public.organization_members om
        on om.organization_id = p.organization_id
      where p.id = project_schemas.project_id
        and om.user_id = (select auth.uid())
        and om.role = 'admin'
    )
  )
);

drop policy if exists devices_select_self on public.devices;
create policy devices_select_self on public.devices for select to authenticated
using (
  contributor_id = (select auth.uid())
  or exists (
    select 1
    from public.device_project_status dps
    join public.projects p on p.id = dps.project_id
    join public.organization_members om on om.organization_id = p.organization_id
    where dps.device_id = devices.id and om.user_id = (select auth.uid()) and om.role = 'admin'
  )
);
