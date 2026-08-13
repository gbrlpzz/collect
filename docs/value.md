# Product value and fit

`collect` is infrastructure for trustworthy field evidence. It is designed for research and operational teams that must continue collecting structured observations when the network, browser lifecycle, or device environment is unreliable.

Its differentiator is not the number of form controls. It is the correspondence between interface language and enforced system state:

> A local receipt follows an atomic local commit. A synchronization receipt follows complete server finalization. The exported dataset contains the server-visible evidence at a defined cutoff, with its interpretation and provenance preserved.

## The problem

Fieldwork often takes place on rural routes, ecological transects, building inspections, disaster assessments, and distributed survey sites. Conventional web forms commonly create one or more of these risks:

| Risk                                         | Consequence                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Capture depends on a live request            | Work entered without a usable connection is lost or reconstructed later from memory.                  |
| “Saved” means only that a request started    | Contributors believe a record is safe when neither the device nor server has durably acknowledged it. |
| The retry queue is transient                 | Closing the app or restarting the device removes pending work.                                        |
| Schemas change in place                      | Historical records are reinterpreted under definitions that did not exist when they were collected.   |
| Media transfer is separate from record state | A structured row appears complete while original evidence is missing.                                 |
| Exports omit interpretation and provenance   | The resulting folder cannot be audited, reused, or deposited without manual reconstruction.           |

These are data-integrity failures rather than interface inconveniences.

## The contract

### Saved means locally durable

The client commits the submission, media references and blobs, and outbox operations before it displays **Saved on this device**. The network is not part of that receipt boundary.

### Synced means finalized by the server

The client changes a record to `SYNCED` only after metadata transfer, media confirmation, server finalization, and validation of a receipt that names the same submission.

### Evidence retains its interpretation

Published schema versions and finalized submissions are immutable through ordinary application paths. Every submission retains the schema, contributor, device, application, time, location, and environment provenance required to interpret it.

### Exports remain portable

A checkpoint is a self-contained server snapshot containing canonical JSONL, CSV, GeoJSON, original media, schema history, manifests, integrity hashes, a data dictionary, and DataCite-compatible metadata. The package does not require `collect` to remain understandable.

## Value for contributors

- The primary action is always **New observation**.
- The guided flow presents one field at a time and keeps the completion action reachable above the mobile keyboard.
- Optional fields can be skipped without unnecessary keyboard dismissal or navigation.
- Draft persistence, location capture, media hashing, synchronization, retry, and readiness reporting are automated.
- Status uses factual language: saved locally, waiting, sending, synced, or action required.
- Offline collection is a supported operating mode rather than a degraded exception.
- A local recovery export remains available when unsynced work needs to leave the device.

## Value for research and operations teams

- Multi-device readiness is derived from server-visible device reports instead of manual completion claims.
- Immutable schema versions preserve the meaning of historical observations.
- Deterministic identifiers and idempotent endpoints prevent duplicate transfer from becoming duplicate evidence.
- Attention verification provides an advisory, exported quality signal without modifying or automatically rejecting research data.
- Versioned consent records, provenance, and project metadata travel with the checkpoint.
- Private media storage, row-level security, and Edge Function authorization keep privileged credentials out of the browser.
- Self-hosting and open formats reduce infrastructure and vendor lock-in.

## Appropriate use cases

| Team                                    | Fit                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ecological and environmental monitoring | Long offline routes, location and media evidence, stable protocols, repository handoff      |
| Territorial and building surveys        | Repeated typed observations across many contributors and devices                            |
| Humanitarian and rapid assessment teams | Unreliable infrastructure, explicit recovery, and auditable transfer state                  |
| Citizen-science programs                | Narrow contributor flow, invite-based access, and centralized data stewardship              |
| Academic groups publishing datasets     | Schema history, provenance, data dictionaries, licenses, and persistent-identifier metadata |
| Institutions requiring self-hosting     | Apache-2.0 core, Supabase deployment, private storage, and portable checkpoints             |

## When another tool is a better fit

Choose a general survey or database platform when the primary requirement is:

- extensive visual form logic or hundreds of widget types;
- spreadsheet-style record editing by contributors;
- real-time collaborative editing;
- online-only transactional forms;
- built-in statistical analysis or case management;
- unstructured note capture without a stable schema.

`collect` deliberately trades breadth for a smaller interface and a stricter evidence contract.

## Honest boundaries

- Browser storage cannot survive physical device destruction, manual site-data clearing, browser removal, or every operating-system eviction policy.
- Background Sync improves timeliness but is not required for correctness.
- A checkpoint describes only data the server finalized by its cutoff timestamp. Offline devices may contain additional unseen work.
- In-app consent is a technical enforcement mechanism, not proof of legal or research-ethics compliance.
- Attention scores are advisory and population-dependent. They must not be used as an automatic ranking, exclusion, or competence measure.
- DataCite-compatible metadata and license fields support publication workflows; they do not mint a DOI or provide legal advice.
- Production reliability depends on correct Supabase, storage, authentication, email, and deployment configuration.

## Where the contract is implemented

| Boundary                                     | Primary implementation                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| Local database and transaction primitives    | `src/lib/localDatabase.ts`                                                             |
| Durable records, media, outbox, and receipts | `src/lib/localStore.ts`                                                                |
| Local submission boundary                    | `src/app/submission.ts`                                                                |
| Synchronization lifecycle and protocol       | `src/app/syncController.ts`, `src/app/useSyncLifecycle.ts`, `src/lib/syncProtocol.ts`  |
| Privileged ingestion and finalization        | `supabase/functions/sync-submission/index.ts`                                          |
| Checkpoint generation                        | `supabase/functions/export-checkpoint/index.ts`                                        |
| Database invariants and authorization        | `supabase/migrations/`                                                                 |
| Failure-oriented verification                | `tests/syncEngine.test.ts`, `tests/localStore.test.ts`, `tests/localMigration.test.ts` |

## Continue reading

- [User and system flows](flows.md)
- [Architecture](architecture.md)
- [Privacy and data handling](privacy.md)
- [Background automation](background-automation.md)
- [Checkpoint export format](export-format.md)
