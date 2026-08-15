import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { bumpIpRateLimit } from "../_shared/rateLimit.ts";

function nonNegativeInteger(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

const deviceStatusSchema = z.object({
  device_id: z.string().min(1),
  project_id: z.string().min(1),
  pending_submissions: z.union([z.number(), z.string()]).optional(),
  pending_media: z.union([z.number(), z.string()]).optional(),
  fieldwork_complete: z.boolean().optional(),
  app_version: z.string().max(64).optional(),
  device_model: z.string().max(120).optional(),
  device_os: z.string().max(40).optional(),
  browser: z.string().max(40).optional(),
  schema_versions_cached: z.array(z.number()).optional(),
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
    // Heartbeats are routine telemetry; a runaway or hostile client must not
    // be able to hammer device and status writes without limit.
    if (!(await bumpIpRateLimit(request, service))) {
      return json(
        { error: "Too many device reports; retry later" },
        { status: 429 },
      );
    }
    const rawJson = await request.json().catch(() => ({}));
    const parsed = deviceStatusSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json(
        { error: "Device and project are required" },
        {
          status: 400,
        },
      );
    }
    const { device_id: deviceId, project_id: projectId } = parsed.data;

    const access = await projectAccess(service, projectId, user.id);
    if (!access) {
      return json(
        { error: "Project assignment is not active" },
        {
          status: 403,
        },
      );
    }

    const pendingSubmissions = nonNegativeInteger(
      parsed.data.pending_submissions,
    );
    const pendingMedia = nonNegativeInteger(parsed.data.pending_media);
    const fieldworkComplete = parsed.data.fieldwork_complete === true;
    if (fieldworkComplete && (pendingSubmissions > 0 || pendingMedia > 0)) {
      return json(
        {
          error: "Fieldwork cannot be complete while operations are pending",
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const { error: deviceInsertError } = await service.from("devices").insert({
      id: deviceId,
      contributor_id: user.id,
      app_version: String(parsed.data.app_version ?? ""),
      device_model: String(parsed.data.device_model ?? "").slice(0, 120),
      device_os: String(parsed.data.device_os ?? "").slice(0, 40),
      browser: String(parsed.data.browser ?? "").slice(0, 40),
      last_seen_at: now,
    });
    if (
      deviceInsertError &&
      // SAFETY: PostgREST error object has a code property string.
      (deviceInsertError as { code?: string }).code !== "23505"
    ) {
      return json({ error: "Device could not be updated" }, { status: 500 });
    }
    const { data: device } = await service
      .from("devices")
      .select("contributor_id")
      .eq("id", deviceId)
      .maybeSingle();
    if (!device) {
      return json({ error: "Device could not be updated" }, { status: 500 });
    }
    if (device.contributor_id !== user.id) {
      return json(
        { error: "Device identifier belongs to another contributor" },
        { status: 409 },
      );
    }
    const { data: previousStatus } = await service
      .from("device_project_status")
      .select("last_sync_success_at")
      .eq("device_id", deviceId)
      .eq("project_id", projectId)
      .maybeSingle();

    const { error: statusError } = await service
      .from("device_project_status")
      .upsert(
        {
          device_id: deviceId,
          project_id: projectId,
          contributor_id: user.id,
          last_seen_at: now,
          last_sync_success_at: pendingSubmissions === 0 && pendingMedia === 0
            ? now
            : (previousStatus?.last_sync_success_at ?? null),
          pending_submissions: pendingSubmissions,
          pending_media: pendingMedia,
          app_version: String(parsed.data.app_version ?? ""),
          schema_versions_cached: parsed.data.schema_versions_cached ?? [],
          fieldwork_complete: fieldworkComplete,
        },
        { onConflict: "device_id,project_id" },
      );
    if (statusError) {
      return json(
        { error: "Device project status could not be recorded" },
        {
          status: 500,
        },
      );
    }
    return json({ accepted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
