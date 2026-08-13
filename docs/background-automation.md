# Background automation

`collect` automates routine work that does not require a human decision. Automation reduces field friction, but no background capability is required for correctness after the application reopens.

The system keeps consequential actions explicit: consent, saving an observation, publishing a schema, inviting a person, closing a project, and exporting data.

## Automation map

| Area              | Automatic behavior                                                          | Visible only when                           |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| Drafts            | Debounced persistence and lifecycle flush                                   | Persistence fails or storage is unavailable |
| Media             | Immediate blob persistence, metadata capture, SHA-256 calculation           | A required file is missing or invalid       |
| Location          | Capture at collector open and refresh at save                               | Permission or required capture fails        |
| Synchronization   | Health probe, lease acquisition, retry, TUS transfer, finalization          | Work is active, delayed, or requires action |
| Readiness         | Durable outbox counts, coalesced heartbeat, multi-device aggregation        | Administrator reviews project status        |
| Application shell | Build-time precache manifest and service-worker caching                     | An update or cache failure needs attention  |
| Recovery          | Direct durable-store packaging and asynchronous compression                 | The user requests a local recovery copy     |
| Profile context   | Relative receipt time, consent state, contribution count, attention summary | The user opens Profile                      |

## Local durability

- Drafts persist after a short debounce and flush on `pagehide` or visibility loss.
- Selected photo and audio blobs enter the media store immediately rather than waiting for draft serialization.
- Application snapshots store media metadata, not duplicate blobs.
- Removing draft media removes its unsubmitted blob.
- Stale draft or autosave writes cannot overwrite submitted media or downgrade `SYNCED` state.
- Each account uses a separate local database.

A force-close can still lose keystrokes that occur before the latest draft transaction. The stronger local receipt begins only when the user deliberately saves the observation.

## Synchronization triggers

The same single-flight synchronization path may run:

- after saving when due work exists;
- at application launch;
- after returning to the foreground;
- after a browser `online` event;
- on the due-work scheduler;
- after stale lease recovery;
- after a supported Background Sync event;
- after a manual retry.

Multiple triggers do not create concurrent synchronization owners.

## Synchronization discipline

- A timed health probe gates transfer; `navigator.onLine` is advisory only.
- One durable lease coordinates tabs and windows.
- One failing submission does not block the rest of the outbox.
- Transient failures retry with exponential backoff and jitter.
- Permanent conflicts become `ACTION_REQUIRED` and stop automatic retry.
- Lifecycle runs remain quiet when healthy; manual requests provide feedback.
- The receipt must name the exact submission before local pending state is cleared.
- Server timestamps, rather than client estimates, represent receipt and finalization time.

## Media transfer

- The client asks the server whether an object is already acknowledged before uploading.
- TUS uploads resume through deterministic fingerprints.
- An expired upload session can restart without changing media identity.
- Upload concurrency is bounded.
- Progress persists per media item.
- SHA-256 metadata is calculated in the background and guaranteed again at the local commit boundary.
- The server confirms declared size and media completeness before finalization.

Original media is not recompressed by the application.

## Device status and readiness

Heartbeat values derive from durable stores:

- unique pending submission identifiers;
- pending, unacknowledged media operations;
- last successful server receipt;
- current draft presence;
- installation-scoped device provenance.

`fieldwork_complete` is derived when no durable outbox work and no active draft remain. Contributors do not press a manual completion button.

Administrator readiness aggregates every known device. An offline or never-reported device remains an epistemic boundary: the server cannot claim that unseen local work does not exist.

## Provenance

When platform access permits, the client records:

- location, accuracy, capture time, and source;
- device family, operating system, and browser;
- screen, orientation, connection, and battery context;
- timezone, language, application version, schema version, and client time;
- stable contributor and installation identifiers.

Automatic provenance is described in the privacy and consent surfaces. A failed optional capture cannot block local save.

## Authentication and device linking

- Invitation state survives authentication callback cleanup.
- New invited accounts can set a password after their first link sign-in.
- Browser sign-in leads with a passwordless email link.
- Installed iOS sign-in leads with an eight-character device-link code.
- Codes are normalized to the server alphabet, expire, and can be consumed once.

## Recovery

Recovery mode is available before the normal authentication gate when local database initialization fails.

The recovery package reads durable stores directly and can include projects, drafts, submissions, media, outbox operations, and receipts. It excludes records already known to be synchronized where possible. Compression runs asynchronously, and one unreadable blob does not abort the entire package.

## Application shell

The production build creates `precache-manifest.json` for the hashed application shell. The service worker:

- precaches the production shell;
- uses cache-first behavior for immutable assets;
- applies navigation fallback only to navigation requests;
- replaces old shell caches through explicit version changes.

## Server-side automation

- Atomic finalization returns the stored receipt to concurrent callers.
- Same-identifier retries compare project, contributor, schema, payload hash, media count, and media tuples.
- Checkpoint generation records the server cutoff and contributor-readiness snapshot.
- Invitation and reminder delivery use privileged functions.
- Reference data and device-link code operations use restricted server-side procedures.

## Deliberately manual actions

| Action                                  | Reason                                            |
| --------------------------------------- | ------------------------------------------------- |
| Save an observation                     | Creates the contributor’s local evidence boundary |
| Accept or decline consent               | Requires an explicit human decision               |
| Publish a schema                        | Creates an immutable interpretation contract      |
| Invite a person                         | Sends communication and grants access             |
| Close or reopen a project               | Changes operational governance                    |
| Export a checkpoint or recovery package | Creates an artifact outside the application       |

## Related documentation

- [User and system flows](flows.md)
- [Architecture](architecture.md)
- [Privacy and data handling](privacy.md)
- [Attention verification](attention-qa.md)
