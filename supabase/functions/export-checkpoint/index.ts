import { strToU8, zipSync } from "npm:fflate@0.8.3";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.2";
import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { csvRow } from "../_shared/csv.ts";
import { sha256 } from "../_shared/hash.ts";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

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

interface MediaItem {
  id: string;
  submission_id: string;
  field_id: string;
  object_path?: string | null;
  mime_type: string;
  byte_size: number;
  original_filename?: string;
  sha256?: string | null;
  captured_at: string;
  status: string;
}

function mediaExportName(media: MediaItem): string {
  const original = String(media.original_filename ?? "").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const mime = String(media.mime_type ?? "");
  type MimeKey = keyof typeof MIME_EXTENSIONS;
  const isMimeKey = (m: string): m is MimeKey => m in MIME_EXTENSIONS;
  const extension = original.includes(".")
    ? original.slice(original.lastIndexOf("."))
    : (isMimeKey(mime) ? MIME_EXTENSIONS[mime] : "");
  return `${media.id}${extension}`;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

interface GeoJsonExportFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    submission_id: string;
    project_id: string;
    contributor_id: string;
    schema_id: string;
    captured_at: string;
    accuracy_m: number | null;
    payload: Record<string, JsonValue>;
  };
}

interface ExportSubmissionRow {
  id: string;
  project_id: string;
  schema_id: string;
  contributor_id: string;
  device_id: string;
  payload: Record<string, JsonValue>;
  environment?: Record<string, JsonValue>;
  client_created_at: string;
  client_timezone: string;
  server_received_at: string;
  status: string;
  finalized_at: string;
  app_version: string;
  device_model?: string;
  device_os?: string;
  browser?: string;
  attention_failed?: boolean;
  collected_after_remote_close?: boolean;
  corrects_submission_id?: string | null;
}

function isLocationCoords(val: JsonValue | undefined): val is LocationCoords {
  if (!val || Array.isArray(val) || Object(val) !== val) return false;
  if (!("latitude" in val) || !("longitude" in val)) return false;
  const lat = Number(val.latitude);
  const lng = Number(val.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function locationFeature(
  submission: ExportSubmissionRow,
): GeoJsonExportFeature | null {
  const payload = submission.payload;
  if (!payload || Array.isArray(payload) || Object(payload) !== payload) {
    return null;
  }

  let loc: LocationCoords | null = isLocationCoords(payload.location)
    ? payload.location
    : null;
  if (!loc) {
    for (const val of Object.values(payload)) {
      if (isLocationCoords(val)) {
        loc = val;
        break;
      }
    }
  }

  if (!loc) return null;
  const latitude = Number(loc.latitude);
  const longitude = Number(loc.longitude);

  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      submission_id: submission.id,
      project_id: submission.project_id,
      contributor_id: submission.contributor_id,
      schema_id: submission.schema_id,
      captured_at: submission.client_created_at,
      accuracy_m: loc.accuracy ?? null,
      payload,
    },
  };
}

interface SchemaRow {
  id: string;
  version: number;
  schema_json: {
    fields?: Array<{
      key?: string;
      label?: string;
      type?: string;
      required?: boolean;
      description?: string | null;
      semantic_uri?: string | null;
      options?: Array<{ id: string; value: string; label: string }> | null;
      config?: Record<string, string | number | boolean>;
    }>;
  };
  published_at: string;
}

