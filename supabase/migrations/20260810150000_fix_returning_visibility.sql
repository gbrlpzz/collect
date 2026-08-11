-- Fix INSERT ... RETURNING visibility for projects and schemas.
--
-- The SELECT policies used private.is_project_member(id) / is_project_admin(id),
-- which resolve the organization by scanning public.projects. Inside an
-- INSERT ... RETURNING statement PostgreSQL cannot see the just-inserted row
-- from another scan of the same table, so the returned row failed the SELECT
-- policy (42501) and the application's create-project flow broke.
--
-- The policies now use columns of the row itself (organization_id / project_id)
-- with non-self-referential membership checks, so RETURNING works. The helper
-- functions remain for storage-path checks where no row columns exist.

create or replace function private.is_project_admin_via_org(target_org uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_org is not null and exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = (select auth.uid()) and role = 'admin'
  );
$$;

drop policy if exists projects_select_assigned on public.projects;
create policy projects_select_assigned on public.projects for select to authenticated
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = id and pm.user_id = (select auth.uid())
  )
  or private.is_org_admin(organization_id)
);

drop policy if exists project_schemas_select_assigned on public.project_schemas;
drop policy if exists project_schemas_select_admin_draft on public.project_schemas;

create policy project_schemas_select_assigned on public.project_schemas for select to authenticated
using (
  exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id and pm.user_id = (select auth.uid())
  )
  and published_at is not null
);

create policy project_schemas_select_admin_draft on public.project_schemas for select to authenticated
using (
  exists (
    select 1 from public.projects p
    join public.organization_members om on om.organization_id = p.organization_id
    where p.id = project_id and om.user_id = (select auth.uid()) and om.role = 'admin'
  )
  and published_at is null
);
