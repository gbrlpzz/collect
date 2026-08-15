import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";
import { projectInviteEmail } from "../_shared/invite.ts";
import { sendEmail } from "../_shared/mail.ts";

const projectInviteSchema = z.object({
  project_id: z.string().min(1),
  email: z.string().email().max(320),
  role: z.string().optional(),
  resend: z.boolean().optional(),
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
    const rawJson = await request.json().catch(() => ({}));
    const parsed = projectInviteSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json(
        { error: "Project and contributor email are required" },
        {
          status: 400,
        },
      );
    }
    const projectId = parsed.data.project_id;
    const email = parsed.data.email.trim().toLowerCase();
    const role = parsed.data.role === "admin" ? "admin" : "contributor";
    const resend = parsed.data.resend === true;

    const access = await projectAccess(service, projectId, user.id);
    if (!access?.admin) {
      return json(
        { error: "Administrator access is required" },
        {
          status: 403,
        },
      );
    }

    if (resend) {
      await service
        .from("project_invites")
        .update({ status: "revoked" })
        .eq("project_id", projectId)
        .eq("status", "pending")
        .eq("email", email);
    }

    const { data: existingInvite } = await service
      .from("project_invites")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "pending")
      .eq("email", email)
      .maybeSingle();
    if (existingInvite) return json({ accepted: true, already_pending: true });

    const { data: resolvedUserId } = await service.rpc(
      "resolve_user_id_by_email",
      { p_email: email },
    );
    const invitedUserId = resolvedUserId ? String(resolvedUserId) : null;

    const { error: insertError } = await service
      .from("project_invites")
      .insert({
        project_id: projectId,
        email,
        invited_by: user.id,
        invited_user_id: invitedUserId,
      });
    if (insertError) {
      return json(
        { error: "The invitation record could not be stored" },
        {
          status: 500,
        },
      );
    }
    if (invitedUserId) {
      await service.from("project_members").upsert(
        {
          project_id: projectId,
          user_id: invitedUserId,
          role,
        },
        { onConflict: "project_id,user_id" },
      );
    }

    const { data: projectRow } = await service
      .from("projects")
      .select("name,organization_id")
      .eq("id", projectId)
      .maybeSingle();
    const { data: organizationRow } = await service
      .from("organizations")
      .select("name")
      .eq("id", String(access.project.organization_id))
      .maybeSingle();
    let emailed = false;
    try {
      const message = projectInviteEmail({
        email,
        appUrl: appEntryUrl(),
        projectName: String(projectRow?.name ?? "a field project"),
        organizationName: organizationRow?.name
          ? String(organizationRow.name)
          : null,
      });
      await sendEmail({
        to: email,
        subject: message.subject,
        text: message.text,
      });
      emailed = true;
    } catch {
      // Delivery is advisory.
    }
    await service.from("audit_events").insert({
      organization_id: access.project.organization_id,
      project_id: projectId,
      actor_id: user.id,
      action: "contributor_invited",
      metadata: { email, role },
    });
    return json({
      accepted: true,
      invited: true,
      emailed,
      resend: resend || !invitedUserId,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
