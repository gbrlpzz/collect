import { corsHeaders, json, options } from "../_shared/cors.ts";
import {
  allowListIsEnvironmentManaged,
  errorMessage,
  isEmailExplicitlyAllowed,
  requireUser,
} from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";
import { adminInviteEmail } from "../_shared/invite.ts";
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
    const inviterEmail = user.email?.trim().toLowerCase() ?? null;
    const body = (await request.json()) as Record<string, unknown>;
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || !email.includes("@") || email.length > 320) {
      return json(
        { error: "An administrator email is required" },
        {
          status: 400,
        },
      );
    }

    // The inviter must already administer the workspace.
    const { data: membership } = await service
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return json(
        { error: "Administrator access is required" },
        {
          status: 403,
        },
      );
    }
    // The allow-list is the single source of administrator rights: an address
    // on it becomes an administrator when it signs in, whatever method it
    // used. Inviting an address therefore means adding it to the list.
    if (!(await isEmailExplicitlyAllowed(service, email))) {
      if (allowListIsEnvironmentManaged()) {
        return json(
          {
            error:
              "This deployment's administrator allow-list is set by an environment secret. Add the address to ALLOWED_EMAIL_PATTERNS.",
          },
          { status: 409 },
        );
      }
      const { error: patternError } = await service.rpc(
        "add_allowed_admin_pattern",
        { p_pattern: email, p_keep_pattern: inviterEmail },
      );
      if (patternError) {
        return json(
          { error: "The administrator allow-list could not be updated" },
          { status: 500 },
        );
      }
    }

    // Grant immediately when the address already has an account; otherwise the
    // grant happens at first sign-in, from the allow-list.
    const { data: resolvedUserId } = await service.rpc(
      "resolve_user_id_by_email",
      { p_email: email },
    );
    const invitedUserId = typeof resolvedUserId === "string"
      ? resolvedUserId
      : null;

    if (invitedUserId) {
      const { error: memberError } = await service
        .from("organization_members")
        .upsert(
          {
            organization_id: membership.organization_id,
            user_id: invitedUserId,
            role: "admin",
          },
          { onConflict: "organization_id,user_id" },
        );
      if (memberError) {
        return json(
          {
            error: "The administrator membership could not be recorded",
          },
          { status: 500 },
        );
      }
    }

    let emailed = false;
    try {
      const { data: organizationRow } = await service
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .maybeSingle();
      const message = adminInviteEmail({
        email,
        appUrl: appEntryUrl(),
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
      // Delivery is advisory: the allow-list entry and any membership are
      // already recorded, so the invitation works as soon as they sign in.
    }

    await service.from("audit_events").insert({
      organization_id: membership.organization_id,
      actor_id: user.id,
      action: "admin_invited",
      metadata: { email, user_id: invitedUserId },
    });
    return json({ accepted: true, invited: true, emailed });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
