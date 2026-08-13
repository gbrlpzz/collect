import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/mail.ts";

Deno.serve(async (request) => {
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
    const projectId = String(body.project_id ?? "");
    const contributorId = String(body.contributor_id ?? "");
    if (!projectId || !contributorId) {
      return json(
        { error: "Project and contributor are required" },
        {
          status: 400,
        },
      );
    }
    const access = await projectAccess(service, projectId, user.id);
    if (!access?.admin) {
      return json(
        { error: "Administrator access is required" },
        {
          status: 403,
        },
      );
    }

    const { data: membership } = await service
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", contributorId)
      .maybeSingle();
    if (!membership) {
      return json(
        { error: "Contributor is not assigned to this project" },
        {
          status: 404,
        },
      );
    }
    const { data: contributor, error: contributorError } = await service.auth
      .admin.getUserById(contributorId);
    const email = contributor?.user?.email?.trim();
    if (contributorError || !email) {
      return json(
        { error: "Contributor email is unavailable" },
        {
          status: 409,
        },
      );
    }
    const { data: project } = await service
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    await sendEmail({
      to: email,
      subject: `${
        project?.name ?? "Your field project"
      } still has field data waiting to synchronize`,
      text: `${
        project?.name ?? "Your field project"
      } still has field data waiting to synchronize.\n\nOpen the collector when you have connectivity and allow synchronization to complete.\n\n${
        Deno.env.get("APP_URL") ?? "https://collect-tawny.vercel.app"
      }/?project=${encodeURIComponent(projectId)}`,
    });
    await service.from("audit_events").insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      actor_id: user.id,
      action: "contributor_pinged",
      metadata: { contributor_id: contributorId },
    });
    return json({ accepted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
