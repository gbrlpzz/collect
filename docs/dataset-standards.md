# FAIR dataset standards

Every checkpoint that `collect` produces is a small, self-contained research
package. The **FAIR dataset standards** feature makes that package machine-
readable, licensed, and reuse-ready: project administrators set dataset
metadata once, and every export carries it in four places — the manifest,
DataCite 4.4 metadata, a data dictionary, and a human-readable README.

> Status: implemented and committed (`d7f62af`). The database migration is in
> the repository (`supabase/migrations/20260812180000_dataset_metadata.sql`)
> and ships with `npm run provision`; it is **not yet applied** to the live
> deployment.

---

## 1. The four FAIR principles, mapped to collect

| Principle             | What collect does                                                                                                                                                                                                                   | Where it lives in a checkpoint                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **F — Findable**      | Every package contains machine-readable DataCite 4.4 kernel metadata, a stable project alternate identifier, and a README. A persistent identifier (DOI/URL) can be attached at the project level.                                  | `dataset/datacite.json`, `dataset/README.md`, `manifest.json`                           |
| **A — Accessible**    | The package is a single self-contained ZIP with no external references. Metadata is inside the archive, not behind an API.                                                                                                          | whole ZIP                                                                               |
| **I — Interoperable** | Data ships as JSONL (canonical), CSV, and GeoJSON; every published schema version is retained immutably; a data dictionary describes every field including an ontology mapping hook (`semantic_uri`), units, and option code lists. | `data/*`, `schema/*`, `dataset/data-dictionary.json`                                    |
| **R — Reusable**      | License and dataset contact are set once on the project and embedded in every export; historical observations keep their schema version; consent, attention, and device provenance ride along.                                      | `manifest.json`, `dataset/datacite.json`, `data/contributors.csv`, `data/attention.csv` |

There is no "FAIR checkbox" to tick — FAIR is an assessment process. What
collect provides is the **metadata substrate** that makes assessment and
registration straightforward.

---

## 2. What the administrator sets

Dataset metadata is collected in the **New project** wizard, step 1
(_Identity → Dataset metadata_), and stored on the project row.

| Field              | Column                        | Example                  | Purpose                                                       |
| ------------------ | ----------------------------- | ------------------------ | ------------------------------------------------------------- |
| License            | `projects.license`            | `CC-BY-4.0`              | Machine-readable reuse terms (SPDX identifier where possible) |
| Dataset contact    | `projects.contact_email`      | `dataset@lab.org`        | Who to ask about reuse, corrections, embargoes                |
| Dataset identifier | `projects.dataset_identifier` | `10.5281/zenodo.0000000` | Optional persistent identifier (DOI or landing-page URL)      |

License presets offered in the wizard: `CC0-1.0`, `CC-BY-4.0`,
`CC-BY-SA-4.0`, `ODbL-1.0`, `Proprietary`, plus a free-text option for any
other SPDX identifier.

### Migration

```sql
-- supabase/migrations/20260812180000_dataset_metadata.sql
alter table public.projects
  add column if not exists license text,
  add column if not exists contact_email text,
  add column if not exists dataset_identifier text;
```

All columns are nullable and read defensively, so older projects and
deployments that have not applied the migration keep working.

---

## 3. What a checkpoint contains

Package layout (new files highlighted):

```text
project-name_checkpoint-YYYY-MM-DD.zip
├── manifest.json
├── schema/
│   ├── schema-v1.json
│   └── schema-v2.json
├── data/
│   ├── submissions.jsonl
│   ├── submissions.csv
│   ├── media.csv
│   ├── contributors.csv
│   ├── attention.csv
│   └── submissions.geojson
├── dataset/
│   ├── datacite.json          # ← DataCite 4.4 kernel metadata
│   ├── data-dictionary.json   # ← every field, every schema version
│   └── README.md              # ← license, contact, identifier, FAIR notes
└── media/
    └── {submission_id}/
        └── {media_id}{ext}
```

### 3.1 `dataset/datacite.json`

DataCite 4.4 kernel metadata, ready to be handed to a DOI registration
agency (Zenodo, OSF, Dataverse) or a repository's import API.

