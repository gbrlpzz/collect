-- Contributors are assigned to projects, not organizations. The
-- project_overviews view is security_invoker and joins organizations, whose
-- SELECT policy only admitted organization members; contributors therefore
-- saw zero rows from the view and their assigned project never appeared in
-- the app. Extend the policy so project members of any project inside the
-- organization can read the organization row (name/logo) needed by the join.

create or replace function private.is_org_project_member(target_org uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_org is not null and exists (
    select 1
    from public.projects p
    join public.project_members pm on pm.project_id = p.id
    where p.organization_id = target_org
      and pm.user_id = (select auth.uid())
  );
$$;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select to authenticated
using (private.is_org_member(id) or private.is_org_project_member(id));
