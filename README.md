# collect

**Field data collection that never loses an observation.**

`collect` is a mobile-first, offline-first field data collector for scientific research, ecological monitoring, territorial work, surveys, inventories, and structured observation — built for places where connectivity is unreliable.

The interface is calm and radically simple. The infrastructure is the opposite: a durable local ledger, a resumable synchronization protocol, and server receipts that mean exactly what they say. That combination is the product: **you can trust it with three days of fieldwork in a place with no signal.**

```text
Contributor:   Open → Observe → Submit
Administrator: Create → Define → Assign → Monitor → Export
```

> **The value in one line:** the dataset you export is the fieldwork you
> actually did — every observation saved on-device before anything is
> promised, synced only on a durable server receipt, verified by automatic
> attention QA, and packaged with the FAIR metadata a published dataset
> needs. See [`docs/value.md`](docs/value.md) for the full case.

## Why collect exists

Most survey software is either a generic form builder or a fragile online tool. Fieldwork needs a different contract:

- **Saved means saved.** A submission and its media commit to on-device storage _before_ the app says anything. A "Saved on this device" receipt never depends on the network.
- **Synced means synced.** Only a durable server finalization receipt moves a record to synced. Metadata, media, finalization: three phases, each resumable, none skippable.
- **Kill the app, drop the connection, wait a week.** The queue, drafts, media, and receipts all survive. Nothing is discarded until the server acknowledges it.
- **Evidence stays honest.** Published schemas are immutable; finalized observations are immutable; conflicts are explicit, never silently overwritten; every record carries full provenance (who, what schema, which device, when, where, which app version).
- **The dataset is yours.** Checkpoint exports produce a plain ZIP — JSONL, CSV, GeoJSON, schema history, media, manifest — readable without this application. Each package also carries **FAIR dataset metadata**: DataCite 4.4 (`dataset/datacite.json`), a data dictionary with semantic mapping hooks, license, dataset contact, and optional DOI — set once on the project, embedded in every export.
- **The quality is measurable.** Every observation carries an automatic attention check, and every contributor carries a guess-adjusted attention score — exported with the dataset, so trust is quantified, not assumed.

## Key features

| Feature                                   | What it means for your science                                                                                                                                                                                                    | Doc                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **FAIR dataset standards**                | Every export is a self-contained, licensed, machine-readable research package: DataCite 4.4 metadata, data dictionary with ontology hooks, license/contact/DOI set once on the project.                                           | [`docs/dataset-standards.md`](docs/dataset-standards.md)         |
| **Automatic attention QA**                | One random, universally valid quick check per observation — options shuffled, answer stripped from the data, verified server-side, guess-adjusted score per contributor, shown to contributor + admin, exported with the dataset. | [`docs/attention-qa.md`](docs/attention-qa.md)                   |
| **Background automation**                 | Sync, heartbeats, readiness, media integrity, receipts, and recovery all run automatically and invisibly; nothing asks the contributor to babysit the machine.                                                                    | [`docs/background-automation.md`](docs/background-automation.md) |
| **Consent that is enforced, not assumed** | Versioned in-app consent at first sign-in; the server refuses submissions without it; consent record travels in exports.                                                                                                          | `docs/PLAN.md` (Consent + profiles)                              |
| **Provenance on every record**            | Who, what schema, which device, when, where, which app version — plus environment and location, captured silently.                                                                                                                | [`docs/background-automation.md`](docs/background-automation.md) |
| **Durable offline contract**              | Saved means saved (atomic local receipt), synced means synced (server finalization receipt), nothing discarded before the server acknowledges it.                                                                                 | [`docs/architecture.md`](docs/architecture.md)                   |

## What's inside

**Automatic attention verification.** Every observation quietly includes one random multiple-choice check (a universally valid question, options shuffled, inserted after the first two questions). The question is never stored — only a binary pass/fail flag on the submission — and every contributor gets a guess-adjusted attention score (0 = indistinguishable from blind guessing, 100 = perfect). The score is shown to the contributor and to the administrator, and it rides along in every export.

