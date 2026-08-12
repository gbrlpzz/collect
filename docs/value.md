# Why collect: the value of trustworthy field evidence

This page is the case for the product, written for anyone deciding whether to
use it — a research-group leader, an institution's IT person, a principal
investigator, or a field coordinator. The short version is one sentence:

> Unlike generic form builders, collect defines "saved" and "synced" by
> mechanism, not copy: a local IndexedDB transaction is the only thing that
> produces a save receipt, and a server finalization receipt is the only thing
> that produces a sync receipt. The dataset you export is therefore the
> fieldwork the server received, with every earlier state auditable.\*\*

---

## 1. The problem

Field data collection happens where the network is not: rural survey routes,
ecological transects, building inspections, disaster assessments, market
interviews. Generic tools fail there in predictable ways:

| Failure                           | Consequence                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Online-only forms                 | An observation typed in dead signal is lost, or the field worker must re-enter it later — from memory. |
| "Saved" that means "request sent" | The contributor believes the data is safe; it never reaches the server; nobody knows until analysis.   |
| No durable queue                  | The app is killed, the connection drops, the week ends — and with it, the day's records.               |
| Mutable schemas                   | The form changes mid-project; historical observations are silently reinterpreted or rejected.          |
| No quality signal                 | Distracted or rushed entries mix with careful ones, and there is no way to tell which is which.        |
| No reuse metadata                 | The dataset ends the project in a folder, unlicensed, undocumented, and effectively unpublished.       |

Each of these is a **data-loss or data-trust failure**, not a UI annoyance.
collect exists to eliminate them.

## 2. The contract

Three promises, each backed by a mechanism that cannot be faked:

1. **Saved means saved.** Submit commits the structured payload, media
   metadata and blobs, and outbox operations in one IndexedDB transaction
   _before_ the UI says "Saved on this device". A local receipt never depends
   on the network.
2. **Synced means synced.** Only a durable server finalization receipt moves
   a record to synced. Metadata → each media object → finalization: three
   resumable phases, none skippable, retried automatically with backoff.
3. **Evidence stays honest.** Published schemas are immutable, finalized
   observations are immutable, conflicts are explicit, and every record
   carries full provenance: who, what schema, which device, when, where,
   which app version — plus location and environment, captured silently.

These are not slogans. They are enforced by the local ledger, the sync
protocol, database triggers, row-level security, and server-side validation —
all tested by a critical-failure suite that simulates kills, network drops,
and restarts mid-sync.

## 3. What the field worker gets

- **One tap from a new observation** on every launch; the assigned project is
  quiet context, not a routing decision.
- **A guided one-question-at-a-time form** that auto-advances, needs no
  scrolling, and fits a thumb in gloves.
- **Zero babysitting**: location, provenance, media integrity hashes, sync,
  retries, and readiness reports happen automatically and invisibly.
- **Honest status in words**: "Saved on this device", "waiting to send",
  "syncing automatically" — never a fake green check.
- **Offline, then done**: three days without signal is a normal case, not an
  edge case.

## 4. What the research team gets

- **Automatic attention QA on every observation** — a random, universally
  valid quick check, verified server-side, producing a guess-adjusted score
  per contributor. The signal is exported with the data and visible to the
  coordinator, so coordinators can rank contributors by an auditable, exported score
  rather than by anecdote.
- **Automatic readiness**: administrators watch device-reported status that
  aggregates every device a contributor uses, without anyone pressing a
  "I'm done" button.
- **Immutable schema versions** so historical observations never change
  meaning, and a form builder that covers the field types surveys actually
  use (text, numbers, choices, tri-state, date/datetime, location, photo,
  audio, repeatable groups).
- **A dataset, not a folder**: every checkpoint is a self-contained,
  licensed, FAIR package — DataCite 4.4 metadata, a data dictionary with
  ontology hooks, provenance, consent records, attention results, and media
  originals.
- **Reproducible exports**: same cutoff semantics, same layout, hashed
  manifests — an export can be proven to be the exact bytes described.

## 5. Who it is for

| Team                                             | Why collect                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Ecological and environmental monitoring          | Long offline transects; photos + GPS as evidence; immutable protocols; FAIR handoff to repositories.                        |
| Territorial, housing, and infrastructure surveys | Many enumerators, many devices; per-account isolation on shared phones; automatic attention QA on the roster.               |
| Humanitarian and rapid assessments               | Hostile networks; recoverability is the requirement; recovery ZIPs keep unsynced data exportable.                           |
| Academic groups publishing datasets              | Consent records, provenance, attention signals, and DataCite metadata are exactly what journals and repositories ask for.   |
| Institutions that self-host                      | Apache-2.0 core, one-command provisioning, no vendor lock-in; the operated service is the product, the software stays open. |

## 6. Honest boundaries

- **No AI in the collection path.** Captured data is never transformed by the
  app; downstream systems may analyze exports. This is a feature, not a gap.
- **You bring the backend or use the hosted service.** The repo provisions any
  Supabase project; a green build is not proof that sync works — deployments
  are verified end to end.
- **Licenses and DOIs are metadata, not legal advice.** The tool makes a
  dataset registerable; institutions still choose the license.
- **Browser storage is bounded.** Persistent storage is requested and quota is
  monitored; the recovery export is the explicit escape hatch.

## 7. Where the value lives in the code

- `src/lib/localStore.ts` — the durable ledger and the local receipt boundary.
- `src/app/syncController.ts` + `useSyncLifecycle.ts` — automatic, silent,
  resumable synchronization.
- `src/lib/attention.ts` + server bank — automatic attention verification.
- `supabase/functions/export-checkpoint/index.ts` — the FAIR checkpoint
  package.
- `tests/syncEngine.test.ts` — the §54 critical-failure survival suite.

## 8. Reading path

- [`README.md`](../README.md) — the one-page pitch.
- [`docs/background-automation.md`](background-automation.md) — everything
  automatic under the hood.
- [`docs/attention-qa.md`](attention-qa.md) — the data-quality signal.
- [`docs/dataset-standards.md`](dataset-standards.md) — FAIR exports.
- [`docs/architecture.md`](architecture.md) — reliability boundaries.
