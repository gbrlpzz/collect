import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";

function nonNegativeInteger(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const deviceId = String(body.device_id ?? "");
    const projectId = String(body.project_id ?? "");
    if (!deviceId || !projectId) return json({ error: "Device and project are required" }, { status: 400 });
    const access = await projectAccess(service, projectId, user.id);
    if (!access) return json({ error: "Project assignment is not active" }, { status: 403 });

    const pendingSubmissions = nonNegativeInteger(body.pending_submissions);
    const pendingMedia = nonNegativeInteger(body.pending_media);
    const fieldworkComplete = body.fieldwork_complete === true;
    if (fieldworkComplete && (pendingSubmissions > 0 || pendingMedia > 0)) return json({ error: "Fieldwork cannot be complete while operations are pending" }, { status: 409 });

    const { data: device } = await service.from("devices").select("contributor_id").eq("id", deviceId).maybeSingle();
    if (device && device.contributor_id !== user.id) return json({ error: "Device identifier belongs to another contributor" }, { status: 409 });
    const now = new Date().toISOString();
    const { data: previousStatus } = await service.from("device_project_status").select("last_sync_success_at").eq("device_id", deviceId).eq("project_id", projectId).maybeSingle();
    const { error: deviceError } = await service.from("devices").upsert({ id: deviceId, contributor_id: user.id, app_version: String(body.app_version ?? ""), last_seen_at: now }, { onConflict: "id" });
    if (deviceError) return json({ error: "Device could not be updated" }, { status: 500 });

    const { error: statusError } = await service.from("device_project_status").upsert({
      device_id: deviceId,
      project_id: projectId,
      contributor_id: user.id,
      last_seen_at: now,
      last_sync_success_at: pendingSubmissions === 0 && pendingMedia === 0 ? now : previousStatus?.last_sync_success_at ?? null,
      pending_submissions: pendingSubmissions,
      pending_media: pendingMedia,
      app_version: String(body.app_version ?? ""),
      schema_versions_cached: Array.isArray(body.schema_versions_cached) ? body.schema_versions_cached : [],
      fieldwork_complete: fieldworkComplete,
    }, { onConflict: "device_id,project_id" });
    if (statusError) return json({ error: "Device project status could not be recorded" }, { status: 500 });
    return json({ accepted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
