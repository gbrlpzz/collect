# User and system flows

This document describes the primary user workflows and system state transitions in `collect`. UI labels appear in **bold**; code symbols and states appear in `code`.

---

## Contributor workflow

```mermaid
flowchart TD
  accTitle: Contributor Field Workflow
  accDescr: Step-by-step workflow of a contributor from onboarding, offline form filling with attention checks, atomic local commit, to background sync.

  Start([Email Invitation]) --> Auth[Sign In: Magic Link or Link Code]
  Auth --> Consent[Accept Versioned Consent]
  Consent --> SyncSchemas[Cache Assigned Projects & Schemas to IndexedDB]

  subgraph Fieldwork["📱 Fieldwork Capture (Fully Offline)"]
    SyncSchemas --> OpenCollector[Tap 'Add observation']
    OpenCollector --> ResumeOrNew{Existing Draft?}
    ResumeOrNew -->|Yes| ResumeDraft[Resume In-Progress Draft]
    ResumeOrNew -->|No| InitDraft[Initialize New Draft in IndexedDB]
    ResumeDraft --> QuestionLoop
    InitDraft --> QuestionLoop

    subgraph QuestionLoop["Guided One-Field Capture"]
      RenderField[Display Active Field] --> AnswerField[Contributor Answers]
      AnswerField --> AutoOrManual{Field Type}
      AutoOrManual -->|Single Choice| AutoAdvance[Auto-Advance Next Field]
      AutoOrManual -->|Text / Number / Date / Media| TapContinue[Tap Continue]
      AutoAdvance --> NextCheck{More Fields?}
      TapContinue --> NextCheck
      NextCheck -->|Yes| RenderField
      NextCheck -->|Inline Attention Check| AttentionStep[Answer Instruction Check]
      AttentionStep --> StripAttention[Strip Check from Research Payload]
      StripAttention --> NextCheck
    end

    NextCheck -->|No| ReviewScreen[Final Review & Verification]
    ReviewScreen --> TapSave[Tap 'Save observation']
    TapSave --> AtomicCommit[Atomic IndexedDB Transaction<br/>• Payload & Metadata<br/>• Media Blobs<br/>• Outbox Task]
    AtomicCommit --> LocalReceipt[Show 'Saved on this device']
  end

  subgraph Transfer["☁️ Background Sync"]
    LocalReceipt --> HealthProbe{/health OK?}
    HealthProbe -->|No| RetryBackoff[Exponential Retry Backoff]
    HealthProbe -->|Yes| MediaUpload[TUS Resumable Media Chunk Upload]
    MediaUpload --> FinalizeCall[POST /sync-submission]
    FinalizeCall --> ServerReceipt[Show 'Synced']
  end
```

### 1. Onboarding and sign-in

1. The administrator invites the contributor to a project by email; the invitation email creates the account on first open.
2. The administrator issues a **sign-in code** from the roster (**Contributors → ⋯ → Issue sign-in code**); the single-use, 20-minute code is emailed to the contributor and shown to the administrator for in-person sharing.
3. The contributor signs in by entering the 8-character code on the login screen (**Sign in with a code**). Returning contributors can request a fresh code by email from the same screen (invite-only, uniform response).
4. The contributor reviews the privacy disclosure and accepts the versioned consent.
5. On iOS, the contributor adds `collect` to the Home Screen. Because iOS runs installed web apps in an isolated storage container, the app requires its own authentication session (device-link codes from **Profile → Sign in another device** still bridge a signed-in browser to the installed app).
6. The app downloads assigned project definitions and published schemas into IndexedDB for offline use.

### 2. Capturing an observation

1. Tap **Add observation** on the project card.
2. The client opens or resumes a durable draft in IndexedDB.
3. Complete one field at a time. Single-choice fields advance automatically; text, numbers, dates, and media wait for manual advance (**Continue**).
4. Skip empty optional fields by tapping **Skip**. The software keyboard never focuses empty optional fields automatically.
5. If the schema includes a location field, the app requests location permissions before questions begin.
6. Tap **Home** at any time to pause. The draft remains safe locally. From the home screen, tap **Resume observation** or **Discard and start new**.
7. Tap **Save observation** on the final screen.
8. The client validates required fields and commits the submission, media blobs, and outbox operations in a single IndexedDB transaction.
9. The interface displays **Saved on this device** only after this local transaction completes.

### 3. Background synchronization