```json
{
  "schemaVersion": "http://datacite.org/schema/kernel-4.4",
  "identifier": {
    "identifier": "10.5281/zenodo.0000000",
    "identifierType": "DOI"
  },
  "creators": [{ "name": "Field organization", "nameType": "Organizational" }],
  "titles": [{ "title": "Valladolid Rural Houses — checkpoint dataset" }],
  "publisher": "Field organization",
  "publicationYear": "2026",
  "resourceType": { "resourceTypeGeneral": "Dataset" },
  "version": "checkpoint-<uuid>",
  "descriptions": [
    {
      "description": "Occupancy and condition survey",
      "descriptionType": "Abstract"
    }
  ],
  "license": "CC-BY-4.0",
  "contributors": [
    {
      "name": "Dataset contact",
      "contributorType": "ContactPerson",
      "nameType": "Organizational",
      "contactEmail": "dataset@lab.org"
    }
  ],
  "dates": [{ "date": "2026-08-12T…Z", "dateType": "Created" }],
  "subjects": [
    { "subject": "Valladolid Rural Houses" },
    { "subject": "field data collection" }
  ],
  "alternateIdentifiers": [
    {
      "alternateIdentifier": "<project-uuid>",
      "alternateIdentifierType": "collect-project"
    }
  ]
}
```

Notes:

- `identifier` is emitted **only when** the project has a `dataset_identifier`.
- `version` is the checkpoint id, so every export is a distinct, citable
  version of the dataset.
- `creators` is the organization, not the individual admin — adjust at
  registration time if a person should be the creator.

### 3.2 `dataset/data-dictionary.json`

One entry per field per published schema version used in the dataset. This is
the file a secondary analyst or an ontology mapper reads first.

```json
[
  {
    "schema_version": 1,
    "key": "building_type",
    "label": "Building type",
    "type": "single_choice",
    "required": true,
    "description": null,
    "semantic_uri": "https://example.org/onto#BuildingType",
    "unit": null,
    "options": [
      { "id": "building-house", "value": "house", "label": "House" },
      { "id": "building-other", "value": "other", "label": "Other" }
    ]
  }
]
```

`semantic_uri` is the forward-compatibility hook: a field can point at a
class in any ontology, so a domain schema (Darwin Core, DDI, EML, …) can be
mapped without forking the product.

### 3.3 `dataset/README.md`

Human-readable summary: project name and description, license, contact,
identifier, publisher, checkpoint id and cutoff timestamp, plus a short FAIR
notes section and a pointer to this documentation.

### 3.4 `manifest.json` additions

```json
{
  "dataset": {
    "license": "CC-BY-4.0",
    "contact_email": "dataset@lab.org",
    "dataset_identifier": "10.5281/zenodo.0000000"
  }
}
```

---

## 4. Using the metadata in practice

**Registering a DOI.** Export a checkpoint, upload the ZIP to Zenodo/OSF (or
your institution's repository), and paste `dataset/datacite.json` into the
metadata import. The record is already shaped like DataCite expects — only the
final DOI assignment happens at the repository.

**Sharing with a collaborator.** Send the ZIP. They can read
`dataset/README.md` for the license and contact, `dataset/datacite.json` for
citation metadata, `dataset/data-dictionary.json` to understand every column,
and `schema/` to see exactly which form version produced each observation.

**Auditing.** The manifest records the export cutoff, the schema versions,
the contributor readiness snapshot at cutoff, and the SHA-256 of the canonical
JSONL and media CSV — an export can be proven to be the exact bytes described.

---

## 5. What is deliberately out of scope

| Thing                                  | Why not                                                                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOI minting                            | Requires a registration-agency account (DataCite/Crossref) and is an operational decision per deployment. `dataset_identifier` makes it plug-in-ready.               |
| Domain schemas (EML, Darwin Core, DDI) | Ecology, biodiversity, and survey-microdata schemas are domain-specific. The `semantic_uri` hook + data dictionary is the portable middle ground.                    |
| RO-Crate / W3C PROV packages           | Provenance already lives in the data (contributor, device, timestamps, schema version, consent, attention). RO-Crate is a reasonable future wrapper if a group asks. |
| License legal advice                   | The license field is metadata. Choosing a license for human-subject data is a legal/institutional decision.                                                          |

---

## 6. Related documentation

- `docs/export-format.md` — full checkpoint package specification.
- `docs/attention-qa.md` — automatic attention verification (the data-quality twin of this feature).
- `docs/background-automation.md` — everything that happens automatically under the hood.
- `docs/architecture.md` — reliability boundaries and backend contract.
