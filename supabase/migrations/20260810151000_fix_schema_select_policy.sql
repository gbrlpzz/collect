-- Amend: published schema visibility must keep the org-admin branch (the
-- projects scan is safe here: the modifying statement touches project_schemas,
-- so the projects snapshot is unchanged and visible).
drop policy if exists project_schemas_select_assigned on public.project_schemas;
create policy project_schemas_select_assigned on public.project_schemas for select to authenticated
using (
  (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_id and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = project_id and om.user_id = (select auth.uid()) and om.role = 'admin'
    )
  )
  and published_at is not null
);
