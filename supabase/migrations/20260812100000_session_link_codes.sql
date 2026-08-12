-- Device-link bridge: one-time codes that transfer an already-signed-in
-- web session into another container (installed PWA) without email.
-- The code is random, short-lived, single-use, and only minted for the
-- authenticated user who is currently signed in.
create table if not exists private.session_link_codes (
  code text primary key check (length(code) between 6 and 12),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists session_link_codes_user_idx on private.session_link_codes (user_id);
revoke all on private.session_link_codes from anon, authenticated;
grant select, insert, update on private.session_link_codes to service_role;
