/goal # Field Data Collector

## Product and Engineering Specification

Version 0.1 — MVP

### 1. Product definition

Build an open-source, mobile-first, offline-first field data collection application for scientific research, territorial work, ecological monitoring, citizen science, surveys, inventories, and other forms of structured observation in environments where connectivity is unreliable.

The product is not primarily a form builder.

Its core purpose is:

**Allow an organization to define structured observations, assign them to contributors, collect them reliably in the field, know what has and has not reached the server, and export a complete, portable dataset.**

The key differentiator is reliability under hostile field conditions.

A contributor must be able to open an assigned project, collect structured data including photos and location while completely offline, close or kill the app, reopen it hours or days later, continue collecting, reconnect intermittently, and eventually have all collected data reach the server without duplicates, omissions, corruption, or manual reconstruction.

The product should feel dramatically simpler than Jotform, KoboToolbox, ODK, Survey123, etc.

The complexity belongs in the infrastructure, not in the contributor interface.

---

# 2. Core product promise

The engineering invariant is:

**Once the application tells a contributor that a submission has been saved, the application must never intentionally discard that submission or any of its attached media until the server has explicitly acknowledged receiving the complete submission.**

This includes:

* structured field values
* photos
* audio
* location
* timestamps
* provenance metadata
* schema version
* contributor identity
* device identity

The application must never treat network request initiation as successful synchronization.

Only explicit server acknowledgement counts.

Likewise, connectivity indicators are advisory. `navigator.onLine === true` cannot be treated as evidence that the server is actually reachable; browsers may report an online network interface without usable Internet access.

The product may be described externally as extremely reliable or “never lose a field observation,” but the software must not claim that browser storage can survive physical device destruction, manual clearing of site data, or complete browser removal.

The application should request persistent storage using the browser Storage API and monitor available quota. Persistent storage and quota inspection are available through `navigator.storage`, but storage remains under browser control.

---

# 3. Product principles

1. Local first.
2. Network second.
3. No silent failure.
4. No silent deletion.
5. No silent conflict resolution.
6. No dependency on background execution for correctness.
7. Data remains understandable outside the application.
8. Published schemas are immutable.
9. Every important object receives a stable machine identifier.
10. Contributors see only what they need.
11. Administrators should not need to understand databases.
12. The collection path contains no AI transformation.
13. Reliability takes precedence over cleverness.
14. A weak connection should merely slow synchronization, never impair collection.
15. The application must remain useful if the hosted service eventually disappears.

---

# 4. Primary user roles

## Administrator

An administrator creates and manages projects.

They can:

* create a workspace/organization
* set organization name and logo
* create projects
* define project instructions
* create the collection schema/form
* publish schema versions
* invite contributors by email
* assign contributors to projects
* see collection and synchronization status
* ping contributors who have not completed synchronization
* close/reopen collection
* export dataset checkpoints
* download the final dataset
* inspect project metadata

An administrator does not need a spreadsheet/database management interface in MVP.

The administrative product should feel like a lightweight field-operations console.

## Contributor

A contributor collects observations.

They can:

* log in
* see projects assigned to them
* download a project for offline use
* read project instructions
* start an observation
* fill fields
* attach media
* capture location
* submit
* immediately begin another observation
* see whether their data is saved locally, syncing, or synced
* manually trigger synchronization
* confirm when their fieldwork is complete
* recover their unsynced data if synchronization catastrophically fails

They cannot:

* edit project schemas
* see other contributors
* access the project database
* export the whole project
* inspect administrative settings

The contributor interface should be radically simple.

---

# 5. Product surfaces

There are effectively two interfaces sharing the same application.

## Contributor interface

Mobile-first PWA.

Primary navigation:

**Projects → Project → Observation**

Everything else should appear as sheets or secondary actions.

## Administrator interface

Desktop-friendly responsive web interface.

Primary navigation:

**Projects → Project Detail → Setup / Contributors / Export**

Do not build a complex global navigation system for MVP.

---

# 6. Authentication and invitations

Use Supabase Auth for MVP.

The preferred flow is email invitation followed by passwordless email authentication or a similarly low-friction Supabase-supported flow.

An administrator enters:

`contributor@example.com`

The contributor receives an invitation.

After authentication they automatically see projects assigned to that email/account.

There should be no contributor onboarding wizard beyond what is strictly necessary.

