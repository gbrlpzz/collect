import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { canonicalJson, sha256 } from "../_shared/hash.ts";

interface MediaInput {
  media_id: string;
  field_id: string;
  mime_type: string;
  byte_size: number;
  original_filename?: string;
  captured_at?: string | null;
  sha256?: string | null;
}

function mediaPath(projectId: string, submissionId: string, mediaId: string): string {
  return `projects/${projectId}/submissions/${submissionId}/${mediaId}`;
}

function invalid(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

async function createSubmission(service: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const projectId = String(body.project_id ?? "");
  const schemaVersion = Number(body.schema_version);
  const payload = body.payload;
  const deviceId = String(body.device_id ?? "");
  const media = Array.isArray(body.media) ? body.media as MediaInput[] : [];
  if (!submissionId || !projectId || !Number.isInteger(schemaVersion) || !deviceId || !payload || typeof payload !== "object") return invalid("Submission metadata is incomplete");
  if (media.length > 500) return invalid("A submission cannot contain more than 500 media objects");

  const access = await projectAccess(service, projectId, userId);
  if (!access) return invalid("Project assignment is not active", 403);

  const { data: schema, error: schemaError } = await service
    .from("project_schemas")
    .select("id,version")
    .eq("project_id", projectId)
    .eq("version", schemaVersion)
    .not("published_at", "is", null)
    .maybeSingle();
  if (schemaError || !schema) return invalid("Unknown schema version", 409);

  const canonicalPayloadHash = await sha256(canonicalJson(payload));
  const suppliedHash = typeof body.payload_hash === "string" ? body.payload_hash : null;
  if (suppliedHash && suppliedHash !== canonicalPayloadHash) return invalid("Payload checksum does not match", 409);

  const requestedMediaIds = media.map((item) => item.media_id);
  if (new Set(requestedMediaIds).size !== requestedMediaIds.length) return invalid("Media identifiers must be unique", 409);

  const { data: existing, error: existingError } = await service
    .from("submissions")
    .select("id,project_id,contributor_id,payload_hash,expected_media_count,status")
    .eq("id", submissionId)
    .maybeSingle();
  if (existingError) return invalid("Submission lookup failed", 500);
  if (existing) {
    const { data: existingMedia } = await service.from("submission_media").select("id").eq("submission_id", submissionId);
    const existingMediaIds = (existingMedia ?? []).map((item) => item.id).sort();
    const incomingMediaIds = [...requestedMediaIds].sort();
    const sameMedia = JSON.stringify(existingMediaIds) === JSON.stringify(incomingMediaIds);
    if (existing.project_id !== projectId || existing.contributor_id !== userId || existing.payload_hash !== canonicalPayloadHash || existing.expected_media_count !== media.length || !sameMedia) {
      return invalid("Submission ID conflict: the server already has different content for this identifier", 409);
    }
    return json({ accepted: true, idempotent: true });
  }

  const { data: device } = await service.from("devices").select("id,contributor_id").eq("id", deviceId).maybeSingle();
  if (device && device.contributor_id !== userId) return invalid("Device identifier belongs to another contributor", 409);
  const { error: deviceError } = await service.from("devices").upsert({ id: deviceId, contributor_id: userId, app_version: String(body.app_version ?? ""), last_seen_at: new Date().toISOString() }, { onConflict: "id" });
  if (deviceError) return invalid("Device status could not be recorded", 500);

  const collectedAfterRemoteClose = access.project.status !== "active";
  const { error: submissionError } = await service.from("submissions").insert({
    id: submissionId,
    project_id: projectId,
    schema_id: schema.id,
    contributor_id: userId,
    device_id: deviceId,
    payload,
    payload_hash: canonicalPayloadHash,
    client_created_at: String(body.client_created_at ?? new Date().toISOString()),
    client_timezone: String(body.client_timezone ?? ""),
    app_version: String(body.app_version ?? ""),
    expected_media_count: media.length,
    collected_after_remote_close: collectedAfterRemoteClose,
    corrects_submission_id: body.corrects_submission_id || null,
  });
  if (submissionError) return invalid("Submission metadata could not be stored", 500);

  if (media.length) {
    const rows = media.map((item) => ({
      id: item.media_id,
      submission_id: submissionId,
      field_id: item.field_id,
      object_path: mediaPath(projectId, submissionId, item.media_id),
      mime_type: item.mime_type,
      byte_size: item.byte_size,
      original_filename: item.original_filename ?? "",
      sha256: item.sha256 ?? null,
      captured_at: item.captured_at ?? null,
    }));
    const { error: mediaError } = await service.from("submission_media").insert(rows);
    if (mediaError) return invalid("Submission media metadata could not be stored", 500);
  }
  return json({ accepted: true, idempotent: false });
}

async function confirmMedia(service: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const mediaId = String(body.media_id ?? "");
  const objectPath = String(body.object_path ?? "");
  const { data: submission } = await service.from("submissions").select("id,project_id,contributor_id").eq("id", submissionId).maybeSingle();
  if (!submission || submission.contributor_id !== userId) return invalid("Submission is not available", 403);
  const access = await projectAccess(service, submission.project_id, userId);
  if (!access) return invalid("Project assignment is not active", 403);
  const expectedPath = mediaPath(submission.project_id, submissionId, mediaId);
  if (objectPath !== expectedPath) return invalid("Media object path is not valid", 409);
  const { data: media } = await service.from("submission_media").select("id,status,object_path").eq("id", mediaId).eq("submission_id", submissionId).maybeSingle();
  if (!media || media.object_path !== expectedPath) return invalid("Media metadata is not available", 409);
  if (media.status === "UPLOADED") return json({ confirmed: true, idempotent: true });

  const directory = expectedPath.split("/").slice(0, -1).join("/");
  const { data: objects, error: listError } = await service.storage.from("collect-media").list(directory, { search: mediaId, limit: 20 });
  if (listError || !(objects ?? []).some((object) => object.name === mediaId)) return json({ confirmed: false, waiting: true });
  const { error: updateError } = await service.from("submission_media").update({ status: "UPLOADED" }).eq("id", mediaId).eq("submission_id", submissionId);
  if (updateError) return invalid("Media acknowledgement could not be recorded", 500);
  return json({ confirmed: true, idempotent: false });
}

async function finalizeSubmission(service: SupabaseClient, userId: string, body: Record<string, unknown>): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const { data: submission } = await service.from("submissions").select("id,project_id,contributor_id,status,expected_media_count,finalized_at").eq("id", submissionId).maybeSingle();
  if (!submission || submission.contributor_id !== userId) return invalid("Submission is not available", 403);
  const access = await projectAccess(service, submission.project_id, userId);
  if (!access) return invalid("Project assignment is not active", 403);
  if (submission.status === "COMPLETE") return json({ submission_id: submissionId, status: "COMPLETE", finalized_at: submission.finalized_at });

  const { data: media, error: mediaError } = await service.from("submission_media").select("id,status").eq("submission_id", submissionId);
  if (mediaError) return invalid("Media status could not be read", 500);
  if ((media ?? []).length !== submission.expected_media_count || (media ?? []).some((item) => item.status !== "UPLOADED")) return invalid("Media is still uploading", 409);

  const finalizedAt = new Date().toISOString();
  const { error: updateError } = await service.from("submissions").update({ status: "COMPLETE", finalized_at: finalizedAt }).eq("id", submissionId).neq("status", "COMPLETE");
  if (updateError) return invalid("Submission could not be finalized", 500);
  return json({ submission_id: submissionId, status: "COMPLETE", finalized_at: finalizedAt });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "create_submission") return await createSubmission(service, user.id, body);
    if (action === "confirm_media") return await confirmMedia(service, user.id, body);
    if (action === "finalize_submission") return await finalizeSubmission(service, user.id, body);
    return invalid("Unknown synchronization operation");
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