1. The lifecycle manager detects pending work in the outbox.
2. The client checks server reachability via the `/health` endpoint.
3. A cross-tab mutex lease elects one active sync worker.
4. The client uploads metadata, sends media files via resumable TUS, and calls the finalization endpoint.
5. The server validates contributor consent, project membership, payload hashes, and media completeness.
6. The server returns a signed finalization receipt.
7. The client matches the receipt and updates the local record status to `SYNCED`.
8. Transient errors retry automatically with exponential backoff. Irrecoverable conflicts transition to `ACTION_REQUIRED`.

### 4. Local data recovery

1. Open **Profile → Data and privacy → Export local data copy** (or use the pre-login recovery mode).
2. The client reads IndexedDB directly and exports a ZIP archive of unsynced drafts, submissions, media blobs, and logs.
3. The recovery archive saves directly to the device storage.

---

## Administrator workflow

```mermaid
flowchart TD
  accTitle: Administrator Project and Governance Workflow
  accDescr: Complete administrator workflow from project creation, schema authoring, live preview, publication, contributor management, readiness tracking, to FAIR checkpoint export.

  Start([Admin Login]) --> CreateProject[Create Project Record]
  CreateProject --> SetMetadata[Define Metadata: Name, Instructions, License, Contact, DOI]
  SetMetadata --> DefineSchema[Add Typed Fields: Text, Numbers, Choices, Location, Photos, Audio]
  DefineSchema --> LivePreview[Test Form in Live Interactive Preview]
  LivePreview --> Satisfied{Form Ready?}
  Satisfied -->|No| DefineSchema
  Satisfied -->|Yes| PublishSchema[Publish Schema Version<br/>🔒 Immutable Data Contract]

  PublishSchema --> InviteTeam[Invite Contributors by Email]

  subgraph Monitor["📊 Field Monitoring & Quality Governance"]
    InviteTeam --> Dashboard[Open Project Dashboard]
    Dashboard --> TrackReadiness[Review Contributor Device Readiness<br/>• Active Draft Counts<br/>• Pending Outbox Submissions<br/>• Last Seen Timestamps]
    TrackReadiness --> CheckSignals[Inspect Advisory Attention Check Summaries]
    CheckSignals --> SendReminders[Send Fieldwork Ping / Email Reminder if needed]
  end

  subgraph Export["📦 Data Preservation & Checkpoint"]
    Dashboard --> SelectCutoff[Select Checkpoint Cutoff Timestamp]
    SelectCutoff --> EdgeExport[Trigger /export-checkpoint Edge Function]
    EdgeExport --> FilterComplete[Filter Complete Finalized Submissions ≤ Cutoff]
    FilterComplete --> BuildBundle[Bundle JSONL, CSV, GeoJSON, Media Originals, Schemas, DataCite 4.4]
    BuildBundle --> ChecksumManifest[Generate SHA-256 Checksums in manifest.json]
    ChecksumManifest --> DownloadZIP[Download Immutable FAIR Archive ZIP]
  end
```

### 1. Creating and publishing projects

1. Enter the project name (the only mandatory field).
2. Optionally enter field instructions, dataset license (SPDX identifier), contact email, and DOI.
3. Add typed fields (text, numbers, choice lists, coordinates, photos, audio).
4. Test the form in the live interactive preview.
5. Publish the schema. Published schema versions are immutable.
6. Invite contributors by entering their email addresses.

### 2. Monitoring fieldwork

1. Open the project dashboard to review contributor rosters and device readiness.
2. Readiness aggregates active drafts and unsynced outbox counts across all known contributor devices.
3. The dashboard highlights items needing attention; healthy background sync details remain collapsed.
4. Review advisory attention summaries (quality metadata that never alters or deletes research records).
5. Send email reminders to contributors with pending unsynced records.

### 3. Exporting checkpoint archives

1. Select **Export checkpoint** at a chosen cutoff timestamp.
2. The server filters complete submissions finalized at or before the cutoff.
3. The export engine bundles JSONL data, CSV tables, GeoJSON layers, raw media, schemas, and DataCite metadata into a ZIP file.
4. The administrator downloads the immutable checkpoint archive.

---

## Authentication matrix

