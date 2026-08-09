-- collect MVP schema
-- Apply this migration to a dedicated Supabase project. The browser never
-- receives the service role key; privileged ingestion and export are handled
-- by Edge Functions.

create extension if not exists pgcrypto;

create schema if not exists private;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  logo_path text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'contributor' check (role in ('admin', 'contributor')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 200),
  description text not null default '',
  instructions text not null default '',
  status text not null default 'active' check (status in ('active', 'closed', 'archived')),
  collection_start timestamptz,
  collection_end timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'contributor' check (role in ('admin', 'contributor')),
  assigned_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists project_invites_pending_email_idx
  on public.project_invites (project_id, lower(email)) where status = 'pending';

create table if not exists public.project_schemas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null check (version > 0),
  schema_json jsonb not null,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.devices (
  id uuid primary key,
  contributor_id uuid not null references auth.users(id) on delete cascade,
  app_version text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete restrict,
  schema_id uuid not null references public.project_schemas(id) on delete restrict,
  contributor_id uuid not null references auth.users(id) on delete restrict,
  device_id uuid not null references public.devices(id) on delete restrict,
  payload jsonb not null,
  payload_hash text not null,
  client_created_at timestamptz not null,
  client_timezone text not null default '',
  server_received_at timestamptz not null default now(),
  status text not null default 'RECEIVED' check (status in ('RECEIVED', 'COMPLETE', 'CONFLICT')),
  app_version text not null default '',
  finalized_at timestamptz,
  collected_after_remote_close boolean not null default false,
  corrects_submission_id uuid references public.submissions(id) on delete restrict,
  expected_media_count integer not null default 0 check (expected_media_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.submission_media (
  id uuid primary key,
  submission_id uuid not null references public.submissions(id) on delete restrict,
  field_id text not null,
  object_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  original_filename text not null default '',
  sha256 text,
  captured_at timestamptz,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'UPLOADED')),
  created_at timestamptz not null default now(),
  unique (submission_id, id)
);

