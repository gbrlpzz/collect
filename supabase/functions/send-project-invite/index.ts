import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";
import { projectInviteEmail } from "../_shared/invite.ts";
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
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const role = body.role === "admin" ? "admin" : "contributor";
    const resend = body.resend === true;
    if (!projectId || !email || !email.includes("@")) {
      return json(
        { error: "Project and contributor email are required" },
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

    // An explicit resend supersedes any earlier pending invitation; the
    // partial unique index only allows one pending invite per address.
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

    // The invitation carries no credential: it names the project and points at
    // the sign-in screen. An address that already has an account becomes a
    // member immediately; a new address is claimed by claim-invites at first
    // sign-in. Nothing here uses the authentication provider's mailer.
    const { data: resolvedUserId } = await service.rpc(
      "resolve_user_id_by_email",
      { p_email: email },
    );
    const invitedUserId = typeof resolvedUserId === "string"
      ? resolvedUserId
      : null;

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
      .eq("id", access.project.organization_id as string)
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
      // Delivery is advisory (mail.ts contract): the invitation is recorded,
      // and the administrator can share the app address in person.
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
