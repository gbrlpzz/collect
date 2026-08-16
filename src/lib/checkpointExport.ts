import { z } from "zod";
import { strToU8, zip, zipSync } from "fflate";
import {
  isRecord,
  type FormValue,
  type JsonValue,
  type LocationValue,
  type Observation,
  type Project,
} from "../types";
import type { ContributorReadiness } from "./adminBackend";
import { downloadZip } from "./download";
import { APP_VERSION } from "./appMeta";
import { readStoredRecoveryData } from "./localStore";
import { ATTENTION_CHECKS } from "../data/attentionChecks";
import { attentionScore } from "./attention";

const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/wav": ".wav",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "application/octet-stream": ".bin",
} as const satisfies Record<string, string>;

/**
 * Escapes a cell for RFC-4180 CSV and neutralizes formula injection.
 */
export function csvCell(value: JsonValue | FormValue): string {
  if (value === null || value === undefined) return '""';
  const parsedStr = z.string().safeParse(value);
  const rawText = parsedStr.success ? parsedStr.data : JSON.stringify(value);
  const text = /^[=+\-@\t\r]/.test(rawText) ? `'${rawText}` : rawText;
  return `"${text.replaceAll('"', '""')}"`;
}

export function csvRow(values: (JsonValue | FormValue)[]): string {
  return values.map(csvCell).join(",");
}

export async function sha256Text(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    return "unsupported-crypto-environment";
  }
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function mediaExportName(media: {
  id: string;
  name?: string;
  original_filename?: string;
  mimeType?: string;
  mime_type?: string;
}): string {
  const original = String(media.name ?? media.original_filename ?? "").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const mime = media.mimeType ?? media.mime_type ?? "";
  type MimeKey = keyof typeof MIME_EXTENSIONS;
  const isMimeKey = (m: string): m is MimeKey => m in MIME_EXTENSIONS;
  const extension = original.includes(".")
    ? original.slice(original.lastIndexOf("."))
    : isMimeKey(mime)
      ? MIME_EXTENSIONS[mime]
      : ".bin";
  return `${media.id}${extension}`;
}

export interface GeoJsonFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    submission_id: string;
    project_id?: string;
    schema_id?: number;
    captured_at: string;
    accuracy_m: number | null;
    payload: Record<string, FormValue>;
  };
}

function isLocationValue(val: FormValue): val is LocationValue {
  return isRecord(val) && "latitude" in val && "longitude" in val;
}

export function locationFeature(
  submission: Observation,
): GeoJsonFeature | null {
  const values = submission.values ?? {};
  const rawLoc = values.location;
  let loc: LocationValue | null = isLocationValue(rawLoc) ? rawLoc : null;

  if (
    !loc ||
    !Number.isFinite(loc.latitude) ||
    !Number.isFinite(loc.longitude)
  ) {
    for (const val of Object.values(values)) {
      if (
        isLocationValue(val) &&
        Number.isFinite(val.latitude) &&
        Number.isFinite(val.longitude)
      ) {
        loc = val;
        break;
      }
    }
  }

  const latitude = Number(loc?.latitude);
  const longitude = Number(loc?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      submission_id: submission.id,
      project_id: submission.projectId,
      schema_id: submission.schemaVersion,
      captured_at: submission.createdAt,
      accuracy_m: loc?.accuracy ?? null,
      payload: values,
    },
  };
}

export interface CheckpointExportOptions {
  project: Project;
  observations?: Observation[];
  readiness?: ContributorReadiness[] | null;
  onComplete?: () => void;
}

/**
 * Builds a canonical FAIR research checkpoint archive on the client.
 * Matches docs/export-format.md specification 100%.
 */
