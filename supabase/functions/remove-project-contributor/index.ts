import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";

const removeContributorSchema = z.object({
  project_id: z.string().min(1),
  email: z.string().email(),
});

serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }
  try {
    const { user, service } = await requireUser(request);
    const rawJson = await request.json().catch(() => ({}));
    const parsed = removeContributorSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json(
        { error: "Project and contributor email are required" },
        { status: 400 },
      );
    }
    const projectId = parsed.data.project_id;
    const email = parsed.data.email.trim().toLowerCase();

    const access = await projectAccess(service, projectId, user.id);
    if (!access?.admin) {
      return json(
        { error: "Administrator access is required" },
        { status: 403 },
      );
    }

    const { data: contributorId } = await service.rpc(
      "resolve_user_id_by_email",
      { p_email: email },
    );
    const resolvedId = contributorId ? String(contributorId) : null;

    // Never remove administrators through this path.
    if (resolvedId) {
      const { data: membership } = await service
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", resolvedId)
        .maybeSingle();
      if (membership?.role === "admin") {
        return json(
          { error: "Administrators cannot be removed from a project" },
          { status: 400 },
        );
      }
      const { data: orgMember } = await service
        .from("organization_members")
        .select("role")
        .eq("user_id", resolvedId)
        .maybeSingle();
      if (orgMember?.role === "admin") {
        return json(
          {
            error:
              "Organization administrators cannot be removed from a project",
          },
          { status: 400 },
        );
      }
    }

    // Revoke pending invitations for this address.
    await service
      .from("project_invites")
      .update({ status: "revoked" })
      .eq("project_id", projectId)
      .eq("email", email)
      .eq("status", "pending");

    if (resolvedId) {
      await service
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", resolvedId);
      await service
        .from("device_project_status")
        .delete()
        .eq("project_id", projectId)
        .eq("contributor_id", resolvedId);
    }

    await service.from("audit_events").insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      actor_id: user.id,
      action: "contributor_removed",
      metadata: { email, contributor_id: resolvedId },
    });
    return json({ accepted: true, removed: Boolean(resolvedId) });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