Authentication state should persist locally so that a contributor who authenticated while online can subsequently reopen previously downloaded projects while offline. Supabase clients support persisted sessions; server-side authorization must still be validated by Supabase rather than trusting client-side session contents.

If authentication expires while the contributor is offline:

* do not block collection
* do not delete anything
* allow access to previously cached assigned projects
* queue submissions normally
* attempt token refresh when connectivity returns
* only then attempt synchronization

Authentication failure must never invalidate locally saved fieldwork.

---

# 7. Organization model

Create a lightweight organization/workspace object.

Required properties:

`organization_id`
`name`
`logo`
`created_at`

A project belongs to one organization.

Contributor-facing project pages display:

organization logo
organization name
project name
project instructions

White-labeling beyond this is not required in MVP.

---

# 8. Project creation

Project creation should be a short wizard.

## Step 1 — Identity

Administrator defines:

Project name

Optional short description

Optional field instructions

Organization identity is inherited.

Optional collection start/end dates.

## Step 2 — Collection schema

Administrator constructs the form.

## Step 3 — Contributors

Administrator adds email addresses.

Existing accounts are immediately assigned.

Unknown addresses receive invitations.

## Step 4 — Publish

Show:

project name

number of fields

contributors

schema version

Then:

**Publish Project**

Publishing makes the schema available to contributors.

---

# 9. Form/schema philosophy

The system must use a deliberately small set of strongly typed input primitives.

Do not attempt to reproduce arbitrary web-form builders.

The schema must remain predictable enough that collected datasets can later feed:

* statistical analysis
* GIS
* computer vision
* machine learning
* ontology mapping
* labeling systems
* agentic pipelines

Every field has a permanent machine identifier independent of its visible label.

Example:

Visible label:

`Is the building occupied?`

Machine key:

`building_occupancy`

Internal UUID:

`019...`

Changing the visible label must not change the field identity.

---

# 10. MVP input types

Support the following data primitives.

### Short text

Configuration:

required
placeholder
minimum length
maximum length

### Long text

Same as short text with multiline input.

### Number

Configuration:

integer / decimal
minimum
maximum
unit
required

Store value and unit separately.

### Single choice

Each option must have:

stable option ID
machine value
visible label

Allow optional `Other`.

### Multiple choice

Same option model.

Store selected stable option IDs / machine values, not labels alone.

### Yes / No / Unknown

Use an explicit tri-state value.

Never encode unknown as null when the distinction matters.

### Date

Store ISO representation.

### Date and time

Store:

local datetime
timezone offset
UTC-normalized timestamp where possible

### Location

Contributor taps:

**Capture location**

Store at minimum:

latitude
longitude
accuracy
captured_at

Also store when available:

altitude
altitude accuracy
heading

Do not require map tiles for this field to work.

When offline, coordinates and accuracy are sufficient.

An online map preview can be progressive enhancement.

### Photo

Administrator can configure:

single or multiple
minimum count
maximum count
required / optional

Every photo is handled as its own media entity.

### Audio

Single/multiple configuration analogous to photo.

### Repeatable group

Allows a defined group of fields to occur N times.

Example:

Tree 1
Tree 2
Tree 3

Repeatable groups must serialize as arrays of structured objects, never flattened column names internally.

### Presentation blocks

Non-data elements:

section heading
instruction text

These have no response values.

---

# 11. Explicitly excluded form functionality for MVP

Do not implement:

arbitrary JavaScript
computed fields
payment fields
signatures
HTML embeds
complex branching trees
spreadsheet formulas
AI-generated questions
database lookups
cross-project references
arbitrary custom components

Simple conditional visibility may be introduced later, but is not required for the first production version.

---

# 12. Schema format

Create an internal JSON schema format.

Conceptually:

```json
{
  "schema_id": "uuid",
  "version": 3,
  "project_id": "uuid",
  "published_at": "...",
  "fields": [
    {
      "id": "uuid",
      "key": "building_occupancy",
      "type": "single_choice",
      "label": "Occupancy",
      "description": "Observed occupancy status",
      "required": true,
      "semantic_uri": null,
      "config": {}
    }
  ]
}
```

`semantic_uri` exists as a nullable future-facing property.

It is not surfaced in the normal MVP interface.

This provides a clean future connection to ontologies without making the collector ontology-dependent.

---

# 13. Schema versioning

This is mandatory.

Published schemas are immutable.

If an administrator edits a published form:

1. clone current schema into a draft
2. edit draft
3. publish as a new version

Existing observations remain attached to their original schema version.

