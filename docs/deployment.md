# Deployment

This guide provisions a new `collect` instance with Supabase and deploys the frontend to Vercel. Equivalent hosting is possible, but the included automation targets this stack.

## Deployment model

| Component      | Service                                       | Contents                                                                      |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Frontend       | Vercel or compatible static host              | Public PWA bundle and service worker                                          |
| Database       | Supabase Postgres                             | Organizations, projects, schemas, submissions, consent, readiness, audit data |
| Object storage | Supabase Storage                              | Private original media and checkpoint packages                                |
| Privileged API | Supabase Edge Functions                       | Authenticated ingestion, invitations, device linking, reminders, export       |
| Email          | Supabase Auth and optional Resend integration | Authentication links/codes, invitations, reminders                            |

No service-role secret belongs in the frontend bundle.

## Prerequisites

- Node.js 22 and npm
- Deno 2
- Supabase CLI
- Supabase project and access token
- Vercel project and token, or an equivalent static-host deployment
- Canonical HTTPS application origin
- Initial administrator email address

Review the current Supabase and email-provider plan limits before production use. Authentication template, sending-rate, and custom SMTP capabilities can change independently of this repository.

## Provision in one command

Export the required values:

```bash
export SUPABASE_ACCESS_TOKEN=...
export SUPABASE_PROJECT_REF=...
export APP_URL=https://your-collect.example.org
export BOOTSTRAP_ADMIN_EMAIL=admin@example.org
export VITE_SUPABASE_PUBLISHABLE_KEY=...

# Supply only when the CLI requires it.
export SUPABASE_DB_PASSWORD=...

npm run provision -- --issue-magic-link
```

`npm run provision`:

1. validates the canonical application origin;
2. configures the Supabase Auth site URL, redirect allow-list, and supported email template;
3. links the local Supabase directory;
4. applies ordered database migrations;
5. sets `APP_URL` and `BOOTSTRAP_ADMIN_EMAIL` as Edge Function secrets;
6. deploys every application Edge Function listed in `scripts/provision.mjs`;
7. optionally requests one authentication link for the bootstrap administrator.

The `--issue-magic-link` flag is explicit because it sends an email. The script does not print or store the one-time token.

Optional inputs:

| Variable                 | Purpose                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `SUPABASE_REDIRECT_URLS` | Comma-separated additional allowed Auth origins for controlled previews or local development |
| `VITE_SUPABASE_ANON_KEY` | Legacy fallback for the publishable browser key                                              |
| `SUPABASE_CLI_COMMAND`   | Alternative Supabase CLI executable                                                          |

## Manual provisioning

### Apply migrations

```bash
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push --linked
```

Migrations create and harden:

- organizations, memberships, projects, invitations, and immutable schemas;
- submissions, original-media metadata, devices, readiness, checkpoints, and audit events;
- versioned consent and contributor profiles;
- attention-check reference data and responses;
- private device-link codes and administrator allow-list patterns;
- private media and checkpoint storage buckets;
- row-level security, security-invoker views, triggers, and restricted remote procedure calls.

Never edit and reapply a migration that may already exist in a target database. Add a new ordered migration.

### Deploy Edge Functions

The source directories under `supabase/functions/` define the deployable functions. `supabase/config.toml` disables platform JWT verification for these endpoints because each function performs its own bearer-token and authorization checks; the health endpoint must remain anonymous.

```bash
for function in \
  health \
  claim-invites \
  device-status \
  link-session \
  send-admin-invite \
  send-project-invite \
  send-project-ping \
  export-checkpoint \
  sync-submission \
  bootstrap-workspace
do
  supabase functions deploy "$function" \
    --project-ref "$SUPABASE_PROJECT_REF"
done
```

Keep this list synchronized with `scripts/provision.mjs`.

### Configure function secrets

```bash
supabase secrets set \
  APP_URL=https://your-collect.example.org \
  BOOTSTRAP_ADMIN_EMAIL=admin@example.org \
  --project-ref "$SUPABASE_PROJECT_REF"
```

Optional reminder delivery:

```bash
supabase secrets set \
  RESEND_API_KEY=re_... \
  MAIL_FROM='Collect <fieldwork@example.org>' \
  --project-ref "$SUPABASE_PROJECT_REF"
```

Optional administrator allow-list:

```bash
supabase secrets set \
  ALLOWED_EMAIL_PATTERNS='admin@example.org,@research.example.org' \
  --project-ref "$SUPABASE_PROJECT_REF"
```

`ALLOWED_EMAIL_PATTERNS` accepts exact email addresses and `@domain` suffixes. It limits administrator invitations only; project contributor invitations remain independent.

If the secret is absent, the server reads `private.allowed_admin_patterns`. Manage table entries through an ordered migration or a controlled database-administration procedure.

## Configure authentication

Set the Supabase Auth **Site URL** to the canonical HTTPS application origin. Add only controlled origins to the redirect allow-list.

