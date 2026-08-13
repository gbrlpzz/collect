# User and system flows

This document describes the primary workflows and the system transitions that support them. Interface labels are written in **bold**; implementation states and identifiers use `code`.

## Contributor flow

### First use

1. An administrator invites the contributor to a project.
2. The contributor opens the invitation or requests a passwordless email link.
3. After authentication, the contributor reviews the current consent summary and explicitly accepts or declines.
4. On iPhone, the contributor can add the app to the Home Screen. The installed app uses a separate iOS storage container and therefore requires its own session.
5. The contributor opens the installed app and enters a single-use device code created from a signed-in browser or another signed-in device.
6. The app persists assigned project metadata and the published schema for offline use.

### Collect an observation

1. Tap **New observation**.
2. The client creates or resumes a durable draft.
3. Complete one field at a time. Single-choice fields may advance automatically; text, number, media, and multiple-choice fields wait for an explicit action.
4. Leave an optional field empty and tap **Skip**. Optional fields do not receive automatic keyboard focus.
5. If the schema declares a location field, the client requires contextual location access before showing any questions; otherwise it never requests location.
6. Tap **Save observation**.
7. The client validates required fields and commits the submission, media, and outbox operations atomically.
8. Only after that transaction succeeds does the interface show **Saved on this device**.

### Synchronize

1. The lifecycle controller detects due outbox work.
2. The client probes the server rather than trusting `navigator.onLine`.
3. A cross-tab lease elects one synchronization owner.
4. The client sends metadata, resumes or starts media uploads, confirms media, and requests finalization.
5. The server validates identity, project access, consent, schema version, payload integrity, media completeness, and idempotency.
6. The server returns a receipt naming the finalized submission.
7. The client verifies the receipt identity and changes the local record to `SYNCED`.
8. Failures classified as transient retry automatically. Permanent conflicts become `ACTION_REQUIRED` and remain visible until resolved.

### Recover local work

1. Open **Profile → Data and privacy → Export local data copy**, or use recovery mode before authentication if the database cannot be opened normally.
2. The client reads durable stores directly and packages unsynced submissions, media, drafts, projects, outbox operations, and receipts.
3. The resulting recovery export stays local to the user-selected destination. It is not uploaded automatically and is not equivalent to a server checkpoint.

## Administrator flow

### Create and publish a project

1. Enter the project name. This is the only required identity field.
2. Optionally disclose and enter the description, field instructions, workspace name, license, dataset contact, and dataset identifier.
3. Define typed fields. Data keys and less common configuration remain under **Advanced**.
4. Preview the exact contributor flow without persisting preview observations.
5. Publish the schema. Published versions are immutable.
6. Add contributor email addresses or invite people later from the project.

### Monitor fieldwork

1. The dashboard loads the project roster and the latest server-visible device status.
2. Readiness aggregates every known device for each contributor.
3. The interface prioritizes contributors or records that need action; healthy synchronization details remain collapsed.
4. Attention summaries are advisory quality metadata. They do not change, rank, reject, or remove observations automatically.
5. An administrator can send a reminder, review technical details, or export a checkpoint.

### Export a checkpoint

1. The administrator requests an export at a server cutoff timestamp.
2. The server selects only complete submissions finalized at or before the cutoff.
3. The export function gathers immutable schema versions, records, media, contributor metadata, readiness, consent, and attention data.
4. The function creates a manifest, canonical JSONL, convenience formats, FAIR-supporting metadata, and integrity hashes.
5. The checkpoint record stores the cutoff and package metadata.
6. The administrator downloads a self-contained ZIP. A checkpoint describes server-visible truth; offline devices may still contain unseen work.

## Authentication flows

| Context             | Primary path                               | Alternatives                                                          |
| ------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Browser             | Passwordless email link                    | Password or six-digit email code when the email template provides one |
| Installed iOS app   | Eight-character device-link code           | Password, email link, or email code                                   |
| New invited account | Invitation link followed by password setup | Deployment-specific email-code path                                   |

Device-link codes are short-lived, single-use, and stored server-side only as SHA-256 digests. They bridge authentication, not local drafts or browser storage.

## Software keyboard flow

The application treats the software keyboard as part of the mobile viewport:

1. One app-level `visualViewport` controller publishes the visible height and top offset.
2. Forms, authentication, sheets, dialogs, and persistent action bars follow that viewport.
3. The primary action remains above the keyboard.
4. Secondary navigation is reduced while typing.
5. Empty optional fields do not summon the keyboard automatically.

This behavior is a product invariant because mobile is the primary interface.

## State summary

| State                | Meaning                                                                              | User action                                       |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Draft                | The observation is still editable and has not crossed the local submission boundary. | Continue or discard deliberately.                 |
| Saved on this device | The local atomic commit succeeded. Server transfer may still be pending.             | Continue fieldwork; synchronization is automatic. |
| Waiting to send      | Durable outbox work exists but no transfer is active.                                | Usually none.                                     |
| Sending              | One synchronization owner is processing due work.                                    | Usually none.                                     |
| Synced               | A matching server finalization receipt exists.                                       | None.                                             |
| Action required      | A permanent conflict or missing local requirement prevents automatic completion.     | Open the record or recovery details.              |