An offline contributor may submit data using an older cached schema.

The server must accept that submission as belonging to that schema version rather than attempting to migrate it silently.

Every submission stores:

`schema_version_id`

Exports include every schema version used in the dataset.

Never reinterpret historical data according to the newest form.

---

# 14. Contributor home

After login show:

organization/project cards assigned to the contributor.

A card contains:

organization
project name
short status

Possible status:

`Ready offline`

`Needs download`

`3 waiting to sync`

`Syncing`

`Up to date`

Tapping a project opens it.

If a contributor has only one active project, the application may take them directly into it after initial login.

---

# 15. Offline project preparation

The first time a project is opened online, download:

project metadata
instructions
schema
required organization assets
application shell resources required for offline operation

Only display:

**Ready offline**

after those assets have successfully been stored.

PWAs can use service workers and local browser databases to keep application resources and structured data available offline. IndexedDB is designed for substantial structured client-side data and can store file/blob data as well.

The contributor should therefore be able to:

install/add the PWA to the home screen

open it in airplane mode

select the project

collect observations

without requiring server contact.

---

# 16. Observation experience

Project screen:

Organization logo

Project title

Short instructions

Large primary action:

**Start collecting**

Secondary footer:

`12 synced · 3 waiting`

Starting collection opens the form.

The form should be one clean mobile surface.

Recommended visual structure:

project title

optional progress indicator

field blocks

sticky/local save indicator

submit button

Avoid dashboard UI during collection.

---

# 17. Draft autosave

Every change to the form must be autosaved locally.

Do not wait for the user to press Submit.

Autosave should be debounced where appropriate but must happen frequently.

Media must be persisted to local storage immediately after capture/selection.

A contributor should be able to:

enter half a form

close the app

reopen it

resume the draft

Draft restoration should be automatic.

---

# 18. Submission semantics

Pressing Submit creates a durable local submission.

The UI must not show successful submission until a transaction has successfully persisted:

submission payload
submission metadata
media metadata
media blobs/references
sync queue operations

locally.

Only after the local transaction commits may the application display:

**Saved on this device**

This is the most important UX receipt in the application.

Network connectivity is irrelevant to this receipt.

Afterward, synchronization may start immediately.

---

# 19. Submission identity

Every logical submission receives a client-generated UUID before attempting any network operation.

Example:

`submission_id = crypto.randomUUID()`

Every attached media object receives its own UUID.

These identifiers remain stable across:

network retries
application restarts
page reloads
duplicate requests
server retries

Server-side unique constraints make repeated synchronization idempotent.

---

# 20. Local storage architecture

Use IndexedDB for the MVP local database.

Recommended wrapper:

Dexie or similarly thin, mature IndexedDB abstraction.

Do not store submissions in `localStorage`.

Local database stores should include conceptually:

`projects`
`schemas`
`drafts`
`submissions`
`media`
`outbox`
`receipts`
`device_state`
`settings`

Media blobs should be referenced by stable media IDs.

Unsynced records must never be deleted automatically.

---

# 21. Persistent storage

On contributor onboarding / project preparation:

call:

`navigator.storage.persist()`

and:

`navigator.storage.estimate()`

Store whether persistence appears granted.

The StorageManager API exposes both persistence and storage quota estimation.

Do not interrupt collection simply because persistence is not granted.

Instead, expose a subtle warning where appropriate.

Monitor approximate storage consumption.

At high storage pressure warn:

**Device storage is becoming full. Sync your collected data soon.**

If an IndexedDB operation fails due to quota:

do not pretend the save succeeded.

Show an explicit blocking error.

Never delete unsynced submissions to free space.

A later manual action may allow:

**Free local copies of already synced media**

but this must never affect unsynced files.

---

# 22. The outbox

Implement synchronization as a durable outbox.

Every operation requiring server acknowledgement is represented locally.

Conceptual operation types:

`CREATE_SUBMISSION`

`UPLOAD_MEDIA`

`FINALIZE_SUBMISSION`

`REPORT_DEVICE_STATUS`

Outbox record:

```ts
{
  id,
  operationType,
  entityId,
  projectId,
  attempts,
  createdAt,
  nextAttemptAt,
  lastAttemptAt,
  lastError,
  state
}
```

The queue itself must survive application termination.

---

# 23. Submission synchronization protocol

Synchronization should operate in phases.

## Phase A — Metadata

Send submission metadata and structured payload.

Server validates:

authenticated contributor
project assignment
known schema version
submission ID
payload shape

