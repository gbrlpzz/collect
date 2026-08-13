import demoSchema from "../../docs/demo-dataset/schema-v1.json";
import submissionsRaw from "../../docs/demo-dataset/submissions.jsonl?raw";
import datasetReadmeRaw from "../../docs/demo-dataset/README.md?raw";

/**
 * The export-package browser is derived from the canonical demo dataset in
 * docs/demo-dataset (schema + JSONL + README are imported raw), following
 * the checkpoint format specified in docs/export-format.md. There is no
 * second copy of the data anywhere: update the demo dataset and this
 * browser updates with it.
 */

interface DemoRow {
  id: string;
  project_id: string;
  schema_id: string;
  contributor_id: string;
  device_id: string;
  payload: Record<string, unknown>;
  client_created_at: string;
  client_timezone: string;
  server_received_at: string;
  status: string;
  finalized_at: string;
  app_version: string;
  attention_failed?: boolean;
  media?: Array<{
    id: string;
    field_id: string;
    mime_type: string;
    byte_size: number;
    original_filename: string;
    captured_at: string;
    capture_source: string;
    status: string;
    export_path: string;
  }>;
}

interface DemoSchema {
  schema_id: string;
  version: number;
  project_id: string;
  published_at: string;
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    description?: string;
    required?: boolean;
    config?: Record<string, string | number | boolean>;
    options?: Array<{ id: string; value: string; label: string }>;
  }>;
}

const rows: DemoRow[] = submissionsRaw
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => JSON.parse(line) as DemoRow);

const schema = demoSchema as unknown as DemoSchema;

const iso = (value: string) => new Date(value).toISOString().slice(0, 10);
const bytes = (n: number) =>
  n >= 1024 * 1024
    ? (n / (1024 * 1024)).toFixed(1) + " MB"
    : n >= 1024
      ? (n / 1024).toFixed(1) + " KB"
      : n + " B";

function csv(header: string[], body: string[][]): string {
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return (
    [header, ...body].map((row) => row.map(escape).join(",")).join("\n") + "\n"
  );
}

const submissionsJsonl = submissionsRaw.trimEnd() + "\n";

const submissionsCsv = csv(
  [
    "id",
    "project_id",
    "schema_id",
    "contributor_id",
    "device_id",
    "payload",
    "client_created_at",
    "client_timezone",
    "server_received_at",
    "status",
    "finalized_at",
    "app_version",
    "attention_failed",
  ],
  rows.map((row) => [
    row.id,
    row.project_id,
    row.schema_id,
    row.contributor_id,
    row.device_id,
    JSON.stringify(row.payload),
    row.client_created_at,
    row.client_timezone,
    row.server_received_at,
    row.status,
    row.finalized_at,
    row.app_version,
    String(row.attention_failed ?? false),
  ]),
);

const mediaRows = rows.flatMap((row) =>
  (row.media ?? []).map((media) => ({ submission: row, media })),
);

const mediaCsv = csv(
  [
    "id",
    "submission_id",
    "field_id",
    "mime_type",
    "byte_size",
    "original_filename",
    "captured_at",
    "capture_source",
    "status",
    "export_path",
  ],
  mediaRows.map(({ submission, media }) => [
    media.id,
    submission.id,
    media.field_id,
    media.mime_type,
    String(media.byte_size),
    media.original_filename,
    media.captured_at,
    media.capture_source,
    media.status,
    media.export_path,
  ]),
);

const geojson =
  JSON.stringify(
    {
      type: "FeatureCollection",
      features: rows
        .filter((row) => {
          const location = row.payload.location as
            | { latitude?: number; longitude?: number }
            | undefined;
          return (
            location &&
            typeof location.latitude === "number" &&
            typeof location.longitude === "number"
          );
        })
        .map((row) => {
          const location = row.payload.location as {
            latitude: number;
            longitude: number;
            accuracy: number;
          };
          const { latitude, longitude } = location;
          const { payload, ...rest } = row;
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            properties: { ...rest, payload },
          };
        }),
    },
    null,
    2,
  ) + "\n";

const attentionCsv =
  csv(
    [
      "submission_id",
      "contributor_id",
      "project_id",
      "check_key",
      "selected_value",
      "correct",
      "guess_probability",
      "created_at",
    ],
    // The demo rows carry no attention responses (attention_failed is absent),
    // so the file is honest: header plus an explanatory comment row.
    [],
  ) + "# no attention-check responses in this demo checkpoint\n";

const contributorIds = [...new Set(rows.map((row) => row.contributor_id))];
const contributorsCsv = csv(
  [
    "contributor_id",
    "device_id",
    "submissions",
    "consent_version",
    "consent_granted_at",
    "attention_checks_total",
    "attention_correct_total",
    "attention_score",
  ],
  contributorIds.map((contributorId) => {
    const contributorRows = rows.filter(
      (row) => row.contributor_id === contributorId,
    );
    return [
      contributorId,
      contributorRows[0].device_id,
      String(contributorRows.length),
      "v1",
      "2026-08-01T08:10:00Z",
      "0",
      "0",
      "",
    ];
  }),
);

