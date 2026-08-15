# Handoff: deploy round 2 (infra/UX hardening)

For: prime-agent · Branch: `hardening/infra-ux-round2` (new PR after #48).
Delete this file when the deployment is verified.

## What this round changes that touches infrastructure

1. **Migration** `supabase/migrations/20260815170000_audit_organizations_and_throttle_rls.sql`
   — enables RLS on `private.signin_code_requests` and adds audit triggers on
   `organizations` and `organization_members` (bootstrap grants and
   out-of-band membership changes now leave an audit trail).
2. **Auth config** `supabase/config.toml` — pins `minimum_password_length = 10`,
   `jwt_expiry = 3600`, refresh rotation (10 s reuse interval), and adds an
   `[auth.captcha]` block (left disabled with guidance).
3. **Shared edge module changed** (`_shared/cors.ts` adds
   `X-Content-Type-Options: nosniff`) and `device-status` gained a rate limit
   and input caps → **redeploy ALL Edge Functions** (shared modules bundle
   into every function).
4. **`vercel.json` now ships security headers** including a CSP; the app
   shell's boot script moved from inline in `app.html` to `public/boot.js`
   (also added to the service-worker precache core list).

## Steps

```bash
git fetch origin
git checkout hardening/infra-ux-round2
npm run check          # must pass clean (lint: 0/0)

# 1. Database
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --linked --dry-run   # expect exactly ONE new migration:
                                      # 20260815170000_audit_organizations...
supabase db push --linked

# 2. Auth config (password minimum, JWT/refresh, captcha block)
SUPABASE_AUTH_GOOGLE_CLIENT_ID=... SUPABASE_AUTH_GOOGLE_SECRET=... \
  npm run provision -- --auth-only
# (or scripts/push-auth-config.mjs with the CLI linked, per docs/deployment.md)

# 3. Edge Functions — all of them (shared cors.ts changed)
for fn in health claim-invites device-status link-session \
  contributor-signin-code remove-project-contributor send-admin-invite \
  send-project-invite send-project-ping export-checkpoint sync-submission \
  bootstrap-workspace notify-preview-request; do
  supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
done
```

## Verification

- Migration:
  ```sql
  select relname, relrowsecurity from pg_class where relname = 'signin_code_requests';
  -- expect relrowsecurity = true
  select action, count(*) from audit_events
    where action like 'organization%' group by action;  -- after first use
  ```
- Auth: password sign-up with a 6-character password must be rejected; two
  tabs must stay signed in across a token refresh.
- Edge: `curl -sD - -o /dev/null https://<project>.supabase.co/functions/v1/health | grep -i nosniff`
- Headers (after frontend deploy):
  ```bash
  curl -sD - -o /dev/null https://<domain>/ | grep -iE "content-security|x-frame|strict-transport|permissions-policy"
  ```
- CSP functional check on the Vercel PREVIEW before merging: homepage, /app
  (both roles), provider sign-in, photo capture, sync, admin export — zero
  console CSP violations.
- Vercel → Project → Settings → Domains → enable **Deployment Protection**
  (documented in docs/deployment.md).

## Rollback notes

- Migration is additive (RLS flag + triggers); rollback is
  `drop trigger ... ; drop function private.audit_organization_change();`
  and `alter table private.signin_code_requests disable row level security;`
  in a NEW migration — never edit the applied file.
- Auth config: revert the config.toml block in a commit and re-run the auth
  push.
- Headers: remove the `headers` array from vercel.json and redeploy; keep
  `/boot.js` either way (it is load-bearing for the shell).