Server writes the submission using its client-generated ID.

The operation is idempotent.

If the same ID already exists with identical content:

return success.

If the same ID already exists with different content:

return an explicit conflict.

Never overwrite silently.

## Phase B — Media

Upload each media object independently.

Use deterministic object paths based on immutable IDs.

Example:

`projects/{project_id}/submissions/{submission_id}/{media_id}`

Use resumable uploads for substantial media.

Supabase Storage supports the TUS protocol specifically for resumable uploads and recommends it when network stability is a concern or when larger files are involved. A TUS upload URL may expire, so the client must be able to obtain/restart an upload rather than treating an expired upload session as data loss.

Recommended client:

`tus-js-client`

Each media item tracks independent progress.

Example:

Photo 1 synced
Photo 2 synced
Photo 3 62%
Photo 4 queued

If the app terminates, resume remaining work on next launch.

## Phase C — Finalization

Once server metadata exists and every expected media object is confirmed uploaded:

call a server finalization operation.

Server verifies:

submission exists
expected media count
media records complete
media object references valid

Then mark:

`submission.status = COMPLETE`

Server returns a durable receipt.

Only after receiving this receipt may the local submission be marked:

`SYNCED`

---

# 24. Submission state machine

Minimum local states:

`DRAFT`

`SAVED_LOCAL`

`QUEUED`

`SYNCING_METADATA`

`SYNCING_MEDIA`

`FINALIZING`

`SYNCED`

`RETRYABLE_ERROR`

`ACTION_REQUIRED`

There must be no ambiguous generic `failed` state.

Most network failures should become:

`RETRYABLE_ERROR`

and retry automatically.

Examples:

timeout
connection reset
DNS failure
server unavailable
expired upload URL
temporary authentication refresh issue

`ACTION_REQUIRED` is reserved for things automation cannot reasonably resolve.

Examples:

membership revoked
server rejects unknown schema
local file is corrupt/unreadable
project deleted
persistent authorization failure

---

# 25. Retry policy

Use exponential backoff with jitter.

Retry immediately when:

application launches
application returns to foreground
user presses Sync Now
a verified server connectivity probe succeeds

Also retry opportunistically when connectivity changes.

Do not rely exclusively on the Background Synchronization API. Browser support is limited, including lack of support in Safari/iOS, so background sync may be used as enhancement only.

Correctness must assume:

**sync may require the application to be open.**

On platforms where background sync is supported, register it.

On platforms where it is not, the foreground sync engine performs the same queue processing.

---

# 26. Connectivity detection

Do not use `navigator.onLine` as the deciding signal.

Implement a cheap authenticated or public health endpoint.

For example:

`HEAD /api/health`

Synchronization may begin when:

network status appears online

AND

health probe succeeds

If the probe fails:

remain in queued state.

Never convert connectivity failures into user-facing submission failures.

---

# 27. App interruption handling

The system must expect the application to disappear at any moment.

Test interruption after every critical operation:

during form entry
while saving draft
immediately after Submit
during metadata upload
during photo upload
after media upload before finalization
during token refresh
during application update

Every state transition must be recoverable.

---

# 28. Media policy

Original captured files should be preserved by default.

Do not silently recompress or downsample scientific imagery.

Store:

media_id
field_id
submission_id
mime_type
file_size
original_filename if available
captured_at
capture_source
local blob reference
remote object path
upload state
optional client checksum

Generate lightweight thumbnails separately if needed for UI.

If future projects want compression, make it explicit project configuration.

Never mutate the original media object in place.

---

# 29. Media integrity

Where practical compute a SHA-256 checksum locally.

Store it in media metadata.

The checksum is useful for:

duplicate detection
recovery verification
export integrity
future data pipelines

If checksum calculation is too expensive on a particular device/file, it may be deferred, but media IDs and server receipts remain mandatory.

---

# 30. Location provenance

Location must never be represented as merely:

`lat/lon`

Store:

latitude
longitude
accuracy
capture timestamp
provider metadata available through browser/device API

If location is unavailable:

allow the administrator to decide whether submission should be blocked because the field is required.

Never invent coordinates.

---

# 31. Device identity

Generate a stable per-installation device UUID.

Do not use hardware fingerprinting.

Store locally:

`device_id`

Each submission includes:

device_id
contributor_id
application_version
schema_version
local creation timestamp

This allows diagnostics without invasive tracking.

---

# 32. Contributor sync interface

Avoid a technical queue UI.

