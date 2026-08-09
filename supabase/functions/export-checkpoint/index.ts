import { strToU8, zipSync } from "npm:fflate@0.8.3";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { canonicalJson, sha256 } from "../_shared/hash.ts";

function csvCell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

function mediaExportName(media: Record<string, unknown>): string {
  const original = String(media.original_filename ?? "").replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = original.includes(".") ? original.slice(original.lastIndexOf(".")) : "";
  return `${media.id}${extension}`;
}

function locationFeature(submission: Record<string, unknown>): Record<string, unknown> | null {
  const payload = submission.payload as Record<string, unknown> | null;
  const location = payload?.location as Record<string, unknown> | null;
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      submission_id: submission.id,
      project_id: submission.project_id,
      contributor_id: submission.contributor_id,
      schema_id: submission.schema_id,
      captured_at: submission.client_created_at,
      accuracy_m: location?.accuracy ?? null,
      payload,
    },
  };
}

async function buildExport(service: SupabaseClient, userId: string, projectId: string): Promise<Response> {
  const access = await projectAccess(service, projectId, userId);
  if (!access?.admin) return json({ error: "Administrator access is required" }, { status: 403 });
  const cutoff = new Date().toISOString();

  const { data: project } = await service.from("projects").select("id,organization_id,name,description,instructions,status").eq("id", projectId).maybeSingle();
  const { data: organization } = await service.from("organizations").select("id,name,logo_path").eq("id", access.project.organization_id).maybeSingle();
  const { data: submissions, error: submissionError } = await service
    .from("submissions")
    .select("id,project_id,schema_id,contributor_id,device_id,payload,client_created_at,client_timezone,server_received_at,status,finalized_at,app_version,collected_after_remote_close,corrects_submission_id")
    .eq("project_id", projectId)
    .eq("status", "COMPLETE")
    .lte("server_received_at", cutoff)
    .order("server_received_at", { ascending: true });
  if (submissionError) return json({ error: "Submissions could not be read" }, { status: 500 });
  const submissionRows = (submissions ?? []) as Record<string, unknown>[];
  const submissionIds = submissionRows.map((submission) => String(submission.id));
  const { data: mediaRows, error: mediaError } = submissionIds.length
    ? await service.from("submission_media").select("id,submission_id,field_id,object_path,mime_type,byte_size,original_filename,sha256,captured_at,status").in("submission_id", submissionIds).order("created_at", { ascending: true })
    : { data: [], error: null };
  if (mediaError) return json({ error: "Media metadata could not be read" }, { status: 500 });
  const media = (mediaRows ?? []) as Record<string, unknown>[];
  const schemaIds = [...new Set(submissionRows.map((submission) => String(submission.schema_id)))];
  const { data: schemas, error: schemaError } = schemaIds.length
    ? await service.from("project_schemas").select("id,version,schema_json,published_at").in("id", schemaIds).order("version", { ascending: true })
    : { data: [], error: null };
  if (schemaError) return json({ error: "Schema history could not be read" }, { status: 500 });
  const { data: readiness } = await service.from("device_project_status").select("device_id,contributor_id,last_seen_at,last_sync_success_at,pending_submissions,pending_media,app_version,schema_versions_cached,fieldwork_complete").eq("project_id", projectId);

  const contributorReadiness = readiness ?? [];
  const checkpointId = crypto.randomUUID();
  const schemaVersions = ((schemas ?? []) as Record<string, unknown>[]).map((schema) => schema.version);

  const jsonl = submissionRows.map((submission) => JSON.stringify({ ...submission, media: media.filter((item) => item.submission_id === submission.id).map((item) => ({ ...item, export_path: `media/${submission.id}/${mediaExportName(item)}` })) })).join("\n");
  const submissionsCsv = [
    csvRow(["submission_id", "project_id", "schema_id", "contributor_id", "device_id", "client_created_at", "server_received_at", "finalized_at", "status", "payload_json"]),
    ...submissionRows.map((submission) => csvRow([submission.id, submission.project_id, submission.schema_id, submission.contributor_id, submission.device_id, submission.client_created_at, submission.server_received_at, submission.finalized_at, submission.status, submission.payload])),
  ].join("\n");
  const mediaCsv = [
    csvRow(["media_id", "submission_id", "field_id", "mime_type", "byte_size", "sha256", "captured_at", "status", "export_path"]),
    ...media.map((item) => csvRow([item.id, item.submission_id, item.field_id, item.mime_type, item.byte_size, item.sha256, item.captured_at, item.status, `media/${item.submission_id}/${mediaExportName(item)}`])),
  ].join("\n");
  const features = submissionRows.map(locationFeature).filter((feature): feature is Record<string, unknown> => Boolean(feature));
  const geojson = JSON.stringify({ type: "FeatureCollection", features });
  const manifest = {
    export_format_version: "1",
    project,
    organization,
    checkpoint_id: checkpointId,
    created_at: new Date().toISOString(),
    cutoff_server_timestamp: cutoff,
    schema_versions: schemaVersions,
    submission_count: submissionRows.length,
    media_count: media.length,
    hashes: {
      submissions_jsonl_sha256: await sha256(jsonl),
      media_csv_sha256: await sha256(mediaCsv),
    },
    note: "A checkpoint contains only complete submissions received by the server at the cutoff timestamp. Offline devices may hold additional unseen data.",
  };

  const entries: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(manifest, null, 2)),
    "data/submissions.jsonl": strToU8(jsonl),
    "data/submissions.csv": strToU8(submissionsCsv),
    "data/media.csv": strToU8(mediaCsv),
    "data/submissions.geojson": strToU8(geojson),
  };
  for (const schema of (schemas ?? []) as Record<string, unknown>[]) entries[`schema/schema-v${schema.version}.json`] = strToU8(JSON.stringify(schema.schema_json, null, 2));
  for (const item of media) {
    const { data: file, error: downloadError } = await service.storage.from("collect-media").download(String(item.object_path));
    if (downloadError || !file) return json({ error: "A media object could not be included in the checkpoint" }, { status: 500 });
    entries[`media/${item.submission_id}/${mediaExportName(item)}`] = new Uint8Array(await file.arrayBuffer());
  }

  const archive = zipSync(entries, { level: 0 });
  const { error: checkpointError } = await service.from("checkpoints").insert({
    id: checkpointId,
    project_id: projectId,
    created_by: userId,
    cutoff_server_timestamp: cutoff,
    submission_count: submissionRows.length,
    media_count: media.length,
    schema_versions: schemaVersions,
    contributor_readiness: contributorReadiness,
  });
  if (checkpointError) return json({ error: "Checkpoint could not be created" }, { status: 500 });
  const objectPath = `projects/${projectId}/checkpoints/${checkpointId}.zip`;
  const { error: uploadError } = await service.storage.from("collect-exports").upload(objectPath, new Blob([archive], { type: "application/zip" }), { contentType: "application/zip", upsert: true });
  if (uploadError) return json({ error: "Checkpoint package could not be stored" }, { status: 500 });
  await service.from("checkpoints").update({ export_object_path: objectPath }).eq("id", checkpointId);
  await service.from("audit_events").insert({ organization_id: access.project.organization_id, project_id: projectId, actor_id: userId, action: "checkpoint_created", metadata: { checkpoint_id: checkpointId, submission_count: submissionRows.length, media_count: media.length } });
  const { data: signed } = await service.storage.from("collect-exports").createSignedUrl(objectPath, 3600);
  return json({ checkpoint_id: checkpointId, download_url: signed?.signedUrl ?? null, submission_count: submissionRows.length, media_count: media.length });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const projectId = String(body.project_id ?? "");
    if (!projectId) return json({ error: "Project is required" }, { status: 400 });
    return await buildExport(service, user.id, projectId);
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
