# collect documentation

This directory documents the product contract, user and system flows, implementation boundaries, operations, and exported data formats.

## Choose a reading path

### Evaluate the product

1. [Repository overview](../README.md)
2. [Product value and fit](value.md)
3. [User and system flows](flows.md)
4. [Privacy and data handling](privacy.md)

### Operate an instance

1. [Deployment](deployment.md)
2. [Interface baseline](design.md)
3. [Background automation](background-automation.md)
4. [Checkpoint export format](export-format.md)
5. [FAIR-supporting dataset metadata](dataset-standards.md)

### Change the implementation

1. [Architecture](architecture.md)
2. [Product specification](spec.md)
3. [Implementation status](PLAN.md)
4. [Contributing](../CONTRIBUTING.md)
5. [Agent guidance](../AGENTS.md)

## Document authority

The documents serve different purposes:

| Document                                     | Authority                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Product specification](spec.md)             | Normative requirements baseline. Explicit implementation deltas appear at the top. |
| [Architecture](architecture.md)              | Current implementation invariants and trust boundaries.                            |
| [Checkpoint export format](export-format.md) | Current package structure and field semantics.                                     |
| [Deployment](deployment.md)                  | Current supported provisioning and operational procedure.                          |
| [Implementation status](PLAN.md)             | Current coverage and known limitations; not a requirements document.               |
| README, value, flows, privacy, design        | Explanatory documents derived from the contracts above.                            |

When documents disagree, verify the current code and update both the implementation document and the affected explanatory page in the same change.

## Standard terminology

| Term                | Meaning                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Observation**     | The contributor-facing unit of fieldwork: structured answers, media, location, and provenance.                           |
| **Draft**           | An observation that has not yet crossed the local submission boundary.                                                   |
| **Submission**      | The durable local or server representation of a submitted observation.                                                   |
| **Local receipt**   | Evidence that the submission, media, and outbox operations committed successfully on the current device.                 |
| **Server receipt**  | Evidence that the server finalized the complete submission. This is the only basis for the `SYNCED` state.               |
| **Outbox**          | Durable operations that remain pending until acknowledged or classified as requiring action.                             |
| **Schema version**  | An immutable published definition used to validate and interpret observations.                                           |
| **Checkpoint**      | An immutable server-side export snapshot at a defined cutoff timestamp.                                                  |
| **Recovery export** | A local package of unsynced device data. It is not a checkpoint.                                                         |
| **Readiness**       | Server-visible status aggregated from every known contributor device. It cannot describe a device that has not reported. |
| **Contributor**     | A person collecting observations for assigned projects.                                                                  |
| **Administrator**   | A person configuring projects, assigning contributors, monitoring readiness, and exporting checkpoints.                  |

Use these terms consistently in code comments, interface copy, issues, and documentation. In particular, do not use **saved** as a synonym for **synced**, or **checkpoint** as a synonym for **recovery export**.

## Writing standard

- Use concise international technical English.
- Prefer active voice and concrete system subjects: “The client commits the submission,” not “The submission gets saved.”
- State guarantees only at the boundary that enforces them.
- Separate current behavior from planned behavior.
- Avoid time-sensitive deployment claims unless the document names the source and review date.
- Expand an abbreviation on first use.
- Use code formatting for identifiers, states, paths, commands, and environment variables.
- Use sentence case for headings.
- Link to one authoritative page instead of duplicating long explanations.

## Maintenance checklist

Update documentation in the same pull request when changing:

- a user-visible flow or label;
- a local or server state transition;
- authentication or authorization;
- a database migration or Edge Function;
- an environment variable or deployment command;
- an export field or package path;
- a product invariant, supported field type, or documented limitation.

Before publishing, run:

```bash
npm run check
git diff --check
```

Also verify that every relative Markdown link resolves and that deployment instructions match `scripts/provision.mjs` and the GitHub workflows.
