# collect

`collect` is a mobile-first, offline-first field data collection interface for scientific research, territorial work, ecological monitoring, and structured observation.

This repository contains the MVP collector and its local-first storage foundation. It is deliberately presented as a calm Apple HIG-inspired field surface while the hard guarantees live below the interface:

- drafts persist in IndexedDB while a contributor works;
- a submission crosses an explicit local transaction boundary before the UI shows a local receipt;
- submissions, media, outbox operations, and receipts have separate durable stores;
- stable client IDs are generated before any future network operation;
- a recovery ZIP can be exported from the device, including schemas, JSONL records, metadata, and captured media blobs;
- persistence/quota status is checked through the browser Storage API;
- the service worker is only an application-shell enhancement, never the only copy of field data.

The production adapter uses Supabase Auth, Postgres, private Storage/TUS uploads, RLS policies, and server finalization. When credentials are absent, the app remains available in a clearly labeled local review mode.

## Run locally

```bash
npm install
npm run dev
```

The production build is checked with:

```bash
npm run build
```

## Supabase setup

The canonical backend is described in `supabase/migrations/20260809180000_collect_mvp.sql` and the Edge Functions under `supabase/functions/`.

1. Create a Supabase project and configure Auth email/magic-link URLs for the Vercel origin.
2. Apply the migration in the Supabase SQL editor or with the Supabase CLI.
3. Deploy the functions with `supabase functions deploy` from the repository.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel. Never put a service-role key in client variables.

Contributor invitations use Supabase Auth email. Optional administrator reminder emails use the provider adapter in `send-project-ping`; set the Edge Function secrets `RESEND_API_KEY` and `MAIL_FROM` when a mail provider is available. Collection and synchronization do not depend on reminder delivery.

The service role is used only inside Edge Functions. Submission sync is metadata → resumable media → finalization; the browser marks a record synced only after the finalization receipt. `collect-media` and `collect-exports` are private buckets.

## Product surfaces

- **Fieldwork**: assigned project, offline-ready project overview, structured collector, local receipt, sync sheet, recovery export.
- **Admin**: project dashboard, readiness list, schema version setup, contributor management, checkpoint export, and project creation wizard.

The top-right surface switch is a review shortcut for the MVP. Authentication and role enforcement belong to the Supabase-backed production shell.

## Infrastructure boundaries

The collector should eventually call a `BackendAdapter` with these operations:

1. create idempotent submission metadata;
2. upload each media object with a stable object path and resumable protocol;
3. finalize only after every expected media object is acknowledged;
4. return a durable receipt;
5. report device/project heartbeat separately.

Never treat request initiation, `navigator.onLine`, or a successful media upload as a completed submission. Only the server finalization receipt may move a local record to `SYNCED`. The no-credentials demo adapter is useful for interface review, but it is not a field deployment.
