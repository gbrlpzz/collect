import { Upload } from "tus-js-client";
import { z } from "zod";
import type { MediaAsset, Observation, Project } from "../types";
import { markOutboxOperation, setLocalSubmissionStatus } from "./localStore";
import { buildMediaObjectPath } from "./syncProtocol";
import { collectDeviceInfo } from "./deviceInfo";
import { supabase } from "./supabaseClient";

const receiptSchema = z.object({
  submission_id: z.string(),
  status: z.string(),
  finalized_at: z.string().nullable().optional(),
});

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function invoke<T>(
  functionName: string,
  body: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke(functionName, { body });
  if (error) {
    // Supabase wraps non-2xx responses in FunctionsHttpError whose message is
    // only a status line. The server's reason lives in the response body; it
    // is what drives ACTION_REQUIRED classification and honest UI copy.
    const context =
      error && typeof error === "object"
        ? (error as { context?: unknown }).context
        : null;
    if (
      context &&
      typeof context === "object" &&
      "clone" in context &&
      typeof (context as { clone?: unknown }).clone === "function"
    ) {
      try {
        const body = (await (context as Response).clone().json()) as {
          error?: unknown;
        };
        if (typeof body.error === "string" && body.error.trim())
          throw new Error(body.error);
      } catch (caught) {
        if (
          caught instanceof Error &&
          caught.message !== "Unexpected end of JSON input"
        )
          throw caught;
      }
    }
    throw error;
  }
  return schema.parse(data);
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
      payload: observation.values,
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
  if (!asset.blob) throw new Error(`Media ${asset.id} has no local blob`);
  const objectName = buildMediaObjectPath(project.id, observation.id, asset.id);
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
  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken)
    throw new Error("Authentication is required before media upload");
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string;
  const endpoint = `${projectUrl.replace(/\/$/, "")}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
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
    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length)
          upload.resumeFromPreviousUpload(previousUploads[0]);
        upload.start();
      })
      .catch(reject);
  });

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
    throw new Error(
      `Media ${asset.id} was uploaded but not acknowledged by the server`,
    );
}

export interface RemoteReceipt {
  submission_id: string;
  status: string;
  finalized_at?: string | null;
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
  for (const asset of input.observation.media ?? []) {
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
  progress.onPhase?.(id, "FINALIZING");
  await setLocalSubmissionStatus(id, "FINALIZING");
  await markOutboxOperation(`finalize:${id}`, "IN_PROGRESS");
  return finalizeRemoteSubmission({ observation: input.observation });
}

export async function probeRemoteHealth(): Promise<boolean> {
  if (!supabase) return false;
  const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
  if (!projectUrl || !publishableKey) return false;
  try {
    const response = await fetch(
      `${projectUrl.replace(/\/$/, "")}/functions/v1/health`,
      {
        method: "HEAD",
        headers: { apikey: publishableKey },
        cache: "no-store",
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function reportDeviceStatus(
  payload: Record<string, unknown>,
): Promise<void> {
  await invoke("device-status", payload, z.object({ accepted: z.boolean() }));
}

export async function claimInvites(): Promise<void> {
  await invoke("claim-invites", {}, z.object({ accepted: z.boolean() }));
}