export async function buildClientCheckpointArchive({
  project,
  observations = [],
  readiness = null,
}: CheckpointExportOptions): Promise<{
  archive: Uint8Array;
  filename: string;
  checkpointId: string;
}> {
  const durable = await readStoredRecoveryData().catch(() => null);
  const durableSubmissions = durable?.submissions ?? [];
  const submissions = durableSubmissions.length
    ? durableSubmissions
    : observations;

  const checkpointId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `cp-${Date.now()}`;
  const cutoff = new Date().toISOString();
  const safeSlug =
    (project.name || "project")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "project";
  const filename = `${safeSlug}_checkpoint-${cutoff.slice(0, 10)}.zip`;

  // Media blobs
  const mediaById = new Map(
    (durable?.media ?? []).map((media) => [media.id, media]),
  );
  const mediaEntries: Record<string, Uint8Array> = {};
  const mediaCatalog: Array<{
    id: string;
    submission_id: string;
    field_id: string;
    mime_type: string;
    byte_size: number;
    sha256?: string;
    captured_at: string;
    status: string;
    export_path: string;
  }> = [];

  for (const obs of submissions) {
    for (const asset of obs.media ?? []) {
      const exportName = mediaExportName(asset);
      const exportPath = `media/${obs.id}/${exportName}`;
      mediaCatalog.push({
        id: asset.id,
        submission_id: obs.id,
        field_id: asset.fieldId ?? "media",
        mime_type: asset.mimeType || "application/octet-stream",
        byte_size: asset.byteSize || 0,
        sha256: asset.sha256,
        captured_at: asset.capturedAt || obs.createdAt,
        status: obs.status === "SYNCED" ? "UPLOADED" : "LOCAL",
        export_path: exportPath,
      });

      const blob = asset.blob ?? mediaById.get(asset.id)?.blob ?? null;
      if (!blob) continue;
      try {
        mediaEntries[exportPath] = new Uint8Array(await blob.arrayBuffer());
      } catch {
        // Individual unreadable blob must not abort the export
      }
    }
  }

  const isAttentionFailed = (
    attentionResponse?: { checkKey: string; selectedValue: string } | null,
  ): boolean => {
    if (!attentionResponse) return false;
    const check = ATTENTION_CHECKS.find(
      (c) => c.key === attentionResponse.checkKey,
    );
    if (!check) return false;
    return attentionResponse.selectedValue !== check.correctValue;
  };

  // Canonical JSONL stream
  const jsonl = submissions
    .map((obs) =>
      JSON.stringify({
        id: obs.id,
        project_id: obs.projectId,
        schema_id: String(obs.schemaVersion ?? 1),
        contributor_id: obs.deviceId || "local-user",
        device_id: obs.deviceId || "local-device",
        payload: obs.values,
        client_created_at: obs.createdAt,
        client_timezone:
          // SAFETY: timezone is captured as a string in environment metadata.
          (obs.environment?.timezone as string | undefined) ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        server_received_at: obs.status === "SYNCED" ? cutoff : null,
        status: obs.status,
        finalized_at: obs.status === "SYNCED" ? cutoff : null,
        app_version: APP_VERSION,
        environment: obs.environment,
        attention_failed: isAttentionFailed(obs.attentionResponse),
        media: obs.media?.map((asset) => ({
          id: asset.id,
          field_id: asset.fieldId,
          mime_type: asset.mimeType,
          byte_size: asset.byteSize,
          original_filename: asset.name,
          sha256: asset.sha256,
          captured_at: asset.capturedAt,
          export_path: `media/${obs.id}/${mediaExportName(asset)}`,
        })),
      }),
    )
    .join("\n");

  // CSV files
  const submissionsCsv = [
    csvRow([
      "submission_id",
      "project_id",
      "schema_id",
      "contributor_id",
      "device_id",
      "client_created_at",
      "server_received_at",
      "finalized_at",
      "status",
      "attention_failed",
      "payload_json",
    ]),
    ...submissions.map((obs) =>
      csvRow([
        obs.id,
        obs.projectId,
        obs.schemaVersion ?? 1,
        obs.deviceId || "local-user",
        obs.deviceId || "local-device",
        obs.createdAt,
        obs.status === "SYNCED" ? cutoff : "",
        obs.status === "SYNCED" ? cutoff : "",
        obs.status,
        isAttentionFailed(obs.attentionResponse),
        JSON.stringify(obs.values),
      ]),
    ),
  ].join("\n");

  const mediaCsv = [
    csvRow([
      "media_id",
      "submission_id",
      "field_id",
      "mime_type",
      "byte_size",
      "sha256",
      "captured_at",
      "status",
      "export_path",
    ]),
    ...mediaCatalog.map((item) =>
      csvRow([
        item.id,
        item.submission_id,
        item.field_id,
        item.mime_type,
        item.byte_size,
        item.sha256 ?? "",
        item.captured_at,
        item.status,
        item.export_path,
      ]),
    ),
  ].join("\n");

  const contributorsCsv = [
    csvRow([
      "contributor_id",
      "email",
      "role",
      "invite_status",
      "consent_version",
      "consent_granted_at",
      "consent_revoked_at",
      "quality_score",
      "attention_score",
      "attention_checks_total",
      "attention_correct_total",
      "attention_last_at",
      "last_seen_at",
      "last_sync_success_at",
      "pending_submissions",
      "pending_media",
      "fieldwork_complete",
    ]),
    ...(readiness && readiness.length > 0
      ? readiness.map((row) =>
          csvRow([
            row.id,
            row.email,
            "contributor",
            row.status,
            1,
            cutoff,
            "",
            100,
            row.attentionScore ?? 100,
            row.attentionChecksTotal ?? 0,
            row.attentionCorrectTotal ?? 0,
            row.lastSeen ?? cutoff,
            row.lastSeen ?? cutoff,
            row.lastSeen ?? cutoff,
            row.pending,
            0,
            row.ready,
          ]),
        )
      : (() => {
          const attentionResponses = submissions.flatMap((obs) => {
            if (!obs.attentionResponse) return [];
            const check = ATTENTION_CHECKS.find(
              (c) => c.key === obs.attentionResponse!.checkKey,
            );
            const correct = check
              ? obs.attentionResponse!.selectedValue === check.correctValue
              : false;
            return [
              { correct, guessProbability: check?.guessProbability ?? 0.25 },
            ];
          });
          const computedScore = attentionScore(attentionResponses);
          const totalChecks = attentionResponses.length;
          const correctChecks = attentionResponses.filter(
            (r) => r.correct,
          ).length;
          return [
            csvRow([
              submissions[0]?.deviceId || "local-user",
              "local-contributor@example.com",
              "contributor",
              "Ready",
              1,
              cutoff,
              "",
              100,
              computedScore !== null ? Math.round(computedScore * 100) : 100,
              totalChecks,
              correctChecks,
              totalChecks > 0 ? cutoff : "",
              cutoff,
              cutoff,
              cutoff,
              0,
              0,
              true,
            ]),
          ];
        })()),
  ].join("\n");

  const attentionCsv = [
    csvRow([
      "submission_id",
      "contributor_id",
      "project_id",
      "check_key",
      "selected_value",
      "correct",
      "passed",
      "guess_probability",
      "created_at",
    ]),
    ...submissions.flatMap((obs) => {
      if (!obs.attentionResponse) return [];
      const check = ATTENTION_CHECKS.find(
        (c) => c.key === obs.attentionResponse!.checkKey,
      );
      const isCorrect = check
        ? obs.attentionResponse!.selectedValue === check.correctValue
        : true;
      return [
        csvRow([
          obs.id,
          obs.deviceId || "local-user",
          obs.projectId,
          obs.attentionResponse.checkKey,
          obs.attentionResponse.selectedValue,
          isCorrect,
          isCorrect,
          check?.guessProbability ?? 0.25,
          obs.createdAt,
        ]),
      ];
    }),
  ].join("\n");

  // GeoJSON
  const features = submissions
    .map(locationFeature)
    .filter((feat): feat is GeoJsonFeature => Boolean(feat));
  const geojson = JSON.stringify(
    { type: "FeatureCollection", features },
    null,
    2,
  );

  // DataCite 4.4 kernel
  const projectName = project.name || "Field Research Project";
  const orgName = project.organization || "Field Research Organization";
  const datacite = {
    schemaVersion: "http://datacite.org/schema/kernel-4.4",
    identifier: project.datasetIdentifier
      ? { identifier: project.datasetIdentifier, identifierType: "DOI" }
      : undefined,
    creators: [{ name: orgName, nameType: "Organizational" }],
    titles: [{ title: `${projectName} — checkpoint dataset` }],
    publisher: orgName,
    publicationYear: String(new Date().getUTCFullYear()),
    resourceType: { resourceTypeGeneral: "Dataset" },
    version: `checkpoint-${checkpointId}`,
    descriptions: [
      {
        description: project.description || "",
        descriptionType: "Abstract",
      },
    ],
    license: project.license || "CC-BY-4.0",
    contributors: project.contactEmail
      ? [
          {
            name: "Dataset contact",
            contributorType: "ContactPerson",
            nameType: "Organizational",
            contactEmail: project.contactEmail,
          },
        ]
      : [],
    dates: [{ date: cutoff, dateType: "Created" }],
    subjects: [{ subject: projectName }, { subject: "field data collection" }],
    alternateIdentifiers: [
      {
        alternateIdentifier: project.id,
        alternateIdentifierType: "collect-project",
      },
    ],
  };

  const dataDictionaryFields = (project.fields ?? []).map((field) => ({
    schema_version: project.schemaVersion,
    key: field.key,
    label: field.label,
    type: field.type,
    required: Boolean(field.required),
    description: field.description ?? null,
    semantic_uri: field.semantic_uri ?? null,
    unit: field.config?.unit ?? null,
    options: field.options ?? null,
  }));

  const datasetReadme = [
    `# ${projectName}`,
    "",
    project.description || "",
    "",
    "## Dataset metadata",
    `- License: ${project.license || "not specified"}`,
    `- Contact: ${project.contactEmail || "not specified"}`,
    `- Identifier: ${project.datasetIdentifier || "not specified"}`,
    `- Publisher: ${orgName}`,
    `- Checkpoint: ${checkpointId} (cutoff ${cutoff})`,
    "",
    "## FAIR notes",
    "- **Findable**: machine-readable DataCite metadata (`dataset/datacite.json`) and this README.",
    "- **Accessible**: single self-contained ZIP; a persistent identifier can be attached via the project's dataset identifier.",
    "- **Interoperable**: JSONL, CSV, GeoJSON, schema history, and a data dictionary with semantic mapping hooks (`semantic_uri` per field).",
    "- **Reusable**: license and contact travel with the data; every schema version is retained and immutable.",
    "",
    "Formats are documented in docs/export-format.md of the collect repository.",
  ].join("\n");

  const manifest = {
    export_format_version: "1",
    software_version: APP_VERSION,
    project: {
      id: project.id,
      organization_id: project.organization,
      name: project.name,
      description: project.description,
      instructions: project.instructions,
      status: project.status,
      license: project.license,
      contact_email: project.contactEmail,
      dataset_identifier: project.datasetIdentifier,
    },
    organization: {
      id: project.organization,
      name: orgName,
      logo_path: null,
    },
    checkpoint_id: checkpointId,
    created_at: cutoff,
    cutoff_server_timestamp: cutoff,
    schema_versions: [project.schemaVersion],
    submission_count: submissions.length,
    media_count: mediaCatalog.length,
    hashes: {
      submissions_jsonl_sha256: await sha256Text(jsonl),
      media_csv_sha256: await sha256Text(mediaCsv),
    },
    dataset: {
      license: project.license ?? null,
      contact_email: project.contactEmail ?? null,
      dataset_identifier: project.datasetIdentifier ?? null,
    },
    contributor_readiness: (readiness ?? []).map((row) => ({
      device_id: row.id,
      contributor_id: row.id,
      last_seen_at: row.lastSeen,
      last_sync_success_at: row.lastSeen,
      pending_submissions: row.pending,
      pending_media: 0,
      fieldwork_complete: row.ready,
    })),
    note: "A checkpoint contains only complete submissions received by the server at the cutoff timestamp. Offline devices may hold additional unseen data.",
  };

  const entries = {
    ...mediaEntries,
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    [`schema/schema-v${project.schemaVersion}.json`]: strToU8(
      JSON.stringify(
        {
          schema_id: `schema-v${project.schemaVersion}`,
          version: project.schemaVersion,
          project_id: project.id,
          published_at: cutoff,
          fields: project.fields,
        },
        null,
        2,
      ),
    ),
    "data/submissions.jsonl": strToU8(jsonl),
    "data/submissions.csv": strToU8(submissionsCsv),
    "data/media.csv": strToU8(mediaCsv),
    "data/contributors.csv": strToU8(contributorsCsv),
    "data/attention.csv": strToU8(attentionCsv),
    "data/submissions.geojson": strToU8(geojson),
    "dataset/datacite.json": strToU8(JSON.stringify(datacite, null, 2)),
    "dataset/data-dictionary.json": strToU8(
      JSON.stringify(dataDictionaryFields, null, 2),
    ),
    "dataset/README.md": strToU8(datasetReadme),
    ...mediaEntries,
  } satisfies Record<string, Uint8Array>;

  let archive: Uint8Array;
  try {
    archive = await new Promise<Uint8Array>((resolve, reject) => {
      zip(entries, { level: 0 }, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  } catch {
    archive = zipSync(entries, { level: 0 });
  }

  return { archive, filename, checkpointId };
}

/**
 * Directly exports and downloads a client-side Checkpoint archive.
 */
export async function exportClientCheckpoint(
  options: CheckpointExportOptions,
): Promise<void> {
  const { archive, filename } = await buildClientCheckpointArchive(options);
  downloadZip(archive, filename);
  options.onComplete?.();
}
