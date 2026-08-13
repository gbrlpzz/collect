# Privacy and data handling

This document explains what `collect` records, why it records it, where it is stored, and which responsibilities remain with the organization operating an instance.

It is a technical description, not a privacy notice or legal determination. Operators must adapt consent language, retention, lawful basis, institutional review, and data-subject procedures to their jurisdiction and research protocol.

## Data categories

| Category            | Examples                                                                                                | Purpose                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Research data       | Typed answers, free text, selected options, dates, repeatable groups                                    | The project’s scientific or operational record                                   |
| Media               | User-selected photos and audio, original filename, MIME type, size, capture time                        | Primary evidence associated with an observation                                  |
| Location            | Coordinates, accuracy, capture time, source                                                             | Spatial provenance for projects whose published schema declares a location field |
| Record provenance   | Schema version, app version, client and server timestamps, timezone, contributor and device identifiers | Interpretation, auditability, conflict detection, and recovery                   |
| Device environment  | Operating system, browser, device family, screen, orientation, connection type, battery state, language | Operational diagnostics and fieldwork provenance                                 |
| Identity and access | Email address, organization membership, project membership, invitation state                            | Authentication and authorization                                                 |
| Consent record      | Consent version, grant timestamp, revocation timestamp                                                  | Server enforcement and export provenance                                         |
| Attention metadata  | Stable check key, selected value, server-derived correctness, aggregate score and counts                | Advisory data-quality interpretation                                             |
| Operational status  | Pending submission and media counts, last-seen time, last successful receipt, completion state          | Multi-device readiness and support                                               |

## Local storage

Each authenticated account uses a separate IndexedDB database in the current browser or installed-app container. Local storage can contain:

- assigned project metadata and published schemas;
- drafts and submitted observations;
- original media blobs;
- durable outbox operations;
- local and server receipts;
- device status and recovery metadata.

On iOS, Safari and the installed Home Screen app use separate containers. Sessions and local data do not move between them. A device-link code creates a session in the second container; it does not copy local fieldwork.

The client requests persistent storage and monitors quota, but browsers retain final control. Physical device loss, manual site-data deletion, browser removal, or operating-system eviction can destroy local data. Contributors can create a recovery export for unsynced work.

## Server storage and transfer

When synchronization succeeds:

- structured submissions and provenance are stored in Postgres;
- original media is stored in a private Supabase Storage bucket;
- row-level security and server-side authorization limit access to the contributor and authorized administrators;
- privileged operations use Edge Functions; service-role credentials never enter the browser;
- finalized observations and published schemas are protected from ordinary mutation.

The client does not treat a request, upload start, or connectivity indicator as successful transfer. Only a matching server finalization receipt produces the `SYNCED` state.

## Automatic collection

The application automates provenance to reduce contributor effort and improve recoverability. Environment data is collected when the browser exposes it. Location is never requested for a project without a location field. When the published schema declares one, the contributor must grant contextual location access before collection can begin; denial leaves the collection flow locked.

Automatic capture must remain:

- non-blocking when the field is optional;
- explicit when a required value cannot be obtained;
- described in the consent and project privacy surfaces;
- limited to operational and research purposes documented by the deployment.

The application does not perform AI transformation in the collection path.

## Attention verification

Attention metadata is separate from the research payload. The client removes the synthetic attention field before hashing and storing research values. The server stores the stable check key and selected value, derives explicit `correct` and `passed` values against its own bank, and updates an aggregate score.

The score is advisory. It must not be interpreted as a clinical, employment, competence, or character assessment. The application does not automatically rank contributors, reject observations, or modify data based on the score. Deployments should review the question bank for language, education, culture, disability, and population suitability before use.

See [Attention verification](attention-qa.md) for calculation and limitations.

## Consent

`collect` stores a versioned consent decision and refuses server ingestion when the current profile lacks granted, non-revoked consent. This enforcement proves that the configured in-app step occurred; it does not by itself establish that a deployment meets legal, ethics-board, safeguarding, or informed-consent requirements.

Operators are responsible for:

- writing protocol-appropriate consent text;
- determining whether in-app consent is sufficient;
- recording withdrawal and handling already exported data;
- defining retention and deletion procedures;
- providing appropriate contact and escalation channels.

## Exports

Two export types have different trust boundaries:

| Export          | Source         | Contents                                                                                             | Meaning                                              |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Checkpoint      | Server         | Complete finalized submissions at a cutoff, original media, schemas, contributor metadata, manifests | Immutable server-visible snapshot                    |
| Recovery export | Current device | Unsynced local records, media, drafts, outbox operations, receipts                                   | Escape hatch for local work; not a canonical dataset |

Checkpoint packages may contain personal data, precise coordinates, device information, and sensitive research content. Administrators must store and transfer them according to the project’s data-management plan.

## Logging and secrets

Application and server logs must not contain:

- research payloads or free text;
- precise coordinates;
- media contents or private media URLs;
- passwords, access tokens, one-time codes, database credentials, or service-role keys.

Only fixed, non-sensitive errors should be returned to clients from privileged operations.

## Retention and deletion boundaries

The core application preserves submitted evidence and does not expose casual deletion of finalized observations. Retention, correction, withdrawal, and deletion workflows are deployment governance decisions and may require database administration or a future audited product workflow.

Closing a project stops ordinary collection but does not erase historical records. A checkpoint remains an independent artifact after download.

## Related documentation

- [Architecture](architecture.md) — authorization, local storage, and receipt boundaries.
- [Checkpoint export format](export-format.md) — exported personal and provenance fields.
- [Attention verification](attention-qa.md) — stored fields, calculation, and limitations.
- [Deployment](deployment.md) — secret handling and operator configuration.