At project level show:

`14 synced`

`3 waiting`

If synchronization is active:

`Syncing 2 of 3…`

Tapping opens a sync sheet.

The sheet contains:

saved locally
waiting
currently uploading
last successful sync
Sync Now
storage status
advanced recovery action

The system should distinguish clearly between:

**Saved on this device**

and

**Synced**

A submission must never disappear from the waiting count until server finalization has succeeded.

---

# 33. Contributor completion

Add:

**Finish fieldwork**

When pressed:

1. save any drafts or ask contributor what to do with unfinished drafts
2. attempt synchronization
3. verify local outbox contains no field-data operations
4. verify every finalized submission has a remote receipt
5. send a completion heartbeat to server

Only then display:

**All fieldwork synced**

This status drives administrator export readiness.

The contributor may later resume collection if the project remains open.

---

# 34. Device heartbeat

Whenever connectivity exists, report lightweight project/device status.

Example:

```json
{
  "device_id": "...",
  "project_id": "...",
  "last_seen_at": "...",
  "last_sync_success_at": "...",
  "pending_submissions": 3,
  "pending_media": 7,
  "app_version": "...",
  "schema_versions_cached": [...],
  "fieldwork_complete": false
}
```

Important:

The administrator cannot know data exists on an offline device that has not communicated with the server.

Therefore never display stale queue counts as real-time truth.

Show:

`3 pending · last reported 14:22`

or:

`Last seen 2 days ago`

This distinction is mandatory.

---

# 35. Administrator project dashboard

Project dashboard should remain minimal.

Header:

Project name
Organization
Active / closed

Primary metrics:

complete submissions received

contributors

contributors confirmed synced

last submission received

Then a contributor readiness list.

Example:

Alice
**Ready**
48 submissions

Marco
**2 pending · reported 12 min ago**
31 received

Sara
**Last seen yesterday**
22 received

Actions:

Ping

Project-level:

**Export checkpoint**

---

# 36. Ping contributor

Administrator can send a lightweight email notification.

Message:

Project X still has field data waiting to synchronize.

Open the collector when you have connectivity and allow synchronization to complete.

Include direct project URL.

Notification implementation should be provider-abstracted server-side.

Do not make email delivery part of synchronization correctness.

---

# 37. Export readiness

At the top of the export view show:

**8 of 10 contributors confirmed fully synced**

List remaining contributors.

Do not block export.

Administrator can always export a checkpoint.

But distinguish:

`Checkpoint`

from

`All contributors confirmed`

If every assigned contributor has sent a recent completion state with zero pending operations:

display:

**Ready for final export**

---

# 38. Checkpoint semantics

A checkpoint is an immutable snapshot of everything completely received by the server at a specific server timestamp.

Every checkpoint gets:

checkpoint_id
project_id
created_at
created_by
server cutoff timestamp
submission count
media count
schema versions
contributor readiness snapshot

Exporting twice creates two checkpoints.

This makes field datasets reproducible.

---

# 39. Export package

Download a ZIP.

Canonical structure:

```text
project-name_checkpoint-2026-08-09.zip

manifest.json
schema/
  schema-v1.json
  schema-v2.json
data/
  submissions.jsonl
  submissions.csv
  media.csv
  contributors.csv
  submissions.geojson
media/
  {submission_id}/
    {media_id}.jpg
    {media_id}.m4a
```

`submissions.jsonl` is canonical.

CSV is convenience output.

Do not destroy nested/repeated structures merely to fit CSV.

Where the project contains spatial observations, also produce GeoJSON.

`manifest.json` contains:

export format version
project metadata
organization
checkpoint ID
creation timestamp
schema versions
submission count
media count
hashes where practical
software version

The package must remain intelligible without this application.

---

# 40. Recovery export

This is a critical robustness feature.

In the contributor Sync sheet add an advanced action:

**Export unsynced recovery package**

This locally generates a package containing:

unsynced structured payloads
schema definitions
media
local metadata
outbox state

This is the ultimate escape hatch.

If:

Supabase is down
the project configuration is broken
authorization fails
the application has a bug
the organization shuts down

a researcher must still be able to extract collected fieldwork from the device.

This feature significantly strengthens the product's sovereignty claim.

---

# 41. Backend architecture

MVP canonical backend:

Supabase

Use:

Supabase Auth
Postgres
Supabase Storage
server/edge functions where privileged logic is needed

The application architecture should use a backend interface internally rather than scattering Supabase calls across UI components.