create table if not exists public.device_project_status (
  device_id uuid not null references public.devices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  contributor_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_sync_success_at timestamptz,
  pending_submissions integer not null default 0 check (pending_submissions >= 0),
  pending_media integer not null default 0 check (pending_media >= 0),
  app_version text not null default '',
  schema_versions_cached jsonb not null default '[]'::jsonb,
  fieldwork_complete boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (device_id, project_id)
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  cutoff_server_timestamp timestamptz not null,
  submission_count integer not null default 0,
  media_count integer not null default 0,
  schema_versions jsonb not null default '[]'::jsonb,
  contributor_readiness jsonb not null default '[]'::jsonb,
  export_object_path text
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_organization_idx on public.projects (organization_id, created_at desc);
create index if not exists project_members_user_idx on public.project_members (user_id, project_id);
create index if not exists schemas_project_version_idx on public.project_schemas (project_id, version desc);
create index if not exists submissions_project_received_idx on public.submissions (project_id, server_received_at desc);
create index if not exists submissions_contributor_idx on public.submissions (contributor_id, project_id, server_received_at desc);
create index if not exists submission_media_submission_idx on public.submission_media (submission_id);
create index if not exists device_status_project_idx on public.device_project_status (project_id, last_seen_at desc);

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_org is not null and exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_admin(target_org uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_org is not null and exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.is_project_member(target_project uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_project is not null and (
    exists (select 1 from public.project_members where project_id = target_project and user_id = (select auth.uid()))
    or exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = target_project and om.user_id = (select auth.uid()) and om.role = 'admin'
    )
  );
$$;

create or replace function private.is_project_admin(target_project uuid)
returns boolean
language sql stable security definer set search_path = public, private, pg_catalog
as $$
  select target_project is not null and (
    exists (select 1 from public.project_members where project_id = target_project and user_id = (select auth.uid()) and role = 'admin')
    or exists (
      select 1 from public.projects p
      join public.organization_members om on om.organization_id = p.organization_id
      where p.id = target_project and om.user_id = (select auth.uid()) and om.role = 'admin'
    )
  );
$$;

create or replace function private.project_id_from_object_path(path text)
returns uuid
language plpgsql immutable
as $$
begin
  return split_part(path, '/', 2)::uuid;
exception when others then
  return null;
end;
$$;

create or replace function private.add_organization_owner()
returns trigger
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict (organization_id, user_id) do update set role = 'admin';
  return new;
end;
$$;

drop trigger if exists organizations_add_owner on public.organizations;
create trigger organizations_add_owner
after insert on public.organizations
for each row execute function private.add_organization_owner();

create or replace function private.protect_published_schema()
returns trigger
language plpgsql
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

drop trigger if exists project_schemas_immutable on public.project_schemas;
create trigger project_schemas_immutable
before update or delete on public.project_schemas
for each row execute function private.protect_published_schema();

create or replace function private.protect_finalized_submission()
returns trigger
language plpgsql
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

create or replace function private.audit_admin_change()
returns trigger
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
declare
  target_org uuid;
  target_project uuid;
  actor uuid;
  target_status text;
  event_action text;
begin
  if tg_table_name = 'projects' then
    if tg_op = 'INSERT' then
      target_org := new.organization_id;
      target_project := new.id;
      actor := new.created_by;
      target_status := new.status;
      event_action := 'project_created';
    elsif new.status is distinct from old.status then
      target_org := new.organization_id;
      target_project := new.id;
      actor := coalesce(new.created_by, old.created_by);
      target_status := new.status;
      event_action := 'project_status_changed';
    else return new;
    end if;
    insert into public.audit_events (organization_id, project_id, actor_id, action, metadata)
    values (target_org, target_project, actor, event_action, jsonb_build_object('status', target_status));
  elsif tg_table_name = 'project_schemas' then
    if new.published_at is not null and (tg_op = 'INSERT' or old.published_at is null) then
      select organization_id into target_org from public.projects where id = new.project_id;
      insert into public.audit_events (organization_id, project_id, actor_id, action, metadata)
      values (target_org, new.project_id, new.published_by, 'schema_published', jsonb_build_object('schema_id', new.id, 'version', new.version));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_audit_admin_change on public.projects;
create trigger projects_audit_admin_change
after insert or update of status on public.projects
for each row execute function private.audit_admin_change();

drop trigger if exists project_schemas_audit_publish on public.project_schemas;
create trigger project_schemas_audit_publish
after insert or update of published_at on public.project_schemas
for each row execute function private.audit_admin_change();

drop trigger if exists submissions_immutable_after_finalize on public.submissions;
create trigger submissions_immutable_after_finalize
before update on public.submissions
for each row execute function private.protect_finalized_submission();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.project_schemas enable row level security;
alter table public.devices enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_media enable row level security;
alter table public.device_project_status enable row level security;
alter table public.checkpoints enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations for select to authenticated
using (private.is_org_member(id));

drop policy if exists organizations_insert_self on public.organizations;
create policy organizations_insert_self on public.organizations for insert to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations for update to authenticated
using (private.is_org_admin(id)) with check (private.is_org_admin(id));

drop policy if exists organization_members_select_member on public.organization_members;
create policy organization_members_select_member on public.organization_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_org_admin(organization_id));

drop policy if exists projects_select_assigned on public.projects;
create policy projects_select_assigned on public.projects for select to authenticated
using (private.is_project_member(id));

drop policy if exists projects_insert_admin on public.projects;
create policy projects_insert_admin on public.projects for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_org_admin(organization_id));

drop policy if exists projects_update_admin on public.projects;
create policy projects_update_admin on public.projects for update to authenticated
using (private.is_org_admin(organization_id)) with check (private.is_org_admin(organization_id));

drop policy if exists project_members_select_assigned on public.project_members;
create policy project_members_select_assigned on public.project_members for select to authenticated
using (user_id = (select auth.uid()) or private.is_project_admin(project_id));

drop policy if exists project_members_write_admin on public.project_members;
create policy project_members_write_admin on public.project_members for all to authenticated
using (private.is_project_admin(project_id)) with check (private.is_project_admin(project_id));

drop policy if exists project_invites_select_admin on public.project_invites;
create policy project_invites_select_admin on public.project_invites for select to authenticated
using (private.is_project_admin(project_id));

