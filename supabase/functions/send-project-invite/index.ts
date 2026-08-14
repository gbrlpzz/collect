import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, projectAccess, requireUser } from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";

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

    let invitedUserId: string | null = null;
    const inviteResult = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: appEntryUrl(),
    });
    if (!inviteResult.error) invitedUserId = inviteResult.data.user?.id ?? null;
    else if (!/already|registered|exists/i.test(inviteResult.error.message)) {
      return json(
        { error: "The invitation could not be sent" },
        {
          status: 502,
        },
      );
    }

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
    } else {
      // Already-registered users never receive the sign-up email. Send them a
      // magic link through the public auth resend endpoint so the invitation
      // is actually visible; membership is granted by claim-invites on the
      // next sign-in.
      const resendUrl = `${
        Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? ""
      }/auth/v1/resend`;
      const resendResult = await fetch(resendUrl, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          email,
          options: {
            redirect_to: appEntryUrl(),
          },
        }),
      });
      if (!resendResult.ok && resendResult.status !== 429) {
        return json(
          { error: "The invitation link could not be sent" },
          { status: 502 },
        );
      }
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
      resend: resend || !invitedUserId,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
