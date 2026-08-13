# Architecture

This document describes the current implementation boundaries and the invariants that protect field evidence. The [product specification](spec.md) remains the requirements baseline; this page explains how the shipped system enforces it.

## System context

`collect` consists of:

- a React and TypeScript progressive web application;
- an IndexedDB local ledger scoped to the authenticated account;
- a synchronization engine using health probes, durable outbox operations, leases, retries, and TUS media uploads;
- Supabase Postgres with row-level security and immutable-record triggers;
- private Supabase Storage buckets;
- Edge Functions for privileged authorization, ingestion, invitations, device linking, readiness, reminders, and checkpoint export.

The contributor interface is intentionally smaller than this infrastructure.

## Client code boundaries

| Path                          | Responsibility                                                         |
| ----------------------------- | ---------------------------------------------------------------------- |
| `src/App.tsx`                 | Composition shell, route-level lazy loading, and surface wiring        |
| `src/app/useAppController.ts` | Session, workspace, and application orchestration                      |
| `src/app/submission.ts`       | Local validation and atomic submission boundary                        |
| `src/app/syncController.ts`   | Synchronization execution and per-item isolation                       |
| `src/app/useSyncLifecycle.ts` | Automatic lifecycle triggers and single-flight coordination            |
| `src/app/recovery.ts`         | Local recovery package creation                                        |
| `src/components/`             | Contributor and administrator feature surfaces                         |
| `src/components/ui/`          | Shared accessible controls, feedback, sheets, and dialogs              |
| `src/lib/localDatabase.ts`    | IndexedDB names, stores, requests, and transaction primitives          |
| `src/lib/localStore.ts`       | Domain records, media, outbox operations, receipts, migrations         |
| `src/lib/syncProtocol.ts`     | Shared synchronization types and state transitions                     |
| `src/styles/`                 | Ordered foundation, native interaction, and responsive geometry layers |

Feature components do not open IndexedDB stores or call privileged backend endpoints directly. New behavior should enter through a domain module or application controller rather than expanding the composition shell.

Collector, project detail, synchronization, project creation, and administration load as route-level chunks. Contributor sign-in and the capture-first home surface do not download administration code.

## Receipt boundaries

### Local receipt

```text
draft change
  → persist draft
submit
  → validate required values
  → commit submission + media + outbox in one transaction
  → show “Saved on this device”
```

The interface cannot show the local receipt before the transaction completes. A failed network request cannot invalidate that receipt because the network is outside the boundary.

### Server receipt

```text
health probe
  → metadata ingestion
  → media upload or confirmation
  → server finalization
  → validate matching receipt
  → mark local submission SYNCED
```

A request start, metadata row, completed upload, or optimistic client state is not a server receipt.

## Local ledger

The local database contains projects, drafts, submissions, media blobs, outbox operations, receipts, and device state. Important properties:

- Submission and media identifiers exist before network work.
- Media blobs have one durable home rather than being copied into every application snapshot.
- Submitted media cannot be overwritten by a late draft write.
- A late autosave cannot downgrade a `SYNCED` submission.
- Recovery reads durable stores directly and tolerates an unreadable individual blob.
- Database upgrades snapshot source keys and values before opening a scoped write transaction.

Do not await unrelated work while an IndexedDB write transaction is open. Browsers may auto-commit a transaction as soon as its request queue becomes empty.

## Per-account and per-container storage

Each authenticated account uses `collect-local-v1-<userId>`. Switching accounts on a shared device therefore does not mix drafts, media, or outbox operations. `migrateLegacyDatabase()` adopts legacy unscoped data into the first account that opens after upgrade.

On iOS, Safari and an installed progressive web app use separate containers for sessions, IndexedDB, local storage, service workers, and caches. Consequences:

- signing in to Safari does not sign in the installed app;
- local drafts and media do not cross containers;
- each container has its own device identifier and readiness row;
- the server becomes the shared source of truth only after synchronization;
- a device-link code creates a session in another container without copying local data.

## Synchronization

### Triggers

Synchronization may start after a local save, application launch, foreground transition, browser `online` event, due-work scheduler tick, stale-lease recovery, manual retry, or supported Background Sync event.

All triggers enter the same single-flight path. Background execution improves timeliness but is not required for eventual correctness after the application reopens.

### Reachability and concurrency

- The client probes the health Edge Function with a timeout. It never treats `navigator.onLine` as server reachability.
- A durable lease permits one synchronization owner across tabs and windows.
- Expired `IN_PROGRESS` work returns to the queue after a killed owner.
- Media upload concurrency is bounded.
- One failed submission does not block unrelated queued submissions.

### Failure classification

Transient failures use exponential backoff with jitter. Examples include timeouts and temporary server unavailability.

Permanent failures become `ACTION_REQUIRED` and stop automatic retry. Examples include a revoked assignment, immutable-schema conflict, closed project, missing local media, or integrity mismatch.

### Idempotency

A reused submission identifier is accepted only when the project, contributor, schema, payload hash, declared media count, and media tuples match the existing record. Any same-identifier/different-content request is a conflict rather than an overwrite.

