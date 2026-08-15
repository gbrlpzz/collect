-- Ensure each administrator has their own isolated workspace/organization,
-- with institutional domain grouping (e.g. all @liminalfutures.com join Liminal org),
-- while generic domains (gmail.com, etc.) receive their own private personal organizations.

alter table public.organizations add column if not exists domain text;
create index if not exists organizations_domain_idx on public.organizations(lower(domain));

-- Organization-level invitations for workspace administrators
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists organization_invites_pending_email_idx
  on public.organization_invites (organization_id, lower(email)) where status = 'pending';

create index if not exists organization_invites_email_idx
  on public.organization_invites (lower(email)) where status = 'pending';

alter table public.organization_invites enable row level security;

drop policy if exists organization_invites_select_admin on public.organization_invites;
create policy organization_invites_select_admin on public.organization_invites for select to authenticated
using (private.is_org_admin(organization_id));

grant select on public.organization_invites to authenticated;

create or replace function public.bootstrap_organization(target_name text, target_user uuid)
returns table(organization_id uuid, organization_name text)
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  new_id uuid;
  existing_id uuid;
  existing_name text;
  user_email text;
  user_domain text;
begin
  perform pg_advisory_xact_lock(hashtext('collect.bootstrap_workspace.' || target_user::text));

  -- 1. Check if user is already an admin of an organization
  select o.id, o.name into existing_id, existing_name
  from public.organizations o
  join public.organization_members om on om.organization_id = o.id
  where om.user_id = target_user and om.role = 'admin'
  order by o.created_at asc
  limit 1;

  if existing_id is not null then
    return query select existing_id, existing_name;
    return;
  end if;

  -- 2. Check user's email domain
  select lower(email) into user_email from auth.users where id = target_user;
  if user_email is not null and position('@' in user_email) > 1 then
    user_domain := split_part(user_email, '@', 2);
  end if;

  -- 3. If institutional domain, check if domain org exists
  if user_domain is not null and user_domain not in (
    'gmail.com', 'googlemail.com', 'google.com', 'outlook.com', 'hotmail.com',
    'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com',
    'mac.com', 'proton.me', 'protonmail.com', 'aol.com', 'zoho.com', 'mail.com',
    'gmx.com', 'fastmail.com', 'yandex.com'
  ) then
    select o.id, o.name into existing_id, existing_name
    from public.organizations o
    where lower(o.domain) = user_domain
    order by o.created_at asc
    limit 1;

    if existing_id is not null then
      insert into public.organization_members (organization_id, user_id, role)
      values (existing_id, target_user, 'admin')
      on conflict (organization_id, user_id) do update set role = 'admin';

      return query select existing_id, existing_name;
      return;
    end if;
  end if;

  -- 4. Create new organization
  insert into public.organizations (name, domain, created_by)
  values (
    coalesce(nullif(trim(target_name), ''), case when user_domain = 'liminalfutures.com' then 'Liminal' else 'Field organization' end),
    case when user_domain in (
      'gmail.com', 'googlemail.com', 'google.com', 'outlook.com', 'hotmail.com',
      'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com',
      'mac.com', 'proton.me', 'protonmail.com', 'aol.com', 'zoho.com', 'mail.com',
      'gmx.com', 'fastmail.com', 'yandex.com'
    ) then null else user_domain end,
    target_user
  )
  returning id, name into new_id, existing_name;

  return query select new_id, existing_name;
end;
$$;

revoke all on function public.bootstrap_organization(text, uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_organization(text, uuid) to service_role;

-- Clean up any accidental cross-tenant organization memberships where a user
-- was automatically attached to another user's organization without an explicit invitation.
delete from public.organization_members om
where om.user_id != (
  select o.created_by from public.organizations o where o.id = om.organization_id
)
and not exists (
  select 1 from public.organization_invites oi
  where oi.organization_id = om.organization_id
    and (oi.invited_user_id = om.user_id or lower(oi.email) = (select lower(email) from auth.users u where u.id = om.user_id))
    and oi.status = 'accepted'
);

-- Set up the Liminal organization for liminalfutures.com if not already present
do $$
declare
  liminal_org_id uuid;
begin
  select id into liminal_org_id from public.organizations where lower(domain) = 'liminalfutures.com' or name = 'Liminal' limit 1;

  if liminal_org_id is null and exists (select 1 from auth.users where lower(email) like '%@liminalfutures.com') then
    insert into public.organizations (name, domain, created_by)
    select 'Liminal', 'liminalfutures.com', id from auth.users where lower(email) like '%@liminalfutures.com' order by created_at asc limit 1
    returning id into liminal_org_id;
  elsif liminal_org_id is not null then
    update public.organizations set domain = 'liminalfutures.com', name = 'Liminal' where id = liminal_org_id;
  end if;

  if liminal_org_id is not null then
    insert into public.organization_members (organization_id, user_id, role)
    select liminal_org_id, id, 'admin'
    from auth.users
    where lower(email) like '%@liminalfutures.com'
    on conflict (organization_id, user_id) do update set role = 'admin';
  end if;
end;
$$;
