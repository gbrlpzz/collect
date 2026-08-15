import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.2";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { canonicalJson, sha256 } from "../_shared/hash.ts";

interface MediaInput {
  media_id: string;
  field_id: string;
  mime_type: string;
  byte_size: number;
  original_filename?: string;
  captured_at?: string | null;
  capture_source?: string | null;
  sha256?: string | null;
}

type SchemaField = {
  key?: string;
  type?: string;
  label?: string;
  required?: boolean;
  config?: Record<string, unknown>;
  options?: Array<{ id?: string; value?: string }>;
  children?: SchemaField[];
};

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}

function optionIsKnown(field: SchemaField, value: unknown): boolean {
  const options = field.options ?? [];
  return (
    typeof value === "string" &&
    options.some((option) => option.id === value || option.value === value)
  );
}

function validateFields(
  fields: SchemaField[],
  payload: Record<string, unknown>,
  path = "",
): string | null {
  for (const field of fields) {
    if (!field.key || field.type === "heading") continue;
    const label = path ? `${path}.${field.key}` : field.key;
    const value = payload[field.key];
    if (field.required && isBlank(value)) return `${label} is required`;
    if (isBlank(value)) continue;

    const config = field.config ?? {};
    if (field.type === "short_text" || field.type === "long_text") {
      if (typeof value !== "string") return `${label} must be text`;
      if (
        config.minLength !== undefined &&
        value.length < Number(config.minLength)
      ) {
        return `${label} is too short`;
      }
      if (
        config.maxLength !== undefined &&
        value.length > Number(config.maxLength)
      ) {
        return `${label} is too long`;
      }
    } else if (field.type === "number") {
      const numberValue = value && typeof value === "object" && "value" in value
        ? (value as { value?: unknown }).value
        : value;
      if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
        return `${label} must be a finite number`;
      }
      if (config.integer === true && !Number.isInteger(numberValue)) {
        return `${label} must be an integer`;
      }
      if (config.min !== undefined && numberValue < Number(config.min)) {
        return `${label} is below the minimum`;
      }
      if (config.max !== undefined && numberValue > Number(config.max)) {
        return `${label} is above the maximum`;
      }
    } else if (field.type === "single_choice" || field.type === "tri_state") {
      // single_choice may carry an optional free-text "other" as { value, otherText }.
      const singleValue = value && typeof value === "object" && "value" in value
        ? (value as { value?: unknown }).value
        : value;
      if (field.type === "tri_state") {
        if (
          typeof singleValue !== "string" ||
          !["yes", "no", "unknown"].includes(singleValue)
        ) {
          return `${label} is not a valid tri-state value`;
        }
      } else {
        if (typeof singleValue !== "string") {
          return `${label} must be one choice`;
        }
        const hasOtherOption = (field.options ?? []).some(
          (option) => option.value === "other" || option.id?.endsWith("-other"),
        );
        const isPublishedOther = singleValue === "other" && hasOtherOption;
        if (!optionIsKnown(field, singleValue) && !isPublishedOther) {
          return `${label} is not a published option`;
        }
      }
    } else if (field.type === "multiple_choice") {
      if (
        !Array.isArray(value) ||
        value.some((item) => !optionIsKnown(field, item))
      ) {
        return `${label} contains an unpublished option`;
      }
    } else if (field.type === "date") {
      if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      ) {
        return `${label} must be an ISO date`;
      }
    } else if (field.type === "datetime") {
      if (
        typeof value !== "object" ||
        value === null ||
        typeof (value as { localDatetime?: unknown }).localDatetime !== "string"
      ) {
        return `${label} must include a local datetime`;
      }
    } else if (field.type === "location") {
      const location = value as Record<string, unknown>;
      if (
        typeof location.latitude !== "number" ||
        !Number.isFinite(location.latitude) ||
        location.latitude < -90 ||
        location.latitude > 90 ||
        typeof location.longitude !== "number" ||
        !Number.isFinite(location.longitude) ||
        location.longitude < -180 ||
        location.longitude > 180 ||
        typeof location.accuracy !== "number" ||
        !Number.isFinite(location.accuracy) ||
        location.accuracy < 0
      ) {
        return `${label} is not a valid location`;
      }
    } else if (field.type === "photo" || field.type === "audio") {
      if (!Array.isArray(value)) {
        return `${label} must contain media identifiers`;
      }
      if (
        config.minCount !== undefined &&
        value.length < Number(config.minCount)
      ) {
        return `${label} does not contain enough media`;
      }
      if (
        config.maxCount !== undefined &&
        value.length > Number(config.maxCount)
      ) {
        return `${label} contains too much media`;
      }
    } else if (field.type === "repeatable_group") {
      if (
        !Array.isArray(value) ||
        value.some(
          (row) => !row || typeof row !== "object" || Array.isArray(row),
        )
      ) {
        return `${label} must be an array of objects`;
      }
      for (
        const [index, row] of (
          value as Array<Record<string, unknown>>
        ).entries()
      ) {
        const error = validateFields(
          field.children ?? [],
          row,
          `${label}[${index}]`,
        );
        if (error) return error;
      }
    }
  }
  return null;
}

