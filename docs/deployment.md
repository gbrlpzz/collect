# Deploying a collect instance

`collect` is designed to be redeployed against a **new Supabase project** and a
**new Vercel project**. No service-role secret belongs in the browser; every
privileged operation runs inside an Edge Function.

## One-command provisioning

For a repeatable setup, install the Supabase CLI and export the deployment
inputs below. `npm run provision` configures the hosted Auth URL and
magic-link template through the Supabase Management API, applies the ordered
migrations, sets the server-side bootstrap guard, deploys every Edge Function,
and can request the first administrator's link.

```bash
export SUPABASE_ACCESS_TOKEN=...          # Supabase account token; keep it private
export SUPABASE_PROJECT_REF=...           # for example lrqlrufwrytpwhgclmyo
export APP_URL=https://your-collect.vercel.app
export BOOTSTRAP_ADMIN_EMAIL=admin@example.org
export VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Add SUPABASE_DB_PASSWORD only if the CLI asks for the database password.
npm run provision -- --issue-magic-link
```

The last flag is intentionally explicit because it sends an email. The script
never prints or stores the one-time token, and it only uses the publishable
browser key for the Auth request. `SUPABASE_ACCESS_TOKEN`, database
credentials, and the service-role key never enter the frontend bundle. Add
local development or preview URLs only when needed with
`SUPABASE_REDIRECT_URLS`, as a comma-separated list.

This command provisions a project that already exists; it does not create a
Supabase or Vercel account.

## Manual steps

### 1. Create Supabase

Create a Supabase project in the region appropriate for the field
organization, then apply the migrations in filename order:

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --linked
```

The migrations create Postgres tables, RLS policies, private Storage buckets,
immutable-schema/submission protections, and the race-safe first-workspace
function.

Deploy the Edge Functions with JWT verification disabled (every function
authenticates its own bearer token; the anonymous `health` probe must stay
reachable):

```bash
for function in health claim-invites device-status send-project-invite send-project-ping export-checkpoint sync-submission bootstrap-workspace; do
  supabase functions deploy "$function" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
done
```

The service-role key is used only inside Edge Functions.

### 2. Configure Auth before the first login

In Supabase **Authentication → URL Configuration**:

- set **Site URL** to the deployed app origin, for example `https://your-collect.vercel.app`;
- add the deployed origin and local development origin to **Additional Redirect URLs**;
- configure the **Magic Link template** to use collect's clean token-hash callback:
  `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Open collect</a>`;
  never hard-code `http://localhost:3000` in the template; include the code
  for installed-app sign-in by adding
  `<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>`;
- configure a trusted SMTP provider for production email delivery.

Magic links are one-time links and expire. The token-hash callback avoids
leaving an access-token fragment in the address bar; the client still accepts
Supabase's default fragment callback for compatibility. `collect` detects an
expired callback, preserves the last email address in the current browser
session, and offers **Send a new link** from the same screen. If an email
security scanner consumes a link first, request another link rather than
reusing the old one. Set `VITE_APP_URL` to the canonical deployed origin so
links generated from a preview or local development page still return to the
real app. Also set the Supabase **Site URL** to that same origin and add it to the
**redirect allow-list**; the email template's redirect must not be a localhost
URL. `npm run provision` applies both automatically (site_url + uri_allow_list).
Note: on the **free tier** the platform rejects custom mailer templates with
HTTP 400 — provisioning retries with the URL settings only, and the default
template is used, which is sufficient once the allow-list contains the app
origin. Applied to the production project on 2026-08-12 (site_url and
allow-list = `https://collect-tawny.vercel.app`).

### 3. Establish the first administrator

For a fresh deployment, set the optional bootstrap guard before the first
sign-in:

```bash
supabase secrets set \
  APP_URL=https://your-collect.vercel.app \
  BOOTSTRAP_ADMIN_EMAIL=admin@example.org \
  --project-ref "$SUPABASE_PROJECT_REF"
```