The client confirms media server-first. If the server already acknowledges an object, the client does not upload it again. Finalization uses an atomic update and returns the stored receipt to concurrent or crash-recovery retries.

## Stable identity and object paths

Submission and media UUIDs are generated before transfer. Remote media paths are deterministic:

```text
projects/{project_id}/submissions/{submission_id}/{media_id}
```

Stable identity supports safe retry, conflict detection, and recovery.

## Schema history and evidence immutability

Published schema versions are immutable. Every observation records the schema version used during collection. Editing a published form creates a new draft version; it does not reinterpret historical submissions.

Finalized submissions are protected from ordinary mutation. Corrections should create linked successor records rather than overwrite evidence.

## Backend authorization

Row-level security is enabled on exposed tables. Access derives from `organization_members` and `project_members`, never from client-controlled metadata or interface state.

Privileged operations authenticate the bearer token through the shared Edge Function helper and then perform server-side membership checks. The service-role key remains inside Edge Functions.

Reference data and service-only remote procedure calls are protected by the hardening migrations. The client reads projects through the security-invoker `project_overviews` view so underlying row-level security remains active.

## Authentication

Accounts are invite-only. The ordinary sign-in screen must not create unrestricted accounts.

| Path                    | Intended context      | Mechanism                                                                                                               |
| ----------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Passwordless email link | Browser default       | Supabase one-time link returning to the canonical deployed origin                                                       |
| Device-link code        | Installed iOS default | Signed-in session creates an eight-character, single-use code; the target container exchanges it through `link-session` |
| Password                | Secondary path        | Password set after invitation or first link sign-in                                                                     |
| Email code              | Configured fallback   | Six-digit token supplied by the authentication email template                                                           |

Device-link codes are stored only as SHA-256 digests. Creation and atomic consumption use service-only remote procedure calls; browser roles cannot read or execute the underlying private operations directly.

## Consent

The client presents the current `consent_versions` record after first sign-in. `contributor_profiles` stores the accepted version and timestamps. `sync-submission` refuses server ingestion when consent is missing or revoked.

This is a technical enforcement boundary. Deployments remain responsible for appropriate consent language, legal basis, institutional review, withdrawal, and retention procedures. See [Privacy and data handling](privacy.md).

## Attention verification

The collector injects one configured quick check after at least two research fields. The selected synthetic value is separated before the research payload is hashed and committed.

The server:

1. looks up the active check by stable key;
2. derives correctness against its own bank;
3. writes one idempotent response per submission;
4. sets `submissions.attention_failed`;
5. recomputes the contributor’s guess-adjusted summary.

The score and totals are advisory metadata. They are visible with an explanation and included in checkpoints; they do not change or remove research data. See [Attention verification](attention-qa.md).

## Provenance

Each observation records the provenance exposed by the platform:

- contributor and installation-scoped device identifiers;
- schema and application versions;
- client timestamps, timezone, and language;
- location, accuracy, capture time, and source;
- device family, operating system, browser, screen, and orientation;
- connection and battery context.

When a published schema declares any location field, location access becomes a collection prerequisite regardless of whether the field was marked optional. Previously granted access is checked and used automatically; otherwise the collector presents a contextual permission gate. Collection stays locked after denial or an unavailable position, re-checks access after the contributor returns from device settings, and refreshes the position at save. Projects without a location field never request location access.

## Readiness

Device heartbeats derive counts from the durable outbox rather than in-memory state. They are coalesced, omitted from administrator-only surfaces, and sent when appropriate.

`fieldwork_complete` is derived when the durable outbox is empty and no draft is in progress. Administrator readiness aggregates every known device for the contributor. It cannot describe a device that has never reported or work that remains only on an offline device.

## Checkpoints and recovery exports

A checkpoint is created from complete server submissions at a cutoff timestamp. It records schema versions, record and media counts, readiness at cutoff, and package integrity metadata.

A recovery export is created from one local container and may include unsynced drafts or submissions. It is an escape hatch, not a canonical dataset.

See [Checkpoint export format](export-format.md) for the package contract.

## Application shell and updates

The build emits a precache manifest for the hashed application shell. The service worker caches the shell and runtime assets while ensuring navigation fallback is not applied to arbitrary asset requests.

Cache version changes replace prior shell versions deliberately. Application updates must not erase or migrate local evidence without a forward-compatible local migration.

## Browser limitations

The browser cannot guarantee survival after physical device destruction, manual site-data clearing, browser removal, or all operating-system storage eviction. Persistent-storage requests and quota monitoring reduce risk but do not remove platform control.

The architecture therefore combines:

- explicit local receipt semantics;
- automatic server transfer when reachable;
- local recovery export;
- server checkpoints;
- honest interface language about what each boundary proves.

## Related documentation

- [User and system flows](flows.md)
- [Privacy and data handling](privacy.md)
- [Background automation](background-automation.md)
- [Deployment](deployment.md)
- [Product specification](spec.md)
