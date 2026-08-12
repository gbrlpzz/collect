-- Collection consent (in-app, replaces paper forms) + contributor profiles.
create table if not exists public.consent_versions (
  version integer primary key check (version > 0),
  text text not null,
  effective_at timestamptz not null default now()
);

insert into public.consent_versions (version, text)
values (1, $consent$You are invited to contribute observations to a scientific field project.

By accepting this consent:

1. Your structured observations, photos, audio, location (coordinates and accuracy), timestamps, timezone, and device information (model, operating system, browser) are recorded on this device and transmitted to the project's server.
2. Location is captured automatically with each observation. You can disable location access in your device settings; location fields will then fail to record.
3. Your data is used as research evidence for this project, may be included in checkpoint exports, and is retained according to the project's data policy.
4. You may withdraw consent at any time by contacting the project administrator. Withdrawal stops new collection but does not delete evidence already recorded, in line with research integrity.

This in-app consent replaces a separate paper consent form.$consent$)
on conflict (version) do nothing;

create table if not exists public.contributor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent_version integer references public.consent_versions(version),
  consent_granted_at timestamptz,
  consent_revoked_at timestamptz,
  quality_score numeric(5,2) check (quality_score >= 0 and quality_score <= 100),
  quality_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contributor_profiles enable row level security;

drop policy if exists contributor_profiles_select on public.contributor_profiles;
create policy contributor_profiles_select on public.contributor_profiles for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.organization_members om
    where om.user_id = (select auth.uid()) and om.role = 'admin'
  )
);

drop policy if exists contributor_profiles_insert_self on public.contributor_profiles;
create policy contributor_profiles_insert_self on public.contributor_profiles for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists contributor_profiles_update on public.contributor_profiles;
create policy contributor_profiles_update on public.contributor_profiles for update to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.organization_members om
  where om.user_id = (select auth.uid()) and om.role = 'admin'
))
with check (user_id = (select auth.uid()) or exists (
  select 1 from public.organization_members om
  where om.user_id = (select auth.uid()) and om.role = 'admin'
));

grant select, insert, update on public.consent_versions to authenticated;
grant select, insert, update on public.contributor_profiles to authenticated;