**In-app collection consent.** On first sign-in, contributors accept a versioned consent statement that replaces a paper form. The server refuses submissions without it, and the consent record (version + timestamp) is part of the contributor profile and the exports.

**Question order that respects attention.** The form presents the key identifier first (a reference code, or the leading photo in open datasets), then the highest-effort questions first — photos and audio before long text, choices, and short fields — while the contributor is freshest.

**Everything recorded automatically.** Location is captured with every observation after one permission grant (no tapping, no consent prompts per survey). Device model (down to the iPhone/iPad generation), operating system, browser, screen, connection, battery, timezone, and language are recorded silently with every record as provenance. No collection capability ever blocks the save.

**Sign-in that works everywhere.** Password sign-in is the primary flow and works identically in a browser or an installed app. Magic links and one-time email codes remain available, and a device-link code transfers an already-signed-in web session to the installed app without email. Accounts are invite-only: only administrators can invite administrators (optionally restricted to an allow-list), and administrators invite contributors freely.

**Two installable apps, one codebase.** The white-tile **collect** app is the contributor surface. The black-tile **collect Admin** app opens straight into the operations console. Both install from Safari on iPhone.

## What it feels like

**Contributors** sign in (password, link, or code), accept consent once, and see **New observation** first. The assigned project is quiet context (it only becomes a picker when there is more than one). Photos and location work fully offline; location is captured automatically in the background. The outbox syncs in the background and the sync sheet is available only for status, retry, and recovery. Server readiness follows durable receipts automatically — contributors do not announce that syncing is complete.

**Administrators** create a workspace, define the form from a deliberately small set of strongly typed fields, publish immutable schema versions, invite contributors by email, watch device-reported readiness _and_ each contributor's attention score, ping stragglers, and export reproducible checkpoints — or a final dataset once every contributor is confirmed.

## Technology

- **Client** — React 19 + TypeScript + Vite PWA, installable on iPhone/Android/desktop. IndexedDB local ledger (drafts, submissions, media, outbox, receipts, device state) with a durable multi-tab sync lease. Local data is scoped per account, so switching people on a shared device never mixes fieldwork.
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

`npm run check` runs the formatter check, the full test suite, and the production build.

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

`npm run provision` configures Auth (redirect URLs, magic-link template), applies the ordered migrations, deploys every Edge Function, and can request the first administrator's sign-in link. It never prints or stores one-time tokens, and the service-role key stays inside Edge Functions. The included **Deploy collect** GitHub Actions workflow runs the same path end-to-end (tests → provision → build → deploy).

Read [`docs/value.md`](docs/value.md) for the case for the product, `docs/architecture.md` for the reliability boundaries and backend contract, `docs/export-format.md` for the checkpoint package specification, `docs/dataset-standards.md` for the FAIR dataset metadata, `docs/attention-qa.md` for the automatic attention verification, `docs/background-automation.md` for the automation suite, `docs/deployment.md` for the full self-hosting guide, and `docs/design.md` for the interface baseline.

## Repository layout

```text
src/                    React PWA — contributor + administrator surfaces
src/app/                application orchestration, local submission, sync, recovery
src/components/         surface components and the guided collection flow
src/components/ui/      shared controls and feedback primitives
src/data/               demo fixtures, sample schemas, attention-check bank
src/lib/                local ledger, sync adapter, consent, attention, field ordering
src/styles/             ordered CSS layers: foundation, native, geometry
supabase/migrations/    canonical Postgres/RLS/storage schema (immutable history)
supabase/functions/     Edge Functions: ingestion, finalization, invites, export
scripts/                provisioning and deploy helpers
docs/                   architecture, design, deployment, export format, plan
tests/                  vitest suites (ledger, sync, attention, ordering, components)
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

Read `AGENTS.md` for the product principles and the invariants every change must preserve (local receipts before UI promises, server receipts before `SYNCED`, immutable schemas and evidence, consent enforcement, service-role confinement, no AI in the collection path). Run `npm run check` and `git diff --check` before opening a change.
