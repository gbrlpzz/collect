# Background automation

`collect` treats automation as a reliability feature: **anything that can
happen automatically and invisibly does**, and the few things that stay manual
are exactly the ones that need a human decision (drafting, saving, consent,
publishing, exporting). This document is the map of everything the system does
on its own — and the rules that keep it honest.

The governing principle, in the project's own words: _saved means saved,
synced means synced, and the contributor never has to babysit the machine._

---

## 1. Local durability (no user action required)

| What                   | How                                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft autosave         | Debounced 400 ms after the last change + flush on `pagehide`/visibility loss; a force-kill loses at most the last keystrokes.                                        |
| Media persistence      | Photos/audio write to IndexedDB `MEDIA_STORE` **immediately on selection** — before any autosave — and are deleted when removed from the draft.                      |
| Blob hygiene           | App-state and submission mirrors store metadata only; blobs live once in `MEDIA_STORE` and are reattached on reload. Large media is never re-serialized by autosave. |
| Stale-write protection | A late autosave can never downgrade a `SYNCED` row; a late draft-media write can never clobber a submitted media row.                                                |
| Per-account isolation  | Each account gets its own IndexedDB database; switching people on a shared device never mixes fieldwork.                                                             |

## 2. Synchronization

### 2.1 Triggers (all automatic)

- On save (any pending work exists and the server is reachable).
- On launch, on returning to the foreground, and on `online` events.
- On a 30-second scheduler that checks the **durable outbox** for due
  operations (respecting exponential backoff).
- On `IN_PROGRESS` rows left by a killed tab, once the lease has expired.
- Via **Background Sync** (when the browser supports it): the app registers
  the `collect-sync` tag while work is pending; the service worker wakes open
  windows and the same silent sync path runs.

### 2.2 Discipline

- **Health probe first.** Sync is gated by an Edge Function health check with
  an 8-second timeout — `navigator.onLine` is never trusted.
- **Single-flight.** A manual tap and a background trigger in the same tick
  share one run instead of racing for the lease.
- **Silent.** Background runs show no toasts; manual taps keep feedback.
- **Per-item isolation.** One failing observation never blocks the rest of the
  queue; partial sync reports "some synced, the rest will keep retrying".
- **Classification.** Transient failures retry with exponential backoff
  - jitter; permanent ones (schema mismatch, revoked assignment, media
    integrity, closed project) become `ACTION_REQUIRED` and stop retrying.
- **Lease.** One owner at a time across tabs/windows; the lease expires and
  hands over automatically.

### 2.3 Media uploads

- Server-first confirm: if the object is already acknowledged, nothing is
  re-uploaded — even when the local blob was cleaned up.
- TUS resumable uploads with deterministic fingerprints; a stale/expired
  stored upload is retried once with a fresh session.
- Bounded parallelism (2 at a time) with durable per-media progress;
  failures abort the batch, never the queue.
- Every media row carries a **SHA-256 computed automatically in the
  background** while the file is selected; size is verified server-side at
  confirm time.

### 2.4 Receipts

- `SYNCED` is only ever set after a durable server finalization receipt.
- The receipt must name **exactly** the submission being cleared.
- Server timestamps (`server_received_at`, `finalized_at`) are persisted
  locally, not the client clock.
- Crash-after-finalize retries are idempotent: completion counts never
  double-count.

## 3. Device status and readiness

- **Counts from the durable outbox**, not memory: unique submission IDs plus
  per-media rows; acknowledged media never reappears as pending.
- **Coalesced**: heartbeats are debounced 10 s and skip hidden tabs.
- **Contributor surface only** — admin sessions never appear in the roster.
- **`fieldwork_complete` is derived automatically**: the outbox is empty
  _and_ there is no in-progress draft. Contributors never press a "finished
  syncing" button (see the design decision in `docs/design.md`).
- **Multi-device readiness**: Safari and the installed PWA are separate
  containers with separate device rows; a contributor is Ready only when
  _every_ known device reports clean + complete.
- **Admin surfaces auto-poll** every 30 s and refresh on focus/visibility —
  no manual refresh button.

## 4. Provenance (recorded silently with every observation)

- **Location** — captured automatically when the observation opens (one
  permission grant) and refreshed at save; written to the schema's actual
  field keys; a required failure shows a retry, never a silent save.
- **Environment** — device model (down to iPhone/iPad generation), OS,
  browser, screen, orientation, connection, battery, timezone, language.
- **Identity** — stable per-install device id, schema version, app version,
  client timestamps with timezone.
- **Attention** — one automatic Quick check per observation
  (see `docs/attention-qa.md`).
- **Consent** — versioned, server-enforced, recorded in the profile
  (see `docs/attention-qa.md` for the data-quality twin; consent itself is
  granted once, up front, as an explicit human act).

## 5. Invites, sign-in, and linking

- **Invite flag survives URL cleanup.** The one-time password-setup screen
  appears after an invite sign-in for both token-hash and PKCE callback
  shapes.
- **Password setup** is a one-time step after an invite; afterwards,
  password sign-in works identically in every container.
- **Device link** transfers a signed-in web session to the installed app
  with an 8-character code that matches the server alphabet exactly.

## 6. Recovery

- **Recovery mode** is reachable _before_ the auth gate, so an offline device
  with an unreadable database can still export its unsynced records.
- The recovery ZIP is built from the **durable stores directly**
  (submissions, media, outbox, receipts, drafts, projects) and filters synced
  rows; a corrupt single blob cannot abort the export.
- Zipping runs off the main thread (fflate async worker pool); object URLs
  are revoked late so Safari doesn't cancel the download.

## 7. Offline shell

- The build emits `precache-manifest.json` (hashed JS/CSS/index); the service
  worker precaches the exact production shell so a first install opens
  offline.
- Runtime assets are cached cache-first; asset misses are never answered
  with the HTML shell (only navigations fall back to the cached index).
- The shell version is bumped deliberately (`collect-shell-v3`), so app
  updates replace the old cache cleanly.

## 8. Edge Function hardening (server side)

- **Atomic finalize** — `update … returning` means concurrent finalizers
  return the stored receipt instead of minting their own timestamps.
- **Idempotency** — a reused submission id is accepted only when
  project, contributor, **schema id**, payload hash, media count, and media
  tuples all match; otherwise it is a conflict, never an overwrite.
- **Checksum semantics** — declared SHA-256 is recorded with every media row
  (client-computed); size is verified at confirm; byte-level verification is
  performed by checkpoint consumers so it never doubles upload bandwidth.
- **Export snapshots** — every checkpoint manifest records the contributor
  readiness at the cutoff timestamp, so "who was ready when" is auditable.

## 9. What is deliberately NOT automatic

| Action                         | Why manual                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Saving an observation          | The local receipt is the product's core promise; it is a deliberate human act.                            |
| Publishing a schema version    | Immutable, consequential, irreversible.                                                                   |
| Closing/reopening a project    | A governance decision with a confirmation dialog.                                                         |
| Exporting checkpoints/recovery | Produces artifacts that leave the system; the user chooses when.                                          |
| Consent                        | One explicit human decision at the start (internal deployments may pre-grant; the server still enforces). |
| Inviting people                | Email is sent to real people.                                                                             |

---

## 10. Related documentation

- `docs/dataset-standards.md` — FAIR metadata in exports (readiness,
  attention, and consent data are part of every package).
- `docs/attention-qa.md` — automatic attention verification.
- `docs/architecture.md` — reliability boundaries and the sync protocol.
- `docs/export-format.md` — checkpoint package specification.
