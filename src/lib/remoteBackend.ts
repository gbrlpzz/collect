import { Upload } from "tus-js-client";
import { z } from "zod";
import type { JsonValue, MediaAsset, Observation, Project } from "../types";
import { markOutboxOperation, setLocalSubmissionStatus } from "./localStore";
import { invokeFunction } from "./functionError";
import { ActionRequiredError } from "./syncErrors";
import { buildMediaObjectPath } from "./syncProtocol";
import { collectDeviceInfo } from "./deviceInfo";
import { supabase } from "./supabaseClient";

const receiptSchema = z.object({
  submission_id: z.string(),
  status: z.string(),
  finalized_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
});

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function invoke<T, B extends Record<string, JsonValue>>(
  functionName: string,
  body: B,
  schema: z.ZodType<T>,
): Promise<T> {
  const client = requireClient();
  // invokeFunction unwraps the server's own error message from the
  // FunctionsHttpError body; it drives ACTION_REQUIRED classification and
  // honest UI copy.
  return invokeFunction(client, functionName, body, schema);
}

export interface RemoteSyncInput {
  observation: Observation;
  project: Project;
  deviceId: string;
  appVersion: string;
}

export interface SyncProgressCallbacks {
  onPhase?: (submissionId: string, phase: string) => void;
  onMediaProgress?: (
    submissionId: string,
    mediaId: string,
    percent: number,
  ) => void;
}

export async function createRemoteSubmission({
  observation,
  project,
  deviceId,
  appVersion,
}: RemoteSyncInput): Promise<void> {
  const deviceInfo = collectDeviceInfo();
  await invoke(
    "sync-submission",
    {
      action: "create_submission",
      submission_id: observation.id,
      project_id: project.id,
      schema_version: observation.schemaVersion ?? project.schemaVersion,
      // SAFETY: observation.values holds JSON-serializable scalars at the sync boundary;
      // media blobs are uploaded separately and stripped before this call.
      payload: observation.values as Record<string, JsonValue>,
      payload_hash: null,
      client_created_at:
        observation.clientCreatedAt ?? new Date().toISOString(),
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      device_id: deviceId,
      device_model: deviceInfo.deviceModel,
      device_os: deviceInfo.os,
      browser: deviceInfo.browser,
      environment: observation.environment ?? {},
      attention_response: observation.attentionResponse
        ? {
            check_key: observation.attentionResponse.checkKey,
            selected_value: observation.attentionResponse.selectedValue,
          }
        : null,
      app_version: appVersion,
      expected_media_count: (observation.media ?? []).length,
      corrects_submission_id: observation.correctsSubmissionId ?? null,
      media: (observation.media ?? []).map((asset) => ({
        media_id: asset.id,
        field_id: asset.fieldId ?? "field-site-photos",
        mime_type: asset.mimeType,
        byte_size: asset.byteSize,
        original_filename: asset.name,
        captured_at:
          asset.capturedAt ??
          observation.clientCreatedAt ??
          new Date().toISOString(),
        capture_source: asset.captureSource ?? "picker",
        sha256: asset.sha256 ?? null,
      })),
    },
    z.object({ accepted: z.boolean(), idempotent: z.boolean().optional() }),
  );
}