function mediaPath(
  projectId: string,
  submissionId: string,
  mediaId: string,
): string {
  return `projects/${projectId}/submissions/${submissionId}/${mediaId}`;
}

function invalid(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

function mediaRows(
  projectId: string,
  submissionId: string,
  media: MediaInput[],
): Array<Record<string, unknown>> {
  return media.map((item) => ({
    id: item.media_id,
    submission_id: submissionId,
    field_id: item.field_id,
    object_path: mediaPath(projectId, submissionId, item.media_id),
    mime_type: item.mime_type,
    byte_size: item.byte_size,
    original_filename: item.original_filename ?? "",
    sha256: item.sha256 ?? null,
    capture_source: item.capture_source ?? "picker",
    captured_at: item.captured_at ?? null,
  }));
}

/** Idempotent: recording the same attention response twice changes nothing. */
async function recordAttention(
  service: SupabaseClient,
  userId: string,
  projectId: string,
  submissionId: string,
  checkKey: string,
  selectedValue: string,
): Promise<void> {
  const { data: check } = await service
    .from("attention_checks")
    .select("correct_value,guess_probability")
    .eq("key", checkKey)
    .eq("active", true)
    .maybeSingle();
  if (!check) return;
  const correct = selectedValue === check.correct_value;
  const { error } = await service
    .from("attention_responses")
    .upsert(
      {
        submission_id: submissionId,
        contributor_id: userId,
        project_id: projectId,
        check_key: checkKey,
        selected_value: selectedValue,
        correct,
        guess_probability: check.guess_probability,
      },
      { onConflict: "submission_id", ignoreDuplicates: true },
    );
  if (error) return;
  // The per-submission flag and contributor score are advisory.
  try {
    await service
      .from("submissions")
      .update({ attention_failed: !correct })
      .eq("id", submissionId);
  } catch {
    // Advisory; never block ingestion on it.
  }
  try {
    await service.rpc("recompute_attention_score", { target_user: userId });
  } catch {
    // Advisory; never block ingestion on it.
  }
}

/**
 * A RECEIVED submission whose metadata matches the incoming request is either
 * a clean retry or the residue of a crash between the submission insert and
 * the attention/media inserts. Reconcile to the complete state instead of
 * failing: matching media rows are kept, missing rows are backfilled, and any
 * media id reused with different content is still a hard conflict.
 */
async function reconcileReceivedSubmission(
  service: SupabaseClient,
  userId: string,
  projectId: string,
  submissionId: string,
  media: MediaInput[],
  attentionCheckKey: string | null,
  attentionSelected: string | null,
): Promise<Response> {
  const { data: existingMedia, error: mediaError } = await service
    .from("submission_media")
    .select("id,byte_size,sha256")
    .eq("submission_id", submissionId);
  if (mediaError) return invalid("Submission media could not be read", 500);

  const priorById = new Map(
    (existingMedia ?? []).map((item) => [String(item.id), item]),
  );
  const incomingIds = new Set(media.map((item) => item.media_id));
  const sameContent = (prior: Record<string, unknown>, item: MediaInput) =>
    String(prior.byte_size ?? "") === String(item.byte_size ?? "") &&
    (prior.sha256 ?? null) === (item.sha256 ?? null);
  const conflicts =
    // A media id the server has but the retry no longer describes means the
    // client changed its media list for this submission id.
    (existingMedia ?? []).some((item) => !incomingIds.has(String(item.id))) ||
    // The same media id reused with different bytes/hash.
    media.some((item) => {
      const prior = priorById.get(item.media_id);
      return prior !== undefined && !sameContent(prior, item);
    });
  if (conflicts) {
    return invalid(
      "Submission ID conflict: the server already has different content for this identifier",
      409,
    );
  }

  const missing = media.filter((item) => !priorById.has(item.media_id));
  if (missing.length) {
    const { error: insertError } = await service
      .from("submission_media")
      .insert(mediaRows(projectId, submissionId, missing));
    if (insertError) {
      return invalid("Submission media metadata could not be stored", 500);
    }
  }

  if (attentionCheckKey && attentionSelected) {
    await recordAttention(
      service,
      userId,
      projectId,
      submissionId,
      attentionCheckKey,
      attentionSelected,
    );
  }
  return json({ accepted: true, idempotent: true });
}

async function createSubmission(
  service: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const projectId = String(body.project_id ?? "");
  const schemaVersion = Number(body.schema_version);
  const payload = body.payload;
  const environment = body.environment &&
      typeof body.environment === "object" &&
      !Array.isArray(body.environment)
    ? (body.environment as Record<string, unknown>)
    : null;
  if (environment && JSON.stringify(environment).length > 8192) {
    return invalid("Environment metadata is too large", 400);
  }
  const deviceId = String(body.device_id ?? "");
  const media = Array.isArray(body.media) ? (body.media as MediaInput[]) : [];
  if (
    !submissionId ||
    !projectId ||
    !Number.isInteger(schemaVersion) ||
    !deviceId ||
    !payload ||
    typeof payload !== "object"
  ) {
    return invalid("Submission metadata is incomplete");
  }
  if (media.length > 500) {
    return invalid("A submission cannot contain more than 500 media objects");
  }

  const access = await projectAccess(service, projectId, userId);
  if (!access) return invalid("Project assignment is not active", 403);

  // In-app collection consent is a prerequisite for every submission.
  const { data: profile } = await service
    .from("contributor_profiles")
    .select("consent_granted_at,consent_revoked_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.consent_granted_at || profile.consent_revoked_at) {
    return invalid(
      "Collection consent is required before submitting observations",
      403,
    );
  }

  const { data: schema, error: schemaError } = await service
    .from("project_schemas")
    .select("id,version,schema_json")
    .eq("project_id", projectId)
    .eq("version", schemaVersion)
    .not("published_at", "is", null)
    .maybeSingle();
  if (schemaError || !schema) return invalid("Unknown schema version", 409);

  const payloadError = validateFields(
    (schema.schema_json?.fields ?? []) as SchemaField[],
    payload as Record<string, unknown>,
  );
  if (payloadError) {
    return invalid(
      `Payload does not match the published schema: ${payloadError}`,
      422,
    );
  }

  // The automatic attention check is provenance, never research data. Reject
  // any client that smuggles the reserved key into the payload (defense in
  // depth on top of the client-side strip).
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "_attention" in payload
  ) {
    return invalid(
      "Attention metadata is not part of the research payload",
      422,
    );
  }

  const canonicalPayloadHash = await sha256(canonicalJson(payload));
  const suppliedHash = typeof body.payload_hash === "string"
    ? body.payload_hash
    : null;
  if (suppliedHash && suppliedHash !== canonicalPayloadHash) {
    return invalid("Payload checksum does not match", 409);
  }

  const requestedMediaIds = media.map((item) => item.media_id);
  if (new Set(requestedMediaIds).size !== requestedMediaIds.length) {
    return invalid("Media identifiers must be unique", 409);
  }

  const attention =
    body.attention_response && typeof body.attention_response === "object"
      ? (body.attention_response as {
        check_key?: unknown;
        selected_value?: unknown;
      })
      : null;
  const attentionCheckKey = attention && typeof attention.check_key === "string"
    ? attention.check_key
    : null;
  const attentionSelected =
    attention && typeof attention.selected_value === "string"
      ? attention.selected_value
      : null;

  const { data: existing, error: existingError } = await service
    .from("submissions")
    .select(
      "id,project_id,contributor_id,payload_hash,expected_media_count,status",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (existingError) return invalid("Submission lookup failed", 500);
  if (existing) {
    const sameCore = existing.project_id === projectId &&
      existing.contributor_id === userId &&
      existing.payload_hash === canonicalPayloadHash &&
      existing.expected_media_count === media.length;
    if (!sameCore) {
      return invalid(
        "Submission ID conflict: the server already has different content for this identifier",
        409,
      );
    }
    if (existing.status === "COMPLETE") {
      return json({ accepted: true, idempotent: true });
    }
    return await reconcileReceivedSubmission(
      service,
      userId,
      projectId,
      submissionId,
      media,
      attentionCheckKey,
      attentionSelected,
    );
  }

  const correctsSubmissionId = body.corrects_submission_id
    ? String(body.corrects_submission_id)
    : null;
  if (correctsSubmissionId) {
    const { data: corrected } = await service
      .from("submissions")
      .select("project_id,contributor_id")
      .eq("id", correctsSubmissionId)
      .maybeSingle();
    if (
      !corrected ||
      corrected.project_id !== projectId ||
      corrected.contributor_id !== userId
    ) {
      return invalid(
        "The corrected submission is not available to this contributor",
        409,
      );
    }
  }

  const { error: deviceInsertError } = await service.from("devices").insert({
    id: deviceId,
    contributor_id: userId,
    app_version: String(body.app_version ?? ""),
    last_seen_at: new Date().toISOString(),
  });
  if (
    deviceInsertError &&
    (deviceInsertError as { code?: string }).code !== "23505"
  ) {
    return invalid("Device status could not be recorded", 500);
  }
  const { data: device } = await service
    .from("devices")
    .select("contributor_id")
    .eq("id", deviceId)
    .maybeSingle();
  if (!device) return invalid("Device status could not be recorded", 500);
  if (device.contributor_id !== userId) {
    return invalid("Device identifier belongs to another contributor", 409);
  }

  const collectedAfterRemoteClose = access.project.status !== "active";
  const { error: submissionError } = await service.from("submissions").insert({
    id: submissionId,
    status: "RECEIVED",
    project_id: projectId,
    schema_id: schema.id,
    contributor_id: userId,
    device_id: deviceId,
    payload,
    environment: environment ?? {},
    payload_hash: canonicalPayloadHash,
    client_created_at: String(
      body.client_created_at ?? new Date().toISOString(),
    ),
    client_timezone: String(body.client_timezone ?? ""),
    app_version: String(body.app_version ?? ""),
    device_model: String(body.device_model ?? "").slice(0, 120),
    device_os: String(body.device_os ?? "").slice(0, 40),
    browser: String(body.browser ?? "").slice(0, 40),
    expected_media_count: media.length,
    collected_after_remote_close: collectedAfterRemoteClose,
    corrects_submission_id: correctsSubmissionId,
  });
  if (submissionError) {
    return invalid("Submission metadata could not be stored", 500);
  }

  if (attentionCheckKey && attentionSelected) {
    await recordAttention(
      service,
      userId,
      projectId,
      submissionId,
      attentionCheckKey,
      attentionSelected,
    );
  }

  if (media.length) {
    const { error: mediaError } = await service
      .from("submission_media")
      .insert(mediaRows(projectId, submissionId, media));
    if (mediaError) {
      await service
        .from("submissions")
        .delete()
        .eq("id", submissionId)
        .eq("status", "RECEIVED");
      return invalid("Submission media metadata could not be stored", 500);
    }
  }
  return json({ accepted: true, idempotent: false });
}

async function confirmMedia(
  service: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const mediaId = String(body.media_id ?? "");
  const objectPath = String(body.object_path ?? "");
  const { data: submission } = await service
    .from("submissions")
    .select("id,project_id,contributor_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission || submission.contributor_id !== userId) {
    return invalid("Submission is not available", 403);
  }
  const access = await projectAccess(service, submission.project_id, userId);
  if (!access) return invalid("Project assignment is not active", 403);
  const expectedPath = mediaPath(submission.project_id, submissionId, mediaId);
  if (objectPath !== expectedPath) {
    return invalid("Media object path is not valid", 409);
  }
  const { data: media } = await service
    .from("submission_media")
    .select("id,status,object_path")
    .eq("id", mediaId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (!media || media.object_path !== expectedPath) {
    return invalid("Media metadata is not available", 409);
  }
  if (media.status === "UPLOADED") {
    return json({ confirmed: true, idempotent: true });
  }

  const directory = expectedPath.split("/").slice(0, -1).join("/");
  const { data: objects, error: listError } = await service.storage
    .from("collect-media")
    .list(directory, { search: mediaId, limit: 20 });
  const stored = (objects ?? []).find((object) => object.name === mediaId);
  if (listError || !stored) return json({ confirmed: false, waiting: true });
  // Verify the stored object against the declared metadata. Storage metadata
  // includes size/contentLength; when present it must match the declared byte
  // size so a different file cannot be finalized under a known media id.
  // The declared SHA-256 (computed automatically on the client while media is
  // selected) is recorded on the row and travels into exports; byte-level
  // hash verification is performed by the checkpoint builder / consumers so
  // it never doubles upload bandwidth inside the sync path.
  const storedSize = Number(
    (stored.metadata as Record<string, unknown> | undefined)?.size ??
      (stored.metadata as Record<string, unknown> | undefined)?.contentLength ??
      -1,
  );
  if (Number.isFinite(storedSize) && storedSize >= 0) {
    const { data: mediaRow } = await service
      .from("submission_media")
      .select("byte_size")
      .eq("id", mediaId)
      .eq("submission_id", submissionId)
      .maybeSingle();
    if (mediaRow && Number(mediaRow.byte_size) !== storedSize) {
      return invalid(
        "Media object size does not match the declared metadata",
        409,
      );
    }
  }
  const { error: updateError } = await service
    .from("submission_media")
    .update({
      status: "UPLOADED",
    })
    .eq("id", mediaId)
    .eq("submission_id", submissionId);
  if (updateError) {
    return invalid("Media acknowledgement could not be recorded", 500);
  }
  return json({ confirmed: true, idempotent: false });
}

async function finalizeSubmission(
  service: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const submissionId = String(body.submission_id ?? "");
  const { data: submission } = await service
    .from("submissions")
    .select(
      "id,project_id,contributor_id,status,expected_media_count,finalized_at,server_received_at",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission || submission.contributor_id !== userId) {
    return invalid("Submission is not available", 403);
  }
  const access = await projectAccess(service, submission.project_id, userId);
  if (!access) return invalid("Project assignment is not active", 403);
  if (submission.status === "COMPLETE") {
    return json({
      submission_id: submissionId,
      status: "COMPLETE",
      finalized_at: submission.finalized_at,
      received_at: submission.server_received_at,
    });
  }

  const { data: media, error: mediaError } = await service
    .from("submission_media")
    .select("id,status")
    .eq("submission_id", submissionId);
  if (mediaError) return invalid("Media status could not be read", 500);
  if (
    (media ?? []).length !== submission.expected_media_count ||
    (media ?? []).some((item) => item.status !== "UPLOADED")
  ) {
    return invalid("Media is still uploading", 409);
  }

  // Atomic finalize: only the caller that flips status to COMPLETE gets to
  // mint the receipt timestamp; a concurrent caller that updates zero rows
  // re-reads and returns the stored receipt instead of inventing its own.
  const { data: updated, error: updateError } = await service
    .from("submissions")
    .update({
      status: "COMPLETE",
      finalized_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .neq("status", "COMPLETE")
    .select("finalized_at,server_received_at")
    .maybeSingle();
  if (updateError) return invalid("Submission could not be finalized", 500);
  if (updated) {
    return json({
      submission_id: submissionId,
      status: "COMPLETE",
      finalized_at: updated.finalized_at,
      received_at: updated.server_received_at,
    });
  }
  const { data: after } = await service
    .from("submissions")
    .select("finalized_at,server_received_at")
    .eq("id", submissionId)
    .maybeSingle();
  return json({
    submission_id: submissionId,
    status: "COMPLETE",
    finalized_at: after?.finalized_at ?? null,
    received_at: after?.server_received_at ?? null,
  });
}

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
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "create_submission") {
      return await createSubmission(service, user.id, body);
    }
    if (action === "confirm_media") {
      return await confirmMedia(service, user.id, body);
    }
    if (action === "finalize_submission") {
      return await finalizeSubmission(service, user.id, body);
    }
    return invalid("Unknown synchronization operation");
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