The passwordless email template should return through the token-hash callback:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Open collect
</a>
```

If the provider and plan support an email one-time token, include:

```html
<p>Or enter this code in the app: <strong>{{ .Token }}</strong></p>
```

Use [`magic-link-email-template.html`](magic-link-email-template.html) as the maintained template source. Do not hard-code a localhost origin.

`VITE_APP_URL`, the Supabase Site URL, the function `APP_URL` secret, and the production host must refer to the same canonical origin. Mismatches cause broken return links or cross-origin failures.

Email security scanners may consume one-time links. The interface supports requesting a fresh link and, when configured, entering the token directly.

## Bootstrap the first administrator

On an empty database, the authenticated address matching `BOOTSTRAP_ADMIN_EMAIL` can call `bootstrap-workspace`. The function creates the organization and initial administrator membership atomically.

1. Provision the instance with the bootstrap email.
2. Open the canonical application origin.
3. Request the newest passwordless email link for that exact address.
4. Complete authentication and password setup.
5. Open the administrator surface at `/?role=admin`.

After an organization exists, ordinary users cannot bootstrap another one. Invite later administrators through the administrator interface and configure the allow-list when required.

## Frontend environment

Set:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_APP_URL=https://your-collect.example.org
VITE_APP_VERSION=0.1.2
VITE_ORGANIZATION_NAME=Your organization
```

`VITE_SUPABASE_ANON_KEY` remains a legacy fallback. Never create a `VITE_` variable containing:

- `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_ACCESS_TOKEN`;
- a database password;
- a Vercel token;
- an SMTP or Resend credential.

Build and deploy:

```bash
npm ci
npm run check
vercel --prod
```

## GitHub Actions deployment

The **Deploy collect** workflow provisions Supabase, builds the Vercel bundle, and deploys production. Configure these repository secrets:

| Secret                          | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`         | Supabase Management API and CLI authentication  |
| `SUPABASE_PROJECT_REF`          | Target project                                  |
| `SUPABASE_DB_PASSWORD`          | Database migration authentication when required |
| `APP_URL`                       | Canonical application origin                    |
| `BOOTSTRAP_ADMIN_EMAIL`         | First-administrator guard                       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key                       |
| `VERCEL_TOKEN`                  | Vercel deployment authentication                |
| `VERCEL_ORG_ID`                 | Vercel account or team                          |
| `VERCEL_PROJECT_ID`             | Vercel project                                  |

The workflow’s `issue_magic_link` input defaults to false. Enable it only when a new bootstrap email should be sent.

Database migrations and Edge Function deployments are part of the release. A frontend-only deployment does not apply backend changes.

## Install on iPhone

1. Open the canonical contributor URL in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Open the new icon.
5. From a signed-in browser or device, open **Profile → Sign in another device**.
6. Enter the generated eight-character code in the installed app.

Install the administrator surface separately from `/?role=admin` when required. The contributor and administrator manifests use distinct names, icons, and appearances.

## Release verification

Before declaring an instance ready:

1. confirm the production URL returns the expected PWA shell;
2. sign in through the browser path;
3. link an installed iOS container with a device code;
4. create, save, close, and reopen an offline observation;
5. synchronize structured data and at least one media object;
6. confirm the local state changes only after a matching server receipt;
7. verify administrator readiness;
8. export and inspect a checkpoint ZIP;
9. create and inspect a local recovery export;
10. review browser and function logs for sensitive data.

A green frontend build does not verify synchronization, authorization, email, storage, or checkpoint generation.

## Upgrades

For every release:

1. back up the database according to the deployment’s operational policy;
2. review new migrations and Edge Functions;
3. run CI and a preview deployment;
4. apply migrations in order;
5. deploy every changed Edge Function;
6. deploy the frontend;
7. execute the affected end-to-end flows;
8. retain the prior deploy as a rollback candidate.

Do not roll the frontend back across an incompatible local-database or server migration without an explicit compatibility plan.

## Common failures

| Symptom                                           | Check                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Email link returns to localhost or a preview      | Align `VITE_APP_URL`, Auth Site URL, redirect allow-list, and `APP_URL`                                       |
| Installed iOS app is signed out                   | Expected separate container; use a device-link code or another configured sign-in path                        |
| Device code is rejected                           | Confirm `link-session` is deployed, migrations are applied, and the code is current                           |
| Administrator invitation returns 403              | Review `ALLOWED_EMAIL_PATTERNS` or `private.allowed_admin_patterns`                                           |
| Health works but synchronization fails            | Inspect Edge Function deployment, membership, consent, schema version, storage policy, and media completeness |
| Frontend works but new backend behavior is absent | Apply migrations and deploy the corresponding Edge Functions                                                  |
| Authentication email has no code                  | Review the current Supabase Auth template, SMTP configuration, and plan capabilities                          |

## Related documentation

- [Architecture](architecture.md)
- [User and system flows](flows.md)
- [Privacy and data handling](privacy.md)
- [Contributing](../CONTRIBUTING.md)
