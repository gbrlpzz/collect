-- Administrator allow-list, stored server-side (private schema, unreadable by
-- clients). The ALLOWED_EMAIL_PATTERNS secret takes precedence when set;
-- otherwise these rows decide who may be invited as an administrator.
create table if not exists private.allowed_admin_patterns (
  pattern text primary key check (pattern like '%@%'),
  created_at timestamptz not null default now()
);
revoke all on private.allowed_admin_patterns from anon, authenticated;
grant select on private.allowed_admin_patterns to service_role;
