# Architecture

This document describes the system architecture and technical invariants of `collect`. The [product specification](spec.md) defines the normative requirements. This page explains how the implementation enforces those requirements.

---

## System context

`collect` consists of six main layers:

1. **Client PWA**: A React and TypeScript progressive web application with offline caching.
2. **Local ledger**: IndexedDB database scoped to the authenticated account (`collect-local-v1-<userId>`).
3. **Synchronization engine**: Background queue with health probes, leases, retries, and TUS media uploads.
4. **Database**: Supabase PostgreSQL with Row-Level Security (RLS) and immutable record triggers.
5. **Object storage**: Private Supabase Storage buckets for media and checkpoint archives.
6. **Privileged API**: Supabase Edge Functions for ingestion, authorization, invitations, and exports.

---

## Client code boundaries

| Path                          | Responsibility                                                       |
| :---------------------------- | :------------------------------------------------------------------- |
| `src/App.tsx`                 | Root shell, surface routing, and code-split chunk loading            |
| `src/app/useAppController.ts` | Session lifecycle, active project selection, and state orchestration |
| `src/app/submission.ts`       | Local validation and atomic commit transaction boundary              |
| `src/app/syncController.ts`   | Queue execution, upload workers, and item failure isolation          |
| `src/app/useSyncLifecycle.ts` | Lifecycle event listeners and single-flight sync coordination        |
| `src/app/recovery.ts`         | Local ZIP package builder for unsynced device data                   |
| `src/components/`             | Contributor and administrator feature views                          |
| `src/components/ui/`          | Shared accessible UI controls, dialogs, and sheets                   |
| `src/lib/localDatabase.ts`    | IndexedDB transaction wrappers and database initialization           |
| `src/lib/localStore.ts`       | Domain operations, media blob storage, outbox, and migrations        |
| `src/lib/syncProtocol.ts`     | Shared synchronization types and protocol definitions                |
| `src/styles/`                 | Foundation CSS tokens, geometry layers, and mobile viewport styling  |

Feature components never query IndexedDB directly or invoke privileged server endpoints without an adapter. Contributor views do not download administrator code chunks.

---

## Receipt boundaries

### 1. Local receipt boundary

```text
Edit field
  → Debounced draft write to IndexedDB
Tap Save observation
  → Validate required schema fields
  → Commit submission + media + outbox atomically
  → Display "Saved on this device"
```

The client displays the local receipt only after the IndexedDB transaction completes. Network failures cannot invalidate a local receipt.

### 2. Server receipt boundary

```text
Health probe succeeds
  → Send submission metadata
  → Upload or verify media items via TUS
  → Invoke server finalization
  → Validate matching server receipt
  → Mark local submission SYNCED
```

A request start, upload progress, or optimistic UI state is never treated as a server receipt.

---

## Local ledger rules

The local IndexedDB ledger stores drafts, submissions, media blobs, outbox entries, receipts, and device metadata:

- **Pre-generated identifiers**: Submission and media UUIDs are generated before network requests.
- **Draft isolation**: Drafts remain outside the outbox and never upload. Discarding a draft deletes its unsubmitted media blobs.
- **Single storage location**: Media blobs live in one durable store and are referenced by ID rather than copied across records.
- **Write safety**: Stale draft autosaves cannot overwrite submitted media or revert a `SYNCED` record.
- **Resilient recovery**: The recovery exporter reads stores directly and skips unreadable blobs without crashing.
- **Safe migrations**: Schema upgrades snapshot source data before applying changes in a write transaction.

---

## Storage isolation per account and container

1. **Account isolation**: Each user account uses its own database (`collect-local-v1-<userId>`). Switching accounts on a shared device isolates drafts, submissions, and outbox queues.
2. **iOS container separation**: Safari and installed Home Screen web apps run in separate storage containers. They do not share cookies, sessions, IndexedDB, or service worker caches.
3. **Cross-container linking**: A signed-in browser generates a short-lived device code to authenticate the installed app without copying local data.

---

## Synchronization engine

### Triggers

Synchronization triggers run through a single-flight coordinator:

- Observation saved locally.
- App startup or foreground resume.
- Browser `online` event.
- Due-work scheduler timer.
- Stale-lease recovery.
- Manual retry action in the UI.

### Concurrency and lease control

- **Reachability checks**: The client probes the `/health` endpoint before transferring data. It never treats `navigator.onLine` as proof of server availability.
- **Multi-tab lease**: A cross-tab mutex ensures only one tab processes the outbox at a time.
- **Crash recovery**: Incomplete `IN_PROGRESS` tasks return to the queue if a lease expires.
- **Item isolation**: A failure in one submission does not block other queued submissions.

### Error classification

- **Transient errors** (network drops, 5xx responses): Retried automatically using exponential backoff with jitter.
- **Permanent errors** (schema mismatch, revoked access, closed project): Marked `ACTION_REQUIRED` and halted until user action.

### Ingestion idempotency

Re-submitting an existing submission ID succeeds only when the project, contributor, schema, payload hash, and media list match the original record. The server updates atomically and returns the existing finalization receipt.

---

## Evidence immutability and schema history

- **Immutable schemas**: Published schema versions cannot be modified. Form edits create a new schema version without altering historical observations.
- **Immutable submissions**: Finalized submissions cannot be updated or deleted through the client API.
- **Deterministic media paths**: Media files follow a predictable hierarchy in Supabase Storage:
  ```text
  projects/{project_id}/submissions/{submission_id}/{media_id}
  ```

---

## Security and authorization

- **Row-Level Security**: Enabled across all public tables. Access rules evaluate `organization_members` and `project_members`.
- **Privileged functions**: Supabase Edge Functions verify caller authentication and perform server-side permission checks.
- **Private keys**: Service-role keys exist only in Edge Function secrets.
- **Secure views**: `project_overviews` uses `security_invoker = true` to preserve user RLS policies.

---

## Related documentation

- [User and system flows](flows.md)
- [Privacy and data handling](privacy.md)
- [Background automation](background-automation.md)
- [Deployment](deployment.md)
- [Product specification](spec.md)
