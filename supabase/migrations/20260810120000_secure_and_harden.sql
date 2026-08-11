-- Secure ingestion and close remaining authorization gaps (audit G1-G5).
-- 1. Admins can read unpublished schema drafts (previously invisible -> draft re-open broke).
-- 2. Finalized submissions are fully immutable, including the status column.
-- 3. Direct client INSERT/UPDATE on submissions/submission_media is revoked; ingestion
--    happens exclusively through the sync-submission Edge Function (service role).
-- 4. Storage media writes require submission ownership, not just project membership.
-- 5. Contributor removal is audited.

-- 1. Draft visibility for admins ----------------------------------------------
drop policy if exists project_schemas_select_admin_draft on public.project_schemas;
create policy project_schemas_select_admin_draft on public.project_schemas
  for select to authenticated
  using (private.is_project_admin(project_id) and published_at is null);

-- 2. Finalized submissions are fully immutable --------------------------------
create or replace function private.protect_finalized_submission()
returns trigger
language plpgsql
set search_path = public, private, pg_catalog
as $$
begin
  if old.status = 'COMPLETE' and (
    new.status is distinct from old.status or
    new.project_id is distinct from old.project_id or
    new.schema_id is distinct from old.schema_id or
    new.contributor_id is distinct from old.contributor_id or
    new.device_id is distinct from old.device_id or
    new.payload is distinct from old.payload or
    new.payload_hash is distinct from old.payload_hash or
    new.client_created_at is distinct from old.client_created_at or
    new.expected_media_count is distinct from old.expected_media_count
  ) then
    raise exception 'Finalized submissions are immutable';
  end if;
  return new;
end;
$$;

-- 3. Ingestion is function-only -----------------------------------------------
revoke insert, update on public.submissions from authenticated;
revoke insert, update, delete on public.submission_media from authenticated;

-- 4. Storage writes require submission ownership ------------------------------
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
    where s.id = submission_uuid and s.project_id = project_uuid
      and s.contributor_id = (select auth.uid())
  );
end;
$$;

drop policy if exists collect_media_insert_member on storage.objects;
drop policy if exists collect_media_update_member on storage.objects;

create policy collect_media_insert_member on storage.objects for insert to authenticated
with check (bucket_id = 'collect-media' and private.is_submission_media_writer(name));

create policy collect_media_update_member on storage.objects for update to authenticated
using (bucket_id = 'collect-media' and private.is_submission_media_writer(name))
with check (bucket_id = 'collect-media' and private.is_submission_media_writer(name));

-- 5. Audit contributor removal --------------------------------------------------
create or replace function private.audit_member_removal()
returns trigger
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
declare
  target_org uuid;
begin
  select organization_id into target_org from public.projects where id = old.project_id;
  if target_org is not null then
    insert into public.audit_events (organization_id, project_id, actor_id, action, metadata)
    values (target_org, old.project_id, (select auth.uid()), 'contributor_removed',
            jsonb_build_object('contributor_id', old.user_id, 'role', old.role));
  end if;
  return old;
end;
$$;

drop trigger if exists project_members_audit_removal on public.project_members;
create trigger project_members_audit_removal
after delete on public.project_members
for each row execute function private.audit_member_removal();

-- 6. Devices: admins may read devices of contributors in their projects; the
--    policy name now matches its behavior (self or project admin). --------------
drop policy if exists devices_select_self_or_admin on public.devices;
create policy devices_select_self on public.devices for select to authenticated
using (
  contributor_id = (select auth.uid())
  or exists (
    select 1
    from public.device_project_status dps
    join public.projects p on p.id = dps.project_id
    join public.organization_members om on om.organization_id = p.organization_id
    where dps.device_id = id and om.user_id = (select auth.uid()) and om.role = 'admin'
  )
);