async function buildExport(
  service: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<Response> {
  const access = await projectAccess(service, projectId, userId);
  if (!access?.admin) {
    return json({ error: "Administrator access is required" }, { status: 403 });
  }
  const cutoff = new Date().toISOString();

  const { data: project } = await service
    .from("projects")
    .select(
      "id,organization_id,name,description,instructions,status,license,contact_email,dataset_identifier",
    )
    .eq("id", projectId)
    .maybeSingle();
  const { data: organization } = await service
    .from("organizations")
    .select("id,name,logo_path")
    .eq("id", access.project.organization_id)
    .maybeSingle();
  const { data: submissions, error: submissionError } = await service
    .from("submissions")
    .select(
      "id,project_id,schema_id,contributor_id,device_id,payload,environment,client_created_at,client_timezone,server_received_at,status,finalized_at,app_version,device_model,device_os,browser,attention_failed,collected_after_remote_close,corrects_submission_id",
    )
    .eq("project_id", projectId)
    .eq("status", "COMPLETE")
    .lte("server_received_at", cutoff)
    .order("server_received_at", { ascending: true });
  if (submissionError) {
    return json({ error: "Submissions could not be read" }, { status: 500 });
  }
  // SAFETY: Supabase submissions query returns records matching ExportSubmissionRow.
  const submissionRows = (submissions ?? []) as ExportSubmissionRow[];
  const submissionIds = submissionRows.map((submission) =>
    String(submission.id)
  );
  const { data: mediaRows, error: mediaError } = submissionIds.length
    ? await service
      .from("submission_media")
      .select(
        "id,submission_id,field_id,object_path,mime_type,byte_size,original_filename,sha256,captured_at,status",
      )
      .in("submission_id", submissionIds)
      .eq("status", "UPLOADED")
      .not("object_path", "is", null)
      .order("created_at", {
        ascending: true,
      })
    : { data: [], error: null };
  if (mediaError) {
    return json({ error: "Media metadata could not be read" }, { status: 500 });
  }
  // SAFETY: Supabase submission_media query returns records matching MediaItem.
  const media = (mediaRows ?? []) as MediaItem[];
  const schemaIds = [
    ...new Set(
      submissionRows.map((submission) => String(submission.schema_id)),
    ),
  ];
  let schemaQuery = service
    .from("project_schemas")
    .select("id,version,schema_json,published_at")
    .eq("project_id", projectId)
    .not("published_at", "is", null)
    .order("version", { ascending: true });
  if (schemaIds.length) schemaQuery = schemaQuery.in("id", schemaIds);
  const { data: schemas, error: schemaError } = await schemaQuery;
  if (schemaError) {
    return json({ error: "Schema history could not be read" }, { status: 500 });
  }
  // SAFETY: Supabase project_schemas query returns SchemaRow[] records.
  const schemaRows = (schemas ?? []) as SchemaRow[];

  const { data: readiness } = await service
    .from("device_project_status")
    .select(
      "device_id,contributor_id,last_seen_at,last_sync_success_at,pending_submissions,pending_media,app_version,schema_versions_cached,fieldwork_complete",
    )
    .eq("project_id", projectId);
  const { data: members } = await service
    .from("project_members")
    .select("user_id,role")
    .eq("project_id", projectId)
    .order("assigned_at", { ascending: true });
  const memberIds = (members ?? []).map((member) => member.user_id);
  const { data: attentionRows } = submissionIds.length
    ? await service
      .from("attention_responses")
      .select(
        "submission_id,contributor_id,project_id,check_key,selected_value,correct,passed,guess_probability,created_at",
      )
      .in("submission_id", submissionIds)
      .order("created_at", {
        ascending: true,
      })
    : { data: [] };
  const { data: profiles } = memberIds.length
    ? await service
      .from("contributor_profiles")
      .select(
        "user_id,consent_version,consent_granted_at,consent_revoked_at,quality_score,attention_score,attention_checks_total,attention_correct_total,attention_last_at",
      )
      .in("user_id", memberIds)
    : { data: [] };
  const { data: invites } = await service
    .from("project_invites")
    .select("email,invited_user_id,status")
    .eq("project_id", projectId);

  const contributorReadiness = readiness ?? [];
  const contributorRows = (members ?? []).map((member) => {
    const invite = (invites ?? []).find(
      (candidate) => candidate.invited_user_id === member.user_id,
    );
    const status = contributorReadiness.find(
      (candidate) => candidate.contributor_id === member.user_id,
    );
    const profile = (profiles ?? []).find(
      (candidate) => candidate.user_id === member.user_id,
    );
    return {
      contributor_id: member.user_id,
      email: invite?.email ?? "",
      role: member.role,
      invite_status: invite?.status ?? "",
      consent_version: profile?.consent_version ?? null,
      consent_granted_at: profile?.consent_granted_at ?? null,
      consent_revoked_at: profile?.consent_revoked_at ?? null,
      quality_score: profile?.quality_score ?? null,
      attention_score: profile?.attention_score ?? null,
      attention_checks_total: profile?.attention_checks_total ?? null,
      attention_correct_total: profile?.attention_correct_total ?? null,
      attention_last_at: profile?.attention_last_at ?? null,
      last_seen_at: status?.last_seen_at ?? null,
      last_sync_success_at: status?.last_sync_success_at ?? null,
      pending_submissions: status?.pending_submissions ?? null,
      pending_media: status?.pending_media ?? null,
      fieldwork_complete: status?.fieldwork_complete ?? false,
    };
  });
  const checkpointId = crypto.randomUUID();
  const schemaVersions = schemaRows.map((schema) => schema.version);

  const jsonl = submissionRows
    .map((submission) =>
      JSON.stringify({
        ...submission,
        media: media
          .filter((item) => item.submission_id === submission.id)
          .map((item) => ({
            ...item,
            export_path: `media/${submission.id}/${mediaExportName(item)}`,
          })),
      })
    )
    .join("\n");
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
    ...submissionRows.map((submission) =>
      csvRow([
        submission.id,
        submission.project_id,
        submission.schema_id,
        submission.contributor_id,
        submission.device_id,
        submission.client_created_at,
        submission.server_received_at,
        submission.finalized_at,
        submission.status,
        Boolean(submission.attention_failed),
        submission.payload,
      ])
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
    ...media.map((item) =>
      csvRow([
        item.id,
        item.submission_id,
        item.field_id,
        item.mime_type,
        item.byte_size,
        item.sha256 ?? "",
        item.captured_at,
        item.status,
        `media/${item.submission_id}/${mediaExportName(item)}`,
      ])
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
    ...contributorRows.map((row) =>
      csvRow([
        row.contributor_id,
        row.email,
        row.role,
        row.invite_status,
        row.consent_version,
        row.consent_granted_at,
        row.consent_revoked_at,
        row.quality_score,
        row.attention_score,
        row.attention_checks_total,
        row.attention_correct_total,
        row.attention_last_at,
        row.last_seen_at,
        row.last_sync_success_at,
        row.pending_submissions,
        row.pending_media,
        row.fieldwork_complete,
      ])
    ),
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
    ...(attentionRows ?? []).map((row) =>
      csvRow([
        row.submission_id,
        row.contributor_id,
        row.project_id,
        row.check_key,
        row.selected_value,
        row.correct,
        row.passed,
        row.guess_probability,
        row.created_at,
      ])
    ),
  ].join("\n");

  const features = submissionRows
    .map(locationFeature)
    .filter((feature): feature is GeoJsonExportFeature => Boolean(feature));
  const geojson = JSON.stringify({ type: "FeatureCollection", features });

  const projectName = String(project?.name ?? "Untitled field project");
  const organizationName = String(organization?.name ?? "Field organization");
  const nowIso = new Date().toISOString();
  const creators = [{ name: organizationName, nameType: "Organizational" }];
  const dataDictionaryFields = schemaRows
    .map((schema) => {
      const fields = schema.schema_json?.fields ?? [];
      return fields.map((field) => ({
        schema_version: schema.version,
        key: field.key ?? null,
        label: field.label ?? null,
        type: field.type ?? null,
        required: Boolean(field.required),
        description: field.description ?? null,
        semantic_uri: field.semantic_uri ?? null,
        unit: field.config?.unit ?? null,
        options: field.options ?? null,
      }));
    })
    .flat();

  const datasetReadme = [
    `# ${projectName}`,
    "",
    project?.description || "",
    "",
    "## Fieldwork instructions",
    project?.instructions || "",
    "",
    "## Dataset metadata",
    `- License: ${project?.license || "not specified"}`,
    `- Contact: ${project?.contact_email || "not specified"}`,
    `- Identifier: ${project?.dataset_identifier || "not specified"}`,
    `- Publisher: ${organizationName}`,
    `- Checkpoint: ${checkpointId} (cutoff ${cutoff})`,
    `- Generated by: collect ${submissionRows[0]?.app_version ?? "0.1.2"}`,
    "",
    "## Files in this checkpoint",
    "- `manifest.json`: checkpoint metadata, contributor counts, and dataset SHA-256 hashes.",
    "- `data/submissions.jsonl`: canonical stream of complete, finalized observations.",
    "- `data/submissions.csv`: flat tabular export of all submissions.",
    "- `data/media.csv`: catalog of all media objects with SHA-256 integrity hashes.",
    "- `data/contributors.csv`: contributor participation, consent status, and attention scores.",
    "- `data/attention.csv`: attention-check answers (separated from research data).",
    "- `data/submissions.geojson`: RFC 7946 GeoJSON FeatureCollection of spatial observations.",
    "- `dataset/datacite.json`: DataCite 4.4 kernel for DOI registration and repository deposit.",
    "- `dataset/data-dictionary.json`: field types, labels, units, and semantic mapping hooks.",
    "- `schema/`: immutable field definitions for each schema version in the checkpoint.",
    "- `media/`: unmodified media originals, preserved byte-for-byte.",
    "",
    "## FAIR notes",
    "- **Findable**: machine-readable DataCite metadata (`dataset/datacite.json`) and this README.",
    "- **Accessible**: single self-contained ZIP; a persistent identifier can be attached via the project's dataset identifier.",
    "- **Interoperable**: JSONL, CSV, GeoJSON, schema history, and a data dictionary with semantic mapping hooks (`semantic_uri` per field).",
    "- **Reusable**: license and contact travel with the data; every schema version is retained and immutable.",
    "",
    "Formats are documented in docs/export-format.md of the collect repository.",
  ].join("\n");

  const datacite = {
    schemaVersion: "http://datacite.org/schema/kernel-4.4",
    identifier: project?.dataset_identifier
      ? { identifier: project.dataset_identifier, identifierType: "DOI" }
      : undefined,
    creators,
    titles: [{ title: `${projectName} — checkpoint dataset` }],
    publisher: organizationName,
    publicationYear: String(new Date().getUTCFullYear()),
    resourceType: { resourceTypeGeneral: "Dataset" },
    version: `checkpoint-${checkpointId}`,
    descriptions: [
      {
        description: project?.description || "",
        descriptionType: "Abstract",
      },
    ],
    license: project?.license || "CC-BY-4.0",
    contributors: project?.contact_email
      ? [
        {
          name: "Dataset contact",
          contributorType: "ContactPerson",
          nameType: "Organizational",
          contactEmail: project.contact_email,
        },
      ]
      : [],
    dates: [{ date: nowIso, dateType: "Created" }],
    subjects: [{ subject: projectName }, { subject: "field data collection" }],
    alternateIdentifiers: [
      {
        alternateIdentifier: project?.id ?? projectId,
        alternateIdentifierType: "collect-project",
      },
    ],
  };

  const manifest = {
    export_format_version: "1",
    software_version: submissionRows[0]?.app_version ?? "0.1.2",
    project: {
      id: project?.id ?? projectId,
      organization_id: project?.organization_id ??
        access.project.organization_id,
      name: project?.name ?? null,
      description: project?.description ?? null,
      instructions: project?.instructions ?? null,
      status: project?.status ?? null,
      license: project?.license ?? null,
      contact_email: project?.contact_email ?? null,
      dataset_identifier: project?.dataset_identifier ?? null,
    },
    organization: {
      id: organization?.id ?? access.project.organization_id,
      name: organization?.name ?? organizationName,
      logo_path: organization?.logo_path ?? null,
    },
    checkpoint_id: checkpointId,
    created_at: nowIso,
    cutoff_server_timestamp: cutoff,
    schema_versions: schemaVersions,
    submission_count: submissionRows.length,
    media_count: media.length,
    hashes: {
      submissions_jsonl_sha256: await sha256(jsonl),
      media_csv_sha256: await sha256(mediaCsv),
    },
    dataset: {
      license: project?.license ?? null,
      contact_email: project?.contact_email ?? null,
      dataset_identifier: project?.dataset_identifier ?? null,
    },
    contributor_readiness: contributorReadiness.map((row) => ({
      device_id: row.device_id,
      contributor_id: row.contributor_id,
      last_seen_at: row.last_seen_at,
      last_sync_success_at: row.last_sync_success_at,
      pending_submissions: row.pending_submissions,
      pending_media: row.pending_media,
      fieldwork_complete: row.fieldwork_complete,
    })),
    note:
      "A checkpoint contains only complete submissions received by the server at the cutoff timestamp. Offline devices may hold additional unseen data.",
  };

  const entries = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
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
  } satisfies Record<string, Uint8Array>;

  const additionalEntries: Record<string, Uint8Array> = {};
  for (const schema of schemaRows) {
    additionalEntries[`schema/schema-v${schema.version}.json`] = strToU8(
      JSON.stringify(schema.schema_json, null, 2),
    );
  }
  for (const item of media) {
    if (!item.object_path) continue;
    const { data: file, error: downloadError } = await service.storage
      .from("collect-media")
      .download(String(item.object_path));
    if (downloadError || !file) {
      return json(
        {
          error: "A media object could not be included in the checkpoint",
        },
        { status: 500 },
      );
    }
    additionalEntries[`media/${item.submission_id}/${mediaExportName(item)}`] =
      new Uint8Array(await file.arrayBuffer());
  }

  const archive = zipSync({ ...entries, ...additionalEntries }, { level: 0 });
  const objectPath = `projects/${projectId}/checkpoints/${checkpointId}.zip`;
  const { error: uploadError } = await service.storage
    .from("collect-exports")
    .upload(objectPath, new Blob([archive], { type: "application/zip" }), {
      contentType: "application/zip",
      upsert: true,
    });
  if (uploadError) {
    return json(
      { error: "Checkpoint package could not be stored" },
      {
        status: 500,
      },
    );
  }
  const { error: checkpointError } = await service.from("checkpoints").insert({
    id: checkpointId,
    project_id: projectId,
    created_by: userId,
    cutoff_server_timestamp: cutoff,
    submission_count: submissionRows.length,
    media_count: media.length,
    schema_versions: schemaVersions,
    contributor_readiness: contributorReadiness,
    export_object_path: objectPath,
  });
  if (checkpointError) {
    await service.storage
      .from("collect-exports")
      .remove([objectPath])
      .catch(() => undefined);
    return json({ error: "Checkpoint could not be created" }, { status: 500 });
  }
  await service.from("audit_events").insert({
    organization_id: access.project.organization_id,
    project_id: projectId,
    actor_id: userId,
    action: "checkpoint_created",
    metadata: {
      checkpoint_id: checkpointId,
      submission_count: submissionRows.length,
      media_count: media.length,
    },
  });

  const safeSlug = (project?.name ? String(project.name) : "project")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "project";
  const exportFilename = `${safeSlug}_checkpoint-${cutoff.slice(0, 10)}.zip`;

  const { data: signed } = await service.storage
    .from("collect-exports")
    .createSignedUrl(objectPath, 3600, {
      download: exportFilename,
    });
  return json({
    checkpoint_id: checkpointId,
    download_url: signed?.signedUrl ?? null,
    submission_count: submissionRows.length,
    media_count: media.length,
  });
}

const exportBodySchema = z.object({
  project_id: z.string().min(1),
});

serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: corsHeaders,
      },
    );
  }
  try {
    const { user, service } = await requireUser(request);
    const rawJson = await request.json().catch(() => ({}));
    const parsed = exportBodySchema.safeParse(rawJson);
    if (!parsed.success) {
      return json({ error: "Project is required" }, { status: 400 });
    }
    const projectId = parsed.data.project_id;
    return await buildExport(service, user.id, projectId);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
