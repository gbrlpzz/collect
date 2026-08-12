# Checkpoint export format

Every **checkpoint** is an immutable snapshot of everything the server had
completely received at a single server timestamp. Exporting twice creates two
checkpoints; each package is self-contained and interpretable without this
application.

## Package layout

```text
project-name_checkpoint-YYYY-MM-DD.zip
├── manifest.json
├── schema/
│   ├── schema-v1.json
│   └── schema-v2.json          # every published schema version used in the dataset
├── data/
│   ├── submissions.jsonl       # canonical: one complete submission per line
│   ├── submissions.csv         # convenience flat view (payload as JSON column)
│   ├── media.csv               # media metadata with export paths
│   ├── contributors.csv        # roster, invites, consent, attention, readiness
│   ├── attention.csv           # per-submission attention-check results
│   └── submissions.geojson     # point features from top-level `location` fields
├── dataset/
│   ├── datacite.json           # DataCite 4.4 kernel metadata (DOI-ready)
│   ├── data-dictionary.json    # every published field: type, options, unit, semantic_uri
│   └── README.md               # license, contact, identifier, FAIR notes
└── media/
    └── {submission_id}/
        └── {media_id}{ext}     # original files, never recompressed
```

## manifest.json

```json
{
  "export_format_version": "1",
  "software_version": "0.1.2",
  "project": {
    "id": "...",
    "organization_id": "...",
    "name": "...",
    "status": "active"
  },
  "organization": { "id": "...", "name": "...", "logo_path": null },
  "checkpoint_id": "uuid",
  "created_at": "2026-08-10T09:00:00.000Z",
  "cutoff_server_timestamp": "2026-08-10T09:00:00.000Z",
  "schema_versions": [1, 2],
  "submission_count": 12,
  "media_count": 31,
  "hashes": {
    "submissions_jsonl_sha256": "hex",
    "media_csv_sha256": "hex"
  },
  "note": "A checkpoint contains only complete submissions received by the server at the cutoff timestamp. Offline devices may hold additional unseen data."
}
```

The `note` is a contract: a checkpoint is a server-truth snapshot, never a
claim that offline devices have no unseen data.

## data/submissions.jsonl (canonical)

One JSON object per line, ordered by `server_received_at`:

```json
{
  "id": "submission-uuid",
  "project_id": "project-uuid",
  "schema_id": "schema-uuid",
  "contributor_id": "user-uuid",
  "device_id": "device-uuid",
  "payload": {
    "site_code": "VA-023",
    "location": { "latitude": 41.65, "longitude": -4.72, "accuracy": 8 }
  },
  "client_created_at": "2026-08-09T07:42:11Z",
  "client_timezone": "Europe/Madrid",
  "server_received_at": "2026-08-09T07:45:02Z",
  "status": "COMPLETE",
  "finalized_at": "2026-08-09T07:45:02Z",
  "app_version": "0.1.2",
  "collected_after_remote_close": false,
  "corrects_submission_id": null,
  "media": [
    {
      "id": "media-uuid",
      "field_id": "site_photos",
      "mime_type": "image/jpeg",
      "byte_size": 3120441,
      "original_filename": "IMG_0001.jpg",
      "sha256": null,
      "captured_at": "2026-08-09T07:41:55Z",
      "capture_source": "picker",
      "status": "UPLOADED",
      "export_path": "media/{submission_id}/{media_id}.jpg"
    }
  ]
}
```

Notes:

- `payload` is the typed field payload exactly as validated against its schema
  version. Repeatable groups are arrays of objects; choice fields store stable
  option ids (`{ "value": "...", "otherText": "..." }` when "Other" is used);
  numbers store `{ "value": 3, "unit": "people" }`.
- `status` is always `COMPLETE` in a checkpoint; `corrects_submission_id`
  links corrected copies while the original stays in the audit history.
- `attention_failed` is the binary attention-verification signal: `true`
  means the random check embedded in that observation was answered wrong
  (useful for filtering low-attention records). The check question itself is
  never stored; see `data/attention.csv` for the details.
- `environment` carries the automatically recorded provenance (device model,
  OS, browser, screen, orientation, connection, battery, timezone).
- Media is never recompressed or renamed beyond a sanitized extension derived
  from the original filename (or the MIME type when the filename has none).

## data/submissions.geojson

One `Point` feature per submission whose top-level `payload.location` is a
valid `{ latitude, longitude, accuracy }`. Properties carry the submission
metadata plus the full payload, so the GeoJSON is usable on its own.

## data/submissions.csv and media.csv

Convenience flat views. Nested/repeated structures are **not** flattened away:
`payload` is a JSON column and `media` is a JSON column, so the CSV round-trips
without losing structure. JSONL remains canonical.

## data/attention.csv

One row per submission that contained an attention check:

```text
submission_id, contributor_id, project_id, check_key, selected_value, correct, guess_probability, created_at
```

`correct` is the server-computed truth against its own bank; the question
text is never exported. The contributor-level guess-adjusted score and totals
appear in `contributors.csv` (`attention_score`, `attention_checks_total`,
`attention_correct_total`, `attention_last_at`), alongside the consent record
(`consent_version`, `consent_granted_at`, `consent_revoked_at`) and the
administrator-set `quality_score`.

## Integrity

- `manifest.json` hashes the canonical JSONL and media CSV (SHA-256).
- Media files are included from the private storage bucket at export time; a
  checkpoint only exists if every referenced object was downloadable.
- The checkpoint row in the database records `cutoff_server_timestamp`,
  `submission_count`, `media_count`, `schema_versions`, and the contributor
  readiness snapshot for provenance.

## FAIR data standards

Checkpoints carry the metadata needed to make the dataset findable, accessible,
interoperable, and reusable without extra tooling:

| FAIR principle    | Where it lives in the package                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Findable**      | `dataset/datacite.json` (DataCite 4.4 kernel metadata for DOI registration/repository ingestion), `dataset/README.md`, project identity in `manifest.json`                                          |
| **Accessible**    | self-contained ZIP with no external references; optional persistent identifier on the project (`dataset_identifier`) is carried into DataCite `identifier` and the README                           |
| **Interoperable** | JSONL/CSV/GeoJSON data, immutable schema history (`schema/`), `dataset/data-dictionary.json` with per-field `semantic_uri` mapping hooks, units, and option code lists                              |
| **Reusable**      | license and dataset contact travel with every checkpoint (`manifest.json`, DataCite, README); historical observations keep their schema version; attention/consent/readiness provenance is included |

Project administrators set **license**, **dataset contact email**, and an optional
**dataset identifier (DOI/URL)** when creating a project; they are embedded in
every export. Licenses are stored as SPDX identifiers where possible
(`CC0-1.0`, `CC-BY-4.0`, `CC-BY-SA-4.0`, `ODbL-1.0`, or a custom value).

Checkpoints remain immutable snapshots: the same data exported twice yields two
packages, each with its own DataCite metadata and cutoff timestamp.

---

See [`docs/dataset-standards.md`](dataset-standards.md) for the FAIR dataset
metadata carried in every checkpoint (`dataset/datacite.json`,
`dataset/data-dictionary.json`, `dataset/README.md`).