```mermaid
sequenceDiagram
  autonumber
  actor Admin as Administrator
  actor Contributor as Contributor
  participant Safari as Safari Browser
  participant PWA as Installed iOS PWA
  participant Edge as Edge Function (link-session)
  participant Auth as Supabase Auth / DB

  Admin->>Auth: Send Project Invitation to Contributor Email
  Auth-->>Contributor: Email with Magic Link
  Contributor->>Safari: Opens Magic Link in Safari
  Safari->>Auth: Authenticate session token
  Safari->>Contributor: Displays Web App Interface

  Note over Contributor,PWA: iOS Container Boundary: Installed PWA has separate storage
  Contributor->>Safari: Taps 'Add to Home Screen'
  Contributor->>Safari: Opens Profile → "Sign in another device"
  Safari->>Edge: POST /link-session (action: 'create')
  Edge->>Auth: Store SHA-256 hash of 8-char code (10m TTL)
  Edge-->>Safari: Return 8-character code (e.g. ABCD-1234)
  Safari-->>Contributor: Displays code on screen

  Contributor->>PWA: Opens Home Screen App & enters code
  PWA->>Edge: POST /link-session (action: 'claim', code)
  Edge->>Auth: Match hash, burn single-use code, issue session tokens
  Edge-->>PWA: Return Auth Access & Refresh Tokens
  PWA->>PWA: Initialize local IndexedDB store (collect-local-v1-userId)
  PWA-->>Contributor: Ready for offline fieldwork
```

| Client context               | Primary method                                            | Fallback method        |
| :--------------------------- | :-------------------------------------------------------- | :--------------------- |
| **Contributor (any device)** | 8-character sign-in code (admin-issued or self-service)   | Password (if set)      |
| **Installed iOS PWA**        | Sign-in code or device-link code from a signed-in browser | Password (if set)      |
| **Administrator**            | Invitation link + password setup                          | Magic link / email OTP |

Contributor sign-in codes and device-link codes share the same bridge: they
are 8 characters from an unambiguous alphabet (32⁸ ≈ 1.1×10¹²), single-use
with an atomic consume, expire after 20 minutes (device links: 5), are
stored only as SHA-256 hashes, and invalidate after 10 failed attempts.
Minting is throttled to 3 codes per user per 20 minutes and every issuance
is written to `audit_events`.

---

## Software keyboard handling

Mobile viewports require strict keyboard management:

1. An app-level `visualViewport` listener tracks viewport height and offset changes.
2. Form containers and modal sheets dynamically adjust to visible screen space.
3. The primary action button remains visible above the software keyboard.
4. Empty optional fields do not autofocus to prevent unnecessary keyboard popups.

---

## Observation state transitions

```mermaid
stateDiagram-v2
  accTitle: Observation Lifecycle State Machine
  accDescr: States through which an observation passes from initial draft creation to local commitment, outbox queuing, transmission, and final server receipt or action required.

  [*] --> Draft: User taps 'Add observation'

  Draft --> Draft: Autosave field changes to IndexedDB
  Draft --> [*]: User intentionally discards draft

  Draft --> SavedOnThisDevice: User taps 'Save observation'<br/>(Atomic IndexedDB commit)

  state SavedOnThisDevice {
    [*] --> WaitingToSend: Outbox entry registered
    WaitingToSend --> Sending: Health probe OK & Mutex lease acquired
    Sending --> WaitingToSend: Transient error (Network drop / Backoff)
  }

  Sending --> Synced: Server issues finalization receipt<br/>(Immutable research record)
  Sending --> ActionRequired: Permanent conflict (Schema revoked / Media missing)

  ActionRequired --> WaitingToSend: User repairs or retries
  ActionRequired --> LocalExport: User exports emergency device ZIP

  Synced --> [*]: Preserved in Checkpoint Export
```

| State                    | Definition                                                 | User action                                |
| :----------------------- | :--------------------------------------------------------- | :----------------------------------------- |
| **Draft**                | Observation is open for editing in local IndexedDB.        | Resume editing or deliberately discard.    |
| **Saved on this device** | Committed atomically to local IndexedDB; outbox is queued. | Continue fieldwork. Transfer is automatic. |
| **Waiting to send**      | Outbox entry is queued; waiting for network or lease.      | None required.                             |
| **Sending**              | Active sync worker is uploading metadata or media.         | None required.                             |
| **Synced**               | Server finalized the record and issued a durable receipt.  | None. Record is safely preserved.          |
| **Action required**      | Permanent conflict or missing media blocks upload.         | Open Sync details to inspect or recover.   |
