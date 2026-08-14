# Documentation index

This directory documents the system architecture, workflows, data formats, and deployment procedures for `collect`.

---

## Reading paths

### 1. Evaluate the product

- [Repository overview](../README.md): High-level introduction and architecture overview.
- [Product value and fit](value.md): Core problem, value propositions, and comparison matrix.
- [User and system flows](flows.md): Step-by-step contributor, administrator, and authentication workflows.
- [Privacy and data handling](privacy.md): Data boundaries, retention policies, and operator obligations.

### 2. Operate a deployment

- [Deployment](deployment.md): Provisioning steps, environment variables, and CLI automation.
- [Interface baseline](design.md): Mobile interaction rules, typography, touch targets, and themes.
- [Background automation](background-automation.md): Lifecycle triggers, synchronization leases, and retry loops.
- [Checkpoint export format](export-format.md): Package archive structure, JSONL formats, and integrity hashes.
- [FAIR dataset standards](dataset-standards.md): DataCite metadata, schema history, and data dictionaries.
- [Attention verification](attention-qa.md): Quality check bank, scoring formulas, and ethical boundaries.

### 3. Develop and contribute

- [Architecture](architecture.md): Code boundaries, storage isolation, and synchronization invariants.
- [Product specification](spec.md): Normative system requirements and constraints.
- [Implementation status](PLAN.md): Current test coverage and roadmap status.
- [Contributing](../CONTRIBUTING.md): Contribution guidelines and testing expectations.
- [Agent guidance](../AGENTS.md): Strict system invariants for automated and human developers.

---

## Document authority

Different documents serve specific authoritative purposes:

| Document                                     | Authority                                                                              |
| :------------------------------------------- | :------------------------------------------------------------------------------------- |
| [Product specification](spec.md)             | **Normative baseline**: Sets core requirements and technical constraints.              |
| [Architecture](architecture.md)              | **System design**: Explains current implementation invariants and security boundaries. |
| [Checkpoint export format](export-format.md) | **Data contract**: Defines the layout and schema of export packages.                   |
| [Deployment](deployment.md)                  | **Operations**: Outlines the supported provisioning procedure.                         |
| [Implementation status](PLAN.md)             | **Roadmap**: Records current test coverage and pending items.                          |
| Other guides (README, value, flows, privacy) | **Explanatory**: Explain the system contracts for specific audiences.                  |

When documents disagree, verify the code and update both the technical document and the explanatory guides in the same commit.

---

## Standard terminology

Use these terms consistently across code comments, UI copy, and documentation:

| Term                | Precise meaning                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------- |
| **Observation**     | The contributor-facing unit of fieldwork: structured answers, media, location, and metadata.       |
| **Draft**           | An observation being edited locally that has not crossed the submission boundary.                  |
| **Submission**      | A committed observation record stored in IndexedDB or on the server.                               |
| **Local receipt**   | Proof that the submission, media, and outbox committed to IndexedDB (**Saved on this device**).    |
| **Server receipt**  | Proof that the server finalized the complete submission (**Synced**).                              |
| **Outbox**          | Durable operations stored in IndexedDB awaiting server synchronization.                            |
| **Schema version**  | An immutable published schema used to validate and render observations.                            |
| **Checkpoint**      | An immutable server-generated ZIP archive of complete submissions at a specific cutoff timestamp.  |
| **Recovery export** | A locally generated ZIP of unsynced device records. It is not a canonical server checkpoint.       |
| **Readiness**       | Multi-device status aggregated from server-visible reports. It cannot describe unreported devices. |
| **Contributor**     | An authenticated user collecting observations for assigned projects.                               |
| **Administrator**   | An authenticated user managing projects, schemas, rosters, and data exports.                       |

> [!IMPORTANT]
> Never use **Saved** as a synonym for **Synced**. Never use **Checkpoint** as a synonym for **Recovery export**.

---

## Documentation maintenance

Update documentation in the same pull request whenever you change:

- User-facing flows, buttons, or status labels.
- Local or server state machine transitions.
- Authentication or authorization rules.
- Database migrations, RLS policies, or Edge Functions.
- Environment variables or CLI provisioning scripts.
- Export package contents or metadata fields.

Before publishing changes, run:

```bash
npm run check
git diff --check
```
