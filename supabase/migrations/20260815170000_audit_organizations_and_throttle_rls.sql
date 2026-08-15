-- Defense-in-depth and audit-trail completion.
--
-- 1. private.signin_code_requests stores IP hashes for the sign-in-code
--    throttle. It lives in the private schema and is only touched through
--    the service-role security-definer RPC, but every table that holds
--    identifiers deserves RLS as a second lock.
alter table private.signin_code_requests enable row level security;

-- 2. Organization lifecycle and membership changes were invisible in the
--    audit log: bootstrap_organization minted the first workspace admin with
--    no trail, and out-of-band organization_members edits (including admin
--    removal) left no record. Table triggers capture every path, including
--    the RPC. Actor attribution: the tables do not record who performed a
--    service-role write, so actor_id reflects the affected member/creator
--    and the metadata names the change; inviter attribution for the invite
--    flow stays on the existing admin_invited event from send-admin-invite.
create or replace function private.audit_organization_change()
returns trigger
language plpgsql security definer set search_path = public, private, pg_catalog
as $$
declare
  target_org uuid;
  actor uuid;
  event_action text;
  payload jsonb;
begin
  if tg_table_name = 'organizations' then
    target_org := coalesce(new.id, old.id);
    actor := coalesce(new.created_by, old.created_by);
    if tg_op = 'INSERT' then
      event_action := 'organization_created';
      payload := jsonb_build_object('name', new.name, 'domain', new.domain);
    else
      if new.name is not distinct from old.name and
         new.domain is not distinct from old.domain then
        return coalesce(new, old);
      end if;
      event_action := 'organization_updated';
      payload := jsonb_build_object(
        'name_changed', new.name is distinct from old.name,
        'domain_changed', new.domain is distinct from old.domain,
        'name', new.name
      );
    end if;
  elsif tg_table_name = 'organization_members' then
    target_org := coalesce(new.organization_id, old.organization_id);
    actor := coalesce(new.user_id, old.user_id);
    if tg_op = 'UPDATE' and new.role is not distinct from old.role then
      return coalesce(new, old);
    end if;
    event_action := case tg_op
      when 'INSERT' then 'organization_member_added'
      when 'DELETE' then 'organization_member_removed'
      else 'organization_member_role_changed'
    end;
    payload := jsonb_build_object(
      'member_user_id', coalesce(new.user_id, old.user_id),
      'role', coalesce(new.role, old.role)
    );
  else
    return coalesce(new, old);
  end if;

  insert into public.audit_events (organization_id, project_id, actor_id, action, metadata)
  values (target_org, null, actor, event_action, payload);
  return coalesce(new, old);
end;
$$;

drop trigger if exists organizations_audit_change on public.organizations;
create trigger organizations_audit_change
after insert or update of name, domain on public.organizations
for each row execute function private.audit_organization_change();

drop trigger if exists organization_members_audit_change on public.organization_members;
create trigger organization_members_audit_change
after insert or update or delete on public.organization_members
for each row execute function private.audit_organization_change();