Open the app, request a magic link for that exact address, and sign in. On an
empty deployment the first successful bootstrap is routed directly to the
Admin workspace; there is no separate admin password. The
`bootstrap-workspace` function creates the organization and its initial admin
membership atomically, and only while the database has no organization yet. If
`BOOTSTRAP_ADMIN_EMAIL` is omitted, the first authenticated user can bootstrap
an empty database; setting it is recommended.

To add another administrator after they have authenticated once, run this
intentionally explicit SQL in the Supabase SQL editor:

```sql
insert into public.organization_members (organization_id, user_id, role)
select 'YOUR_ORGANIZATION_UUID', id, 'admin'
from auth.users
where lower(email) = lower('another-admin@example.org')
on conflict (organization_id, user_id)
do update set role = 'admin';
```

Contributor invitations remain project-scoped and never grant administrator
access.

### 4. Deploy the frontend

Set these environment variables for the frontend build (Vercel project env or
your build pipeline):

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_APP_VERSION=0.1.2
VITE_APP_URL=https://your-collect.vercel.app
VITE_ORGANIZATION_NAME=Your organization
```

`VITE_SUPABASE_ANON_KEY` is accepted as a legacy fallback. Never use
`SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` variable.

Then deploy:

```bash
npm run build
vercel --prod
```

For a fully automated deployment, connect the GitHub repository to Vercel and
enable production deployments from `main`, or use the **Deploy collect**
GitHub Actions workflow with these repository secrets:
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
`APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. The workflow runs tests,
provisions Supabase, builds, and deploys the production bundle. Its
magic-link option is off by default and must be deliberately selected to send
an email. Keep database migrations and function deployments in the deployment
checklist; a frontend-only deploy must not be treated as a backend migration.

### 4a. Email delivery limits and customization

Supabase's **free tier** locks email configuration: custom SMTP, custom email
templates, and rate-limit changes are silently ignored (HTTP 200 but not
applied). Concretely the free tier caps `rate_limit_email_sent` at **2 emails
per hour** project-wide and always uses the stock magic-link template (link
only, **no 6-digit code**).

Unlocking codes + sane limits requires either:

- **Upgrade to Pro** (custom SMTP/templates/limits become available), then
  apply `docs/magic-link-email-template.html` (token-hash link + code) via
  the dashboard or `PATCH /config/auth`, and raise the rate limit; or
- **Custom SMTP on Pro** (e.g. Resend — set `smtp_host=smtp.resend.com`,
  `smtp_port=465`, user/pass = the Resend API key, and a verified sender
  domain).

Until then the magic-link (fragment-flow) sign-in works and is correctly
redirected to the deployed origin; the email-code path is implemented in the
app but the email cannot yet carry a code on the free tier.

### 4b. Administrator allow-list

By default any address can be invited as a workspace administrator. To
restrict who may _become_ an admin (contributor invitations stay open to any
address), configure allow-list patterns — exact emails and/or `@domain`
suffixes. Two equivalent sources, checked in order:

1. The `ALLOWED_EMAIL_PATTERNS` secret (takes precedence when set):

```bash
supabase secrets set \
  ALLOWED_EMAIL_PATTERNS='info@gabrielepizzi.com,@fieldteam.org' \
  --project-ref "$SUPABASE_PROJECT_REF"
```

2. Otherwise the `private.allowed_admin_patterns` table (manageable via SQL):

```sql
insert into private.allowed_admin_patterns (pattern) values
  ('info@gabrielepizzi.com'),
  ('@fieldteam.org');
```

Administrator invitations are rejected with 403 unless the address matches a
pattern; contributors can always be invited to projects without restriction.

### 5. Optional reminder email

Contributor pings use a provider-abstracted mail helper. With Resend:

```bash
supabase secrets set RESEND_API_KEY=re_... MAIL_FROM='Collect <fieldwork@example.org>' --project-ref "$SUPABASE_PROJECT_REF"
```

Email delivery is provider-backed and never part of synchronization
correctness.

## Install on iPhone

Open the deployed app in Safari, tap **Share**, choose **Add to Home Screen**,
then tap **Add**. Open `collect` from the new Home Screen icon before
fieldwork; the installed PWA keeps the application shell available when the
connection disappears. The sign-in screen repeats these steps on iPhone when
the app is not already installed.
