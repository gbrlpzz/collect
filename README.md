# collect

**Field data collection that never loses an observation.**

`collect` is a mobile-first, offline-first field data collector for scientific research, ecological monitoring, territorial work, surveys, inventories, and structured observation — built for places where connectivity is unreliable.

The interface is calm and radically simple. The infrastructure is the opposite: a durable local ledger, a resumable synchronization protocol, and server receipts that mean exactly what they say. That combination is the product: **you can trust it with three days of fieldwork in a place with no signal.**

```text
Contributor:   Open → Observe → Submit
Administrator: Create → Define → Assign → Monitor → Export
```

## Why collect exists

Most survey software is either a generic form builder or a fragile online tool. Fieldwork — rural surveys, ecological monitoring, territorial inspection — needs a different contract:

- **Saved means saved.** A submission and its media commit to on-device storage _before_ the app says anything. A "Saved on this device" receipt never depends on the network.
- **Synced means synced.** Only a durable server finalization receipt moves a record to synced. Metadata, media, finalization: three phases, each resumable, none skippable.
- **Kill the app, drop the connection, wait a week.** The queue, drafts, media, and receipts all survive. Nothing is discarded until the server acknowledges it.
- **Evidence stays honest.** Published schemas are immutable; finalized observations are immutable; conflicts are explicit, never silently overwritten; every record carries full provenance (who, what schema, which device, when, where, which app version).
- **The dataset is yours.** Checkpoint exports produce a plain ZIP — JSONL, CSV, GeoJSON, schema history, media, manifest — readable without this application.

## What it feels like

**Contributors** sign in with a magic link and see **New observation** first. The assigned project is quiet context (and only becomes a picker when there is more than one), so recording what they observed is always the shortest path. Photos and location work fully offline; location is captured automatically in the background. The outbox syncs in the background and the sync sheet is available only for status, retry, and recovery. Server readiness follows durable receipts automatically — contributors do not announce that syncing is complete.

**Administrators** create a workspace, define the form from a deliberately small set of strongly typed fields (text, number, single/multiple choice, yes/no/unknown, date, datetime, location, photo, audio, repeatable groups), publish immutable schema versions, invite contributors by email, watch device-reported readiness, ping stragglers, and export reproducible checkpoints — or a final dataset once every contributor is confirmed.

## Technology

- **Client** — React 19 + TypeScript + Vite PWA, installable on iPhone/Android/desktop. IndexedDB local ledger (drafts, submissions, media, outbox, receipts, device state) with a durable multi-tab sync lease.
- **Sync** — metadata → TUS resumable media upload → server finalization. Exponential backoff with jitter, health-probe gating, retry on launch/foreground/online/schedule.
- **Backend** — Supabase: Postgres with row-level security on every table, private storage buckets, Edge Functions for all privileged ingestion and export. No service credentials ever reach the browser.
- **Design** — Apple HIG-inspired, monochrome, system typography, dark/light appearance, text-first states, generous touch targets.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase credentials the app opens a clearly labeled local interface preview (no server receipts). The real contract needs a Supabase project:

```bash
npm run check
```

## Deploy your own instance

The repository is designed to be redeployed against any Supabase project and any Vercel project — no dependency on a hosted account. Configuration lives in environment variables; migrations, Edge Functions, and provisioning are all in-repo.

```bash
export SUPABASE_ACCESS_TOKEN=...          # Supabase account token; keep it private
export SUPABASE_PROJECT_REF=...           # for example lrqlrufwrytpwhgclmyo
export APP_URL=https://your-collect.vercel.app
export BOOTSTRAP_ADMIN_EMAIL=admin@example.org
export VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

npm run provision -- --issue-magic-link
```

`npm run provision` configures Auth (magic-link template, redirect URLs), applies the ordered migrations, deploys every Edge Function, and can request the first administrator’s sign-in link. It never prints or stores one-time tokens, and the service-role key stays inside Edge Functions. The included **Deploy collect** GitHub Actions workflow runs the same path end-to-end (tests → provision → build → deploy).

Read `docs/architecture.md` for the reliability boundaries and backend contract, `docs/export-format.md` for the checkpoint package specification, and `docs/design.md` for the interface baseline.

## Repository layout

```text
src/                    React PWA — contributor + administrator surfaces
src/app/                application orchestration, local submission, sync, recovery
src/components/ui/      shared controls and feedback primitives
src/data/               demo fixtures and sample schemas
src/styles/             ordered CSS layers: foundation, native, geometry
src/lib/                local ledger, sync adapter, admin adapter, protocol
supabase/migrations/    canonical Postgres/RLS/storage schema (immutable history)
supabase/functions/     Edge Functions: ingestion, finalization, invites, export
scripts/                provisioning and deploy helpers
docs/                   architecture, design, export format, implementation plan
tests/                  vitest suites (local ledger invariants, sync protocol)
```

## License and business model

`collect` is licensed under the **Apache License 2.0** — a permissive, OSI-approved open-source license. Copyright © 2026 **Gabriele Pizzi**. You can use, modify, distribute, and build on the software for any purpose, including commercially, subject only to the standard Apache terms (retain the license notice, state your changes, no trademark use).

How the project stays sustainable:

- **Hosted service** — a managed deployment for organizations that want SLAs, backups, data-residency, and one-click provisioning (the software is open; the operated service is the product).
- **Support and implementation** — deployment, training, and field-program support for institutions.
- **Enterprise features (open core)** — future advanced features ship under a separate commercial license, never weakening the Apache core.
- **Trademarks** — the `collect` name and logos are not granted by the license.

The core collection path — the part that must earn a researcher's trust — remains open forever.

## Contributing

Read `AGENTS.md` for the product principles and the invariants every change must preserve (local receipts before UI promises, server receipts before `SYNCED`, immutable schemas and evidence, service-role confinement, no AI in the collection path). Run `npm run check` and `git diff --check` before opening a change.