Conceptual services:

`AuthService`

`ProjectService`

`SubmissionSyncService`

`MediaService`

`HeartbeatService`

`ExportService`

This keeps later migration or additional adapters possible.

Do not implement Airtable or arbitrary backends in MVP.

Airtable can later be supported as:

export destination
replication destination
integration

rather than compromising the reliability of canonical ingestion.

---

# 42. Sovereignty / self-hosting

The repository should make the entire system deployable against another Supabase project.

Keep configuration outside source code:

Supabase URL
public key
storage configuration
mail provider
application URL

Ship database migrations and setup documentation.

A technically competent organization should eventually be able to deploy:

frontend
Supabase/Postgres
storage

under its own control.

Do not tie the data model to a single hosted account.

---

# 43. Suggested frontend stack

TypeScript

React

Vite

PWA/service worker integration

Dexie for IndexedDB

React Hook Form

Zod or equivalent validation

Supabase JS

`tus-js-client` for media uploads

A minimal component system implementing accessible native-like controls

Avoid large dependencies where a small implementation is sufficient.

Do not build around a native-only framework.

The primary client must remain installable as a PWA on:

iOS
Android
desktop browsers

---

# 44. Service worker

The service worker handles:

application shell caching
offline navigation
static project assets
optional supported background sync

It does not own the only copy of field data.

Field data lives in IndexedDB.

Do not design synchronization such that loss/replacement of the service worker loses queue state.

PWA offline patterns use service workers for request/resource handling while local structured storage remains separate.

---

# 45. Application updates

Never clear local storage as part of an update.

Database migrations must be explicit and forward-compatible.

Do not force a service-worker update during active form entry.

If a local database migration fails:

enter a recovery mode

allow synchronization of known records if possible

allow local recovery export

do not initialize a blank database over the existing one

An application update must never be allowed to erase unsynced data.

---

# 46. Database model

Minimum server tables:

`organizations`

`organization_members`

`projects`

`project_members`

`project_invites`

`project_schemas`

`submissions`

`submission_media`

`devices`

`device_project_status`

`checkpoints`

`audit_events`

Possible submission fields:

```text
id UUID PRIMARY KEY
project_id UUID
schema_id UUID
contributor_id UUID
device_id UUID
payload JSONB
payload_hash TEXT
client_created_at TIMESTAMPTZ
client_timezone TEXT
server_received_at TIMESTAMPTZ
status ENUM
app_version TEXT
created_at TIMESTAMPTZ
finalized_at TIMESTAMPTZ
```

Media:

```text
id UUID PRIMARY KEY
submission_id UUID
field_id UUID
object_path TEXT
mime_type TEXT
byte_size BIGINT
sha256 TEXT NULL
captured_at TIMESTAMPTZ
status ENUM
created_at TIMESTAMPTZ
```

---

# 47. Authorization

Enable Postgres Row Level Security on all exposed tables.

Supabase explicitly recommends RLS for exposed schemas, and privileged service credentials must never be exposed in the browser.

Contributor permissions:

read assigned project metadata

read assigned published schemas

insert/sync their own submissions into assigned projects

read receipt/status information for their own submissions

update their own device heartbeat

No access to other contributors' submissions.

Administrator permissions:

read/write projects they administer

read contributors assigned to those projects

read project synchronization status

create exports

Private media bucket.

Object access restricted by project membership / privileged export functions.

No public media URLs.

---

# 48. Logging and privacy

Do not log field payloads into console/error telemetry in production.

Do not log photo URLs containing permanent public access.

Do not include third-party advertising or behavioral analytics.

If error telemetry is later introduced:

scrub payloads
scrub coordinates
scrub free text
scrub media
scrub emails where possible

Operational metrics may include:

sync latency
retry counts
upload failure class
application version
browser family
queue size

without collecting actual research content.

---

# 49. Audit trail

Record important administrative actions:

project created
schema published
contributor invited
contributor removed
project closed
checkpoint created

This does not need a complex visible UI in MVP.

Keep it in the database for provenance.

---

# 50. Conflict philosophy

There should be very few conflicts because field submissions are primarily append-only.

Never use generic “last write wins” for finalized observations.

A finalized submission is immutable.

If correction functionality is introduced later:

create a new revision linked to the original.

Do not mutate historical evidence invisibly.

Project metadata can use conventional updates.

Schemas remain immutable once published.

---

# 51. Editing submissions

For MVP:

