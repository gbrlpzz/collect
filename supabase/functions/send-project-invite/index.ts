import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, {
      status: 405,
      headers: corsHeaders,
    });
  }
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const projectId = String(body.project_id ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!projectId || !email || !email.includes("@")) {
      return json({ error: "Project and contributor email are required" }, {
        status: 400,
      });
    }
    const access = await projectAccess(service, projectId, user.id);
    if (!access?.admin) {
      return json({ error: "Administrator access is required" }, {
        status: 403,
      });
    }

    const { data: existingInvite } = await service.from("project_invites")
      .select("id").eq("project_id", projectId).eq("status", "pending").ilike(
        "email",
        email,
      ).maybeSingle();
    if (existingInvite) return json({ accepted: true, already_pending: true });

    let invitedUserId: string | null = null;
    const inviteResult = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: Deno.env.get("APP_URL") ?? "https://collect-tawny.vercel.app",
    });
    if (!inviteResult.error) invitedUserId = inviteResult.data.user?.id ?? null;
    else if (!/already|registered|exists/i.test(inviteResult.error.message)) {
      return json({ error: "The invitation could not be sent" }, {
        status: 502,
      });
    }

    const { error: insertError } = await service.from("project_invites").insert(
      {
        project_id: projectId,
        email,
        invited_by: user.id,
        invited_user_id: invitedUserId,
      },
    );
    if (insertError) {
      return json({ error: "The invitation record could not be stored" }, {
        status: 500,
      });
    }
    if (invitedUserId) {
      await service.from("project_members").upsert({
        project_id: projectId,
        user_id: invitedUserId,
        role: "contributor",
      }, { onConflict: "project_id,user_id" });
    }
    await service.from("audit_events").insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      actor_id: user.id,
      action: "contributor_invited",
      metadata: { email },
    });
    return json({ accepted: true, invited: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