drop policy if exists project_schemas_select_assigned on public.project_schemas;
create policy project_schemas_select_assigned on public.project_schemas for select to authenticated
using (private.is_project_member(project_id) and published_at is not null);

drop policy if exists project_schemas_insert_admin on public.project_schemas;
create policy project_schemas_insert_admin on public.project_schemas for insert to authenticated
with check (private.is_project_admin(project_id));

drop policy if exists project_schemas_update_admin on public.project_schemas;
create policy project_schemas_update_admin on public.project_schemas for update to authenticated
using (private.is_project_admin(project_id)) with check (private.is_project_admin(project_id));

drop policy if exists project_schemas_delete_admin on public.project_schemas;
create policy project_schemas_delete_admin on public.project_schemas for delete to authenticated
using (private.is_project_admin(project_id));

drop policy if exists devices_select_self_or_admin on public.devices;
create policy devices_select_self_or_admin on public.devices for select to authenticated
using (contributor_id = (select auth.uid()));

drop policy if exists submissions_select_owner_or_admin on public.submissions;
create policy submissions_select_owner_or_admin on public.submissions for select to authenticated
using (contributor_id = (select auth.uid()) or private.is_project_admin(project_id));

drop policy if exists submissions_insert_owner on public.submissions;
create policy submissions_insert_owner on public.submissions for insert to authenticated
with check (contributor_id = (select auth.uid()) and private.is_project_member(project_id));

drop policy if exists submissions_update_owner on public.submissions;
create policy submissions_update_owner on public.submissions for update to authenticated
using (contributor_id = (select auth.uid()) or private.is_project_admin(project_id))
with check (contributor_id = (select auth.uid()) or private.is_project_admin(project_id));

drop policy if exists submission_media_select_owner_or_admin on public.submission_media;
create policy submission_media_select_owner_or_admin on public.submission_media for select to authenticated
using (exists (
  select 1 from public.submissions s
  where s.id = submission_id and (s.contributor_id = (select auth.uid()) or private.is_project_admin(s.project_id))
));

drop policy if exists device_status_select_owner_or_admin on public.device_project_status;
create policy device_status_select_owner_or_admin on public.device_project_status for select to authenticated
using (contributor_id = (select auth.uid()) or private.is_project_admin(project_id));

drop policy if exists checkpoints_select_admin on public.checkpoints;
create policy checkpoints_select_admin on public.checkpoints for select to authenticated
using (private.is_project_admin(project_id));

drop policy if exists audit_events_select_admin on public.audit_events;
create policy audit_events_select_admin on public.audit_events for select to authenticated
using (private.is_org_admin(organization_id));

grant usage on schema public to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert, delete on public.project_members to authenticated;
grant select on public.project_invites to authenticated;
grant select, insert, update, delete on public.project_schemas to authenticated;
grant select on public.devices to authenticated;
grant select, insert, update on public.submissions to authenticated;
grant select on public.submission_media to authenticated;
grant select on public.device_project_status to authenticated;
grant select on public.checkpoints to authenticated;
grant select on public.audit_events to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('collect-media', 'collect-media', false, 524288000)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('collect-exports', 'collect-exports', false, 1073741824)
on conflict (id) do nothing;

drop policy if exists collect_media_insert_member on storage.objects;
create policy collect_media_insert_member on storage.objects for insert to authenticated
with check (bucket_id = 'collect-media' and private.is_project_member(private.project_id_from_object_path(name)));

drop policy if exists collect_media_select_member on storage.objects;
create policy collect_media_select_member on storage.objects for select to authenticated
using (bucket_id = 'collect-media' and private.is_project_member(private.project_id_from_object_path(name)));

drop policy if exists collect_media_update_member on storage.objects;
create policy collect_media_update_member on storage.objects for update to authenticated
using (bucket_id = 'collect-media' and private.is_project_member(private.project_id_from_object_path(name)))
with check (bucket_id = 'collect-media' and private.is_project_member(private.project_id_from_object_path(name)));

drop policy if exists collect_exports_select_admin on storage.objects;
create policy collect_exports_select_admin on storage.objects for select to authenticated
using (
  bucket_id = 'collect-exports' and exists (
    select 1 from public.checkpoints c
    where c.export_object_path = name and private.is_project_admin(c.project_id)
  )
);