export async function uploadRemoteMedia({
  observation,
  project,
  asset,
  onProgress,
}: {
  observation: Observation;
  project: Project;
  asset: MediaAsset;
  onProgress?: (percent: number) => void;
}): Promise<void> {
  const client = requireClient();
  const objectName = buildMediaObjectPath(project.id, observation.id, asset.id);
  // Ask the server first: the object may already be acknowledged from an
  // earlier attempt even when the local blob was cleaned up.
  const existing = await invoke(
    "sync-submission",
    {
      action: "confirm_media",
      submission_id: observation.id,
      media_id: asset.id,
      object_path: objectName,
    },
    z.object({ confirmed: z.boolean() }),
  );
  if (existing.confirmed) return;
  // Without the blob and without a server copy, nothing can ever upload:
  // surface it for recovery instead of retrying forever.
  if (!asset.blob)
    throw new ActionRequiredError(`Media ${asset.id} has no local blob`);
  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken)
    throw new Error("Authentication is required before media upload");
  // SAFETY: Vite injects the Supabase URL and keys at build time.
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  // SAFETY: Vite injects publishable or anon key at build time.
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string;
  const endpoint = `${projectUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;

  const runUpload = (resumeFrom: boolean): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const upload = new Upload(asset.blob!, {
        endpoint,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        uploadSize: asset.byteSize,
        fingerprint: () =>
          Promise.resolve(
            `collect:${objectName}:${asset.byteSize}:${asset.sha256 ?? ""}`,
          ),
        removeFingerprintOnSuccess: true,
        headers: {
          authorization: `Bearer ${accessToken}`,
          apikey: publishableKey,
        },
        onProgress: onProgress
          ? (bytesSent: number, bytesTotal: number) => {
              if (bytesTotal > 0)
                onProgress(
                  Math.min(100, Math.round((bytesSent / bytesTotal) * 100)),
                );
            }
          : undefined,
        metadata: {
          bucketName: "collect-media",
          objectName,
          contentType: asset.mimeType,
          cacheControl: "3600",
        },
        onError: reject,
        onSuccess: () => resolve(),
      });
      if (resumeFrom) {
        void upload
          .findPreviousUploads()
          .then((previousUploads) => {
            if (previousUploads.length)
              upload.resumeFromPreviousUpload(previousUploads[0]);
            upload.start();
          })
          .catch(reject);
      } else {
        upload.start();
      }
    });

  try {
    await runUpload(true);
  } catch (firstError) {
    // The stored upload may be stale/expired. Retry once with a fresh
    // session (no resume) before giving up.
    try {
      await runUpload(false);
    } catch {
      throw firstError;
    }
  }

  const confirmation = await invoke(
    "sync-submission",
    {
      action: "confirm_media",
      submission_id: observation.id,
      media_id: asset.id,
      object_path: objectName,
    },
    z.object({ confirmed: z.boolean() }),
  );
  if (!confirmation.confirmed)
    throw new ActionRequiredError(
      `Media ${asset.id} was uploaded but not acknowledged by the server`,
    );
}

export interface RemoteReceipt {
  submission_id: string;
  status: string;
  finalized_at?: string | null;
  received_at?: string | null;
}

export async function finalizeRemoteSubmission({
  observation,
}: {
  observation: Observation;
}): Promise<RemoteReceipt> {
  const receipt = await invoke(
    "sync-submission",
    { action: "finalize_submission", submission_id: observation.id },
    receiptSchema,
  );
  if (receipt.status !== "COMPLETE")
    throw new Error("Server did not return a complete receipt");
  return receipt;
}

export async function syncRemoteObservation(
  input: RemoteSyncInput,
  progress: SyncProgressCallbacks = {},
): Promise<RemoteReceipt> {
  const id = input.observation.id;
  progress.onPhase?.(id, "SYNCING_METADATA");
  await setLocalSubmissionStatus(id, "SYNCING_METADATA");
  await markOutboxOperation(`submission:${id}`, "IN_PROGRESS");
  await createRemoteSubmission(input);
  progress.onPhase?.(id, "SYNCING_MEDIA");
  await setLocalSubmissionStatus(id, "SYNCING_MEDIA");
  const mediaAssets = input.observation.media ?? [];
  // Bounded parallelism: uploads are independent, so up to two run at once
  // (with durable per-media progress); failures abort the remaining batch.
  let mediaCursor = 0;
  const workers = Array.from(
    { length: Math.min(2, mediaAssets.length) },
    async () => {
      while (mediaCursor < mediaAssets.length) {
        const index = mediaCursor;
        mediaCursor += 1;
        const asset = mediaAssets[index];
        await markOutboxOperation(`media:${asset.id}`, "IN_PROGRESS");
        await uploadRemoteMedia({
          observation: input.observation,
          project: input.project,
          asset,
          onProgress: (percent) =>
            progress.onMediaProgress?.(id, asset.id, percent),
        });
        await markOutboxOperation(`media:${asset.id}`, "ACKNOWLEDGED");
        progress.onMediaProgress?.(id, asset.id, 100);
      }
    },
  );
  await Promise.all(workers);
  progress.onPhase?.(id, "FINALIZING");
  await setLocalSubmissionStatus(id, "FINALIZING");
  await markOutboxOperation(`finalize:${id}`, "IN_PROGRESS");
  return finalizeRemoteSubmission({ observation: input.observation });
}

export async function probeRemoteHealth(): Promise<boolean> {
  if (!supabase) return false;
  // SAFETY: Vite injects build-time environment variables as strings or undefined.
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  // SAFETY: Vite injects build-time environment variables as strings or undefined.
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  if (!projectUrl || !publishableKey) return false;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `${projectUrl.replace(/\/$/, "")}/functions/v1/health`,
        {
          method: "HEAD",
          headers: { apikey: publishableKey },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      return response.ok;
    } finally {
      window.clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

export interface DeviceStatusPayload extends Record<string, JsonValue> {
  device_id: string;
  project_id: string;
  pending_submissions: number;
  pending_media: number;
  app_version: string;
  schema_versions_cached: number[];
  fieldwork_complete: boolean;
}

export async function reportDeviceStatus(
  payload: DeviceStatusPayload,
): Promise<void> {
  await invoke("device-status", payload, z.object({ accepted: z.boolean() }));
}

export async function claimInvites(): Promise<void> {
  await invoke("claim-invites", {}, z.object({ accepted: z.boolean() }));
}
