-- Harden trigger/helper functions and remove overlapping RLS policies.
-- This migration is safe to apply after the initial collect MVP migration.

create or replace function private.project_id_from_object_path(path text)
returns uuid
language plpgsql
immutable
set search_path = public, private, pg_catalog
as $$
begin
  return split_part(path, '/', 2)::uuid;
exception when others then
  return null;
end;
$$;

create or replace function private.protect_published_schema()
returns trigger
language plpgsql
set search_path = public, private, pg_catalog
as $$
begin
  if tg_op = 'DELETE' and old.published_at is not null then
    raise exception 'Published schemas are immutable';
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    raise exception 'Published schemas are immutable';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.protect_finalized_submission()
returns trigger
language plpgsql
set search_path = public, private, pg_catalog
as $$
begin
  if old.status = 'COMPLETE' and (
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

drop policy if exists project_members_select_assigned on public.project_members;
drop policy if exists project_members_write_admin on public.project_members;

create policy project_members_select_assigned on public.project_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_project_admin(project_id));

create policy project_members_insert_admin on public.project_members for insert to authenticated
with check (private.is_project_admin(project_id));

create policy project_members_update_admin on public.project_members for update to authenticated
using (private.is_project_admin(project_id)) with check (private.is_project_admin(project_id));

create policy project_members_delete_admin on public.project_members for delete to authenticated
using (private.is_project_admin(project_id));

create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists audit_events_organization_idx on public.audit_events(organization_id);
create index if not exists audit_events_project_idx on public.audit_events(project_id);
create index if not exists checkpoints_created_by_idx on public.checkpoints(created_by);
create index if not exists checkpoints_project_idx on public.checkpoints(project_id);
create index if not exists device_status_contributor_idx on public.device_project_status(contributor_id);
create index if not exists devices_contributor_idx on public.devices(contributor_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists project_invites_invited_by_idx on public.project_invites(invited_by);
create index if not exists project_invites_invited_user_idx on public.project_invites(invited_user_id);
create index if not exists project_schemas_published_by_idx on public.project_schemas(published_by);
create index if not exists projects_created_by_idx on public.projects(created_by);
create index if not exists submissions_corrects_idx on public.submissions(corrects_submission_id);
create index if not exists submissions_device_idx on public.submissions(device_id);
create index if not exists submissions_schema_idx on public.submissions(schema_id);
