# collect

`collect` is an open-source, mobile-first, offline-first field data collector for scientific research, ecological monitoring, territorial work, surveys, inventories, and structured observation where connectivity is unreliable.

The project is part of an open, well-designed science stack. Too much science software is badly designed; too much well-designed software is not reliable enough for fieldwork. `collect` is an attempt to do both: a calm, native-feeling interface with infrastructure that treats field observations as evidence, while keeping the whole stack open and deployable by the organizations that use it.

The contributor experience is intentionally small:

```text
Open → Observe → Submit
```

The administrator experience is:

```text
Create → Define → Assign → Monitor → Export
```

Design is part of robustness. In difficult field conditions, accessible controls, low cognitive load, and clear local/sync states reduce observation mistakes and improve the quality of the resulting scientific data.

## What the MVP guarantees

- A local receipt is shown only after the submission, media metadata/blobs, and outbox operations commit to IndexedDB.
- Every submission and media object has a stable client-generated ID before network work begins.
- Sync is metadata → media → finalization. Only a durable server finalization receipt can move a local record to `SYNCED`.
- Same-ID/different-content conflicts are explicit; finalized observations are immutable.
- Published schema versions are immutable and historical observations retain their original version.
- Local data, media, drafts, and the outbox survive refresh, app termination, intermittent connectivity, and later relaunches.
- Unsynced data can be exported from the device as a recovery ZIP.
- Storage persistence is requested and quota pressure is surfaced without deleting unsynced fieldwork.

The browser cannot promise survival after physical device destruction, manual site-data clearing, or complete browser removal. Persistent storage remains under browser control; recovery export is the explicit escape hatch.

## Run locally

```bash
npm install
npm run dev
```

The local build and tests are:

```bash
npm run build
npm test
```

Without Supabase variables, the app opens a clearly labeled local interface preview. That preview is not a field deployment and does not provide server receipts.

## Deploy a new instance

The repository is designed to be redeployed against a new Supabase project and a new Vercel project. No service-role secret belongs in the browser.

### 1. Create Supabase

Create a Supabase project in the region appropriate for the field organization. Apply the migrations in filename order:

```bash
supabase db push --project-ref "$SUPABASE_PROJECT_REF"
```

The migrations create Postgres tables, RLS policies, private Storage buckets, immutable-schema/submission protections, and the race-safe first-workspace function.

Deploy the Edge Functions:

```bash
for function in health claim-invites device-status send-project-invite send-project-ping export-checkpoint sync-submission; do
  supabase functions deploy "$function" --project-ref "$SUPABASE_PROJECT_REF"
done
supabase functions deploy bootstrap-workspace --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
```

The functions authenticate the bearer token themselves with the Supabase service client. The service-role key is used only inside Edge Functions.

### 2. Configure Auth before the first login

In Supabase Authentication → URL Configuration:

- set **Site URL** to the deployed app origin, for example `https://your-collect.vercel.app`;
- add the deployed origin and local development origin to **Additional Redirect URLs**;
- configure a trusted SMTP provider for production email delivery.

Magic links are one-time links and expire. `collect` now detects an expired callback, preserves the last email address in the current browser session, and offers **Send a new link** from the same screen. If an email security scanner consumes a link first, request another link rather than reusing the old one.

### 3. Establish the first administrator

For a fresh deployment, set the optional bootstrap guard before the first sign-in:

```bash
supabase secrets set \
  APP_URL=https://your-collect.vercel.app \
  BOOTSTRAP_ADMIN_EMAIL=admin@example.org \
  --project-ref "$SUPABASE_PROJECT_REF"
```

Open the app, request a magic link for that exact address, sign in, and create the first project. The first project setup names the workspace. The `bootstrap-workspace` function creates the organization and its initial admin membership atomically, and only while the database has no organization yet. If `BOOTSTRAP_ADMIN_EMAIL` is omitted, the first authenticated user can bootstrap an empty database; setting it is recommended.

To add another administrator after they have authenticated once, an existing administrator can run this intentionally explicit SQL in the Supabase SQL editor:

```sql
insert into public.organization_members (organization_id, user_id, role)
select 'YOUR_ORGANIZATION_UUID', id, 'admin'
from auth.users
where lower(email) = lower('another-admin@example.org')
on conflict (organization_id, user_id)
do update set role = 'admin';
```

The user can then request a fresh magic link from the app and will see the Admin surface. Contributor invitations remain project-scoped and do not grant administrator access.

### 4. Deploy the frontend

Set these Vercel environment variables for Preview and Production:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_APP_VERSION=0.1.1
VITE_ORGANIZATION_NAME=Your organization
```

`VITE_SUPABASE_ANON_KEY` is accepted as a legacy fallback. Never use `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` variable.

Then deploy:

```bash
npm run build
vercel --prod
```

For a fully automated deployment, connect the GitHub repository to Vercel and enable production deployments from `main`. Keep database migrations and function deployments in the deployment checklist; a frontend-only deploy must not be treated as a backend migration.

Optional reminder email delivery is provider-backed and never part of synchronization correctness:

```bash
supabase secrets set RESEND_API_KEY=re_... MAIL_FROM='Collect <fieldwork@example.org>' --project-ref "$SUPABASE_PROJECT_REF"
```

## Architecture

- `src/` — React/Vite PWA and contributor/admin surfaces.
- `src/lib/localStore.ts` — IndexedDB persistence, local receipt boundary, lease, recovery data.
- `src/lib/remoteBackend.ts` — contributor synchronization adapter.
- `src/lib/adminBackend.ts` — project, schema, contributor, readiness, and export adapter.
- `supabase/migrations/` — canonical Postgres/RLS/storage schema.
- `supabase/functions/` — authenticated ingestion, finalization, invitations, heartbeat, exports, and first-workspace bootstrap.
- `docs/architecture.md` — reliability boundaries and backend contract.
- `docs/design.md` — Apple HIG-inspired UI baseline.
- `AGENTS.md` — instructions for coding agents and maintainers.

## Reliability boundary

Never treat `navigator.onLine`, request initiation, a successful media upload, or an optimistic UI update as synchronization. Only the server finalization receipt can make a submission `SYNCED`. Never delete unsynced records or media automatically. Never put research payloads, coordinates, media URLs, or service credentials into production telemetry.

## License and business model

The core is licensed under **GNU Affero General Public License v3 or later**. This keeps the science stack open, allows commercial use and paid hosted operation by us or others, and requires operators of modified network versions to offer the corresponding source to the people who use them. It is a better fit for a networked science tool than a source-available restriction while the project is intended to remain genuinely open.

The `collect` name, logos, and other brand assets are not granted by the software license. Hosted operations, support, implementation, managed infrastructure, and future proprietary services can be monetized separately. If a future commercial licensing exception is needed, it should be introduced as a separately reviewed dual-licensing policy rather than quietly weakening the open-source terms.
