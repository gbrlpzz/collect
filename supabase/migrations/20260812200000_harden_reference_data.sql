-- Close two public reference-table RLS gaps, make private tables defensive in
-- depth, and expose only narrow service-role RPCs to Edge Functions.

alter table public.consent_versions enable row level security;
drop policy if exists consent_versions_select on public.consent_versions;
create policy consent_versions_select
on public.consent_versions for select to authenticated
using (true);
revoke all on public.consent_versions from anon, authenticated;
grant select on public.consent_versions to authenticated;

alter table public.attention_checks enable row level security;
revoke all on public.attention_checks from anon, authenticated;

alter table private.allowed_admin_patterns enable row level security;
alter table private.session_link_codes enable row level security;

-- Pre-hardening codes were stored in plaintext and expire after five minutes;
-- invalidate any remainder rather than carrying plaintext forward.
delete from private.session_link_codes where length(code) <> 64;
alter table private.session_link_codes
  drop constraint if exists session_link_codes_code_check;
alter table private.session_link_codes
  add constraint session_link_codes_code_check check (length(code) = 64);

create index if not exists attention_responses_check_key_idx
  on public.attention_responses (check_key);
create index if not exists attention_responses_project_idx
  on public.attention_responses (project_id);
create index if not exists contributor_profiles_consent_version_idx
  on public.contributor_profiles (consent_version);

drop policy if exists project_schemas_select_assigned
  on public.project_schemas;
drop policy if exists project_schemas_select_admin_draft
  on public.project_schemas;
create policy project_schemas_select_visible
on public.project_schemas for select to authenticated
using (
  (
    published_at is not null
    and (
      exists (
        select 1 from public.project_members pm
        where pm.project_id = project_id
          and pm.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.projects p
        join public.organization_members om
          on om.organization_id = p.organization_id
        where p.id = project_id
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
      where p.id = project_id
        and om.user_id = (select auth.uid())
        and om.role = 'admin'
    )
  )
);

-- One RLS-aware read replaces the per-project organization/schema/count/status
-- request fan-out on application boot. security_invoker keeps every base-table
-- policy in force for contributors and administrators alike.
create or replace view public.project_overviews
with (security_invoker = true)
as
select
  p.id,
  p.organization_id,
  p.name,
  p.description,
  p.instructions,
  p.status,
  p.license,
  p.contact_email,
  p.dataset_identifier,
  p.created_at,
  o.name as organization_name,
  o.logo_path as organization_logo_path,
  schema_row.id as schema_id,
  schema_row.version as schema_version,
  schema_row.schema_json,
  (select count(*)::integer from public.project_members member_row
   where member_row.project_id = p.id) as contributor_count,
  (select count(*)::integer from public.submissions submission_row
   where submission_row.project_id = p.id
     and submission_row.status = 'COMPLETE') as complete_submission_count,
  (select max(submission_row.server_received_at)
   from public.submissions submission_row
   where submission_row.project_id = p.id
     and submission_row.status = 'COMPLETE') as last_received_at
from public.projects p
join public.organizations o on o.id = p.organization_id
join lateral (
  select version_row.id, version_row.version, version_row.schema_json
  from public.project_schemas version_row
  where version_row.project_id = p.id
    and version_row.published_at is not null
  order by version_row.version desc
  limit 1
) schema_row on true;

revoke all on public.project_overviews from anon, authenticated;
grant select on public.project_overviews to authenticated;

create or replace function public.list_allowed_admin_patterns()
returns table (pattern text)
language sql
stable
security definer
set search_path = ''
as $$
  select source.pattern from private.allowed_admin_patterns source;
$$;

create or replace function public.store_session_link_code(
  p_code_hash text,
  p_user_id uuid,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(p_code_hash) <> 64 or p_expires_at <= now() then
    raise exception 'Invalid link-code parameters';
  end if;
  delete from private.session_link_codes
  where expires_at <= now() or used_at is not null;
  insert into private.session_link_codes (code, user_id, expires_at)
  values (p_code_hash, p_user_id, p_expires_at);
end;
$$;

create or replace function public.consume_session_link_code(p_code_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if length(p_code_hash) <> 64 then
    return null;
  end if;
  update private.session_link_codes
  set used_at = now()
  where code = p_code_hash
    and used_at is null
    and expires_at > now()
  returning user_id into owner_id;
  return owner_id;
end;
$$;

revoke all on function public.list_allowed_admin_patterns()
  from public, anon, authenticated;
revoke all on function public.store_session_link_code(text, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.consume_session_link_code(text)
  from public, anon, authenticated;
grant execute on function public.list_allowed_admin_patterns()
  to service_role;
grant execute on function public.store_session_link_code(text, uuid, timestamptz)
  to service_role;
grant execute on function public.consume_session_link_code(text)
  to service_role;