const manifest =
  JSON.stringify(
    {
      export_format_version: "1",
      software_version: rows[0]?.app_version ?? "0.1.2",
      project: {
        id: schema.project_id,
        name: "Vernacular buildings — Valpuesta",
        status: "active",
      },
      checkpoint_id: "99999999-0000-4000-8000-000000000001",
      created_at: "2026-08-04T12:00:00.000Z",
      cutoff_server_timestamp: "2026-08-04T12:00:00.000Z",
      schema_versions: [schema.version],
      submission_count: rows.length,
      media_count: mediaRows.length,
      hashes: {
        submissions_jsonl_sha256: "computed on load (SHA-256)",
        media_csv_sha256: "computed on load (SHA-256)",
      },
      dataset: {
        license: "CC-BY-4.0",
        contact_email: "dataset@demo-lab.org",
        dataset_identifier: "10.5281/zenodo.0000000",
      },
      contributor_readiness: contributorIds.map((contributorId) => {
        const contributorRows = rows.filter(
          (row) => row.contributor_id === contributorId,
        );
        return {
          device_id: contributorRows[0].device_id,
          contributor_id: contributorId,
          last_seen_at:
            contributorRows[contributorRows.length - 1].server_received_at,
          pending_submissions: 0,
          pending_media: 0,
          fieldwork_complete: true,
        };
      }),
      note: "A checkpoint contains only complete submissions received by the server at the cutoff timestamp. Offline devices may hold additional unseen data.",
    },
    null,
    2,
  ) + "\n";

const datacite =
  JSON.stringify(
    {
      schemaVersion: "http://datacite.org/schema/kernel-4.4",
      identifier: {
        identifier: "10.5281/zenodo.0000000",
        identifierType: "DOI",
      },
      creators: [
        { name: "Demo field organization", nameType: "Organizational" },
      ],
      titles: [
        { title: "Vernacular buildings — Valpuesta (checkpoint dataset)" },
      ],
      publisher: "Demo field organization",
      publicationYear: "2026",
      resourceType: { resourceTypeGeneral: "Dataset" },
      version: "checkpoint-99999999-0000-4000-8000-000000000001",
      descriptions: [
        {
          description: `Occupancy, condition, and features of vernacular buildings in the Valpuesta valley; ${rows.length} synthetic demo observations.`,
          descriptionType: "Abstract",
        },
      ],
      license: "CC-BY-4.0",
      contributors: [
        {
          name: "Dataset contact",
          contributorType: "ContactPerson",
          nameType: "Organizational",
          contactEmail: "dataset@demo-lab.org",
        },
      ],
      dates: [{ date: "2026-08-04T12:00:00.000Z", dateType: "Created" }],
      subjects: [
        { subject: "vernacular architecture" },
        { subject: "field data collection" },
      ],
      alternateIdentifiers: [
        {
          alternateIdentifier: schema.project_id,
          alternateIdentifierType: "collect-project",
        },
      ],
    },
    null,
    2,
  ) + "\n";

const dataDictionary =
  JSON.stringify(
    {
      schema_version: schema.version,
      fields: schema.fields
        .filter((field) => field.type !== "heading")
        .map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: Boolean(field.required),
          description: field.description ?? undefined,
          options: field.options?.map((option) => ({
            id: option.id,
            value: option.value,
            label: option.label,
          })),
          unit: field.key === "people_count" ? "people" : undefined,
          semantic_uri: null,
        })),
    },
    null,
    2,
  ) + "\n";

const schemaJson = JSON.stringify(schema, null, 2) + "\n";

const mediaFolderListing =
  "media/\n" +
  mediaRows
    .map(({ submission, media }) => {
      const dir = submission.id;
      const file = media.export_path.split("/").pop() ?? media.id;
      return (
        `├── ${dir}/\n` +
        `│   └── ${file}  ${bytes(media.byte_size)}  ${media.original_filename}`
      );
    })
    .join("\n") +
  "\n\nOriginal files, byte-for-byte. collect never recompresses or renames\n" +
  "beyond a sanitized extension derived from the original filename.\n";

const readme = datasetReadmeRaw.trimEnd() + "\n";

export interface PackageFile {
  path: string;
  content: string;
  note?: string;
}

/** Tree order for the browser (folders rendered from paths). */
export const PACKAGE_FILES: PackageFile[] = [
  { path: "manifest.json", content: manifest, note: "package identity" },
  { path: "schema/schema-v1.json", content: schemaJson },
  {
    path: "data/submissions.jsonl",
    content: submissionsJsonl,
    note: "canonical",
  },
  { path: "data/submissions.csv", content: submissionsCsv },
  { path: "data/submissions.geojson", content: geojson },
  { path: "data/attention.csv", content: attentionCsv },
  { path: "data/contributors.csv", content: contributorsCsv },
  { path: "data/media.csv", content: mediaCsv },
  { path: "dataset/datacite.json", content: datacite },
  { path: "dataset/data-dictionary.json", content: dataDictionary },
  { path: "dataset/README.md", content: readme },
  {
    path: "media/",
    content: mediaFolderListing,
    note: "originals, never recompressed",
  },
];