Drafts are editable.

Finalized submissions are immutable.

If a contributor notices an error immediately after submission, provide:

**Create corrected copy**

This duplicates the observation into a new draft and stores:

`corrects_submission_id`

The original remains in the audit history.

Exports may identify the newest valid correction while retaining provenance.

If this is too much for first build, disable correction UI but preserve the data model possibility.

---

# 52. Accessibility and field usability

Controls must have generous touch targets.

Avoid subtle gestures as required actions.

All controls must have textual labels.

Do not encode synchronization state only through color.

Support system font scaling.

Support dark/light appearance automatically.

Avoid animations that delay interaction.

The contributor application should remain usable:

with one hand
in sunlight
under stress
with gloves where possible
on inexpensive Android hardware
on old mobile networks

---

# 53. Performance targets

Previously downloaded project should open offline without network dependency.

Starting a new observation should feel immediate.

Field changes should save locally without visible latency.

Submitting should show the local receipt immediately after IndexedDB commit, without waiting for network.

The user should be able to begin the next observation while previous media continues syncing.

Large sync queues must not freeze the interface.

Media uploads should run with conservative concurrency, e.g. 2–3 simultaneous objects maximum.

---

# 54. Critical failure tests

The MVP is not production-ready until all of these are tested.

### Connectivity

Collect in airplane mode.

Launch already-installed app in airplane mode.

Lose connectivity halfway through form.

Lose connectivity after Submit.

Network changes between 4G / Wi-Fi / offline repeatedly.

Connection exists but server cannot be reached.

Server returns 500 repeatedly.

Server responds slowly.

### App lifecycle

Refresh mid-form.

Kill PWA mid-form.

Kill immediately after Submit.

Kill during metadata upload.

Kill during photo upload.

Kill between final media upload and finalization.

Reboot device.

Reopen days later.

### Media

One photo.

Fifty photos.

Very large photo.

Unsupported/corrupt media.

Upload interrupted repeatedly.

TUS upload session expires.

Same upload accidentally initiated twice.

### Data

500+ observations on one device.

Multiple schema versions.

Repeatable groups.

Unicode.

Very long text.

Null/unknown values.

Duplicate Submit tap.

### Authentication

Token expires while online.

Token expires while offline.

Contributor account revoked with pending data.

Project closed while contributor is offline.

### Storage

Storage persistence rejected.

Storage near quota.

Quota exceeded during media save.

Synced local copies removed.

Unsynced copies remain untouched.

### Updates

Application update with zero pending data.

Application update with hundreds of pending records.

IndexedDB schema migration with pending media.

Failed database migration.

### Time

Device clock incorrect.

Timezone changes.

Daylight saving transition.

Store both client and server timestamps so these events remain diagnosable.

---

# 55. Multi-tab / duplicate worker protection

The browser may have multiple tabs or PWA instances open.

Only one synchronization worker should own a particular queue at a time.

Implement a durable local lease/mutex.

If the lease holder stops refreshing:

another instance may acquire it.

Even if two workers accidentally upload the same operation, server-side idempotency must still prevent duplicate records.

Correctness must not depend on the local lock alone.

---

# 56. Error UX

Do not show generic red errors for normal connectivity loss.

Normal states:

Saved locally

Waiting for connection

Syncing

Synced

Only surface actionable errors.

Example:

**One photo needs attention**

rather than:

`TUS_ERROR_NETWORK_ERROR`

Technical details may be available behind:

Details

Every error screen involving unsynced data should reassure through factual status:

`Your 14 saved observations are still stored on this device.`

Only say this if the local records have actually been verified present.

---

# 57. Admin deletion rules

A project containing data cannot be hard-deleted casually.

MVP should prefer:

Archive project

Contributor removal should warn if the server's latest heartbeat reports unsynced data.

Example:

`Marco last reported 4 unsynced observations 3 hours ago.`

Require confirmation.

Never imply the server knows whether a currently offline contributor has additional unseen local data.

---

# 58. Closing a project

Administrator can mark a project:

`Collection closed`

Contributors can still:

open project
see existing local records
synchronize existing records

They cannot begin new observations after receiving the closed state.

If they were offline before closure, they may temporarily continue collecting against their cached state.

Those records should not be silently discarded when they reconnect.

Flag them server-side as:

`collected_after_remote_close`

and allow the administrator to decide how they are treated.

Data preservation takes precedence over enforcement.

---

# 59. No AI in the collection path

Do not initially:

classify photos
rewrite observations
normalize text using LLMs
auto-label responses
infer missing values

The field collector should capture human observation faithfully.

The future stack can operate downstream.

The collector's job is to produce trustworthy training material.

---

# 60. Future model-readiness

Every exported observation should contain enough provenance to answer:

who captured this?

for which project?

using which schema?

on which device?

at what time?

at what location?

using which version of the application?

what media belongs to it?

has the record been corrected?

when did the server receive it?

This is more important than embedding explicit AI functionality now.

---

# 61. Future ontology compatibility

The collector remains ontology-agnostic.

However the data model must preserve:

stable field IDs

stable option IDs

data types

units

schema versions

optional semantic URI

This allows a future external ontology package to map:

`field_id → ontology concept`

without modifying historical observations.

---

# 62. Future backend compatibility

Do not promise arbitrary database destinations in MVP.

Instead build around a canonical storage contract.

Future adapters may include:

PostgreSQL
S3-compatible storage
Airtable
research repositories
institutional servers

But those destinations should receive already safely ingested data rather than becoming part of the fragile field capture path unless they can satisfy the same correctness contract.

---

# 63. Open-source requirements

Repository should include:

source code

database migrations

example environment file

self-hosting instructions

architecture documentation

sync protocol documentation

export format documentation

test instructions

sample project/schema

synthetic demo dataset

No production secrets in repository.

Choose a permissive open-source license unless there is a specific strategic reason otherwise.

---

# 64. MVP non-goals

The first version is not:

a general survey SaaS

a spreadsheet

a GIS desktop application

a statistical package

an ontology editor

a labeling application

a dashboard builder

a CRM

a citizen-science social network

an AI assistant

The MVP does one thing exceptionally well:

**structured field collection under unreliable conditions.**

---

# 65. Build sequence

## Milestone 1 — Local collector

Implement:

PWA shell
local project
form schema renderer
draft autosave
photo storage
location capture
local submission transaction
local submission ledger

Test completely offline before building cloud synchronization.

## Milestone 2 — Sync engine

Implement:

Supabase backend
authentication
outbox
idempotent submission creation
TUS media upload
finalization
receipts
retry engine
foreground sync

Then deliberately destroy connectivity during every stage.

## Milestone 3 — Team workflow

Implement:

organizations
projects
invites
assignments
contributor project list
device heartbeat
administrator readiness status

## Milestone 4 — Form builder

Implement the deliberately limited schema editor.

Add immutable version publishing.

## Milestone 5 — Exports

Implement:

checkpoint creation
canonical JSONL
CSV convenience export
GeoJSON
media package
manifest

## Milestone 6 — Recovery

Implement:

local unsynced recovery export
storage-pressure handling
migration recovery mode

## Milestone 7 — Field hardening

Test on real:

iPhone
cheap Android
Safari PWA
Chrome Android PWA
weak connection
no connection
large media dataset

Do not call the application field-ready before this stage.

---

# 66. Definition of done

The MVP is complete when the following demonstration can be performed reliably:

An administrator creates an organization.

They create a project.

They define ten mixed-type fields including location and photos.

They invite three people.

A contributor receives the invite and logs in.

The project automatically becomes available offline.

The contributor enables airplane mode.

They create twenty observations containing photos.

They repeatedly kill and reopen the application during collection.

Every submitted observation remains visible as saved locally.

The contributor reconnects through an intentionally unreliable connection.

Synchronization automatically resumes.

The connection is interrupted several times during image uploads.

No submission is duplicated.

No media is lost.

The application eventually reports zero pending operations.

The contributor taps Finish Fieldwork.

The administrator sees the contributor as ready.

The administrator waits until all contributors are ready.

They create a checkpoint.

They download a ZIP.

The ZIP contains:

all expected structured records

all expected media

schema files

provenance

manifest

correct submission/media relationships

The dataset can be interpreted without accessing the application.

If this complete sequence works under deliberately bad network conditions, the core product works.

---

# 67. The final product standard

Do not optimize MVP success around number of features.

Optimize it around the sentence:

**“I would trust this app with three days of fieldwork in a place with no signal.”**

If a design decision threatens that trust in exchange for convenience, choose trust.

The infrastructure should be much more sophisticated than the visible product.

The visible product should remain almost boring:

For the administrator:

**Create → Define → Assign → Monitor → Export**

For the contributor:

**Open → Observe → Submit**

Everything else exists to make those two flows extraordinarily dependable.
