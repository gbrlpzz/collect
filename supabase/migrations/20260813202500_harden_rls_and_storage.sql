-- Harden organization visibility for project contributors, protect storage media
-- against post-finalization overwrites, and add covering indexes for overview queries.

-- 1. Organization visibility for project contributors -------------------------
-- Project members (contributors) need to see the organization name and logo in
-- project_overviews (security_invoker = true). The policy now permits access if
-- the user is an organization member OR an assigned member of any project in the organization.
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select to authenticated
using (
  private.is_org_member(id)
  or exists (
    select 1
    from public.projects p
    join public.project_members pm on pm.project_id = p.id
    where p.organization_id = organizations.id and pm.user_id = (select auth.uid())
  )
);

-- 2. Storage write guard: reject mutations on finalized submissions ----------
create or replace function private.is_submission_media_writer(path text)
returns boolean
language plpgsql stable security definer set search_path = public, private, pg_catalog
as $$
declare
  project_uuid uuid;
  submission_uuid uuid;
begin
  if path is null or split_part(path, '/', 1) <> 'projects' or split_part(path, '/', 3) <> 'submissions' then
    return false;
  end if;
  if split_part(path, '/', 5) = '' or split_part(path, '/', 6) <> '' then
    return false;
  end if;
  begin
    project_uuid := split_part(path, '/', 2)::uuid;
    submission_uuid := split_part(path, '/', 4)::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1
    from public.submissions s
    where s.id = submission_uuid
      and s.project_id = project_uuid
      and s.contributor_id = (select auth.uid())
      and s.status <> 'COMPLETE'
  );
end;
$$;

-- 3. Covering index for project submission counts and checkpoints ------------
create index if not exists submissions_project_status_received_idx
  on public.submissions (project_id, status, server_received_at desc);
