import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import {
  allowListIsEnvironmentManaged,
  errorMessage,
  isEmailExplicitlyAllowed,
  requireUser,
} from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";
import { adminInviteEmail } from "../_shared/invite.ts";
import { sendEmail } from "../_shared/mail.ts";

const adminInviteSchema = z.object({
  email: z.string().email().max(320),
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
    const inviterEmail = user.email?.trim().toLowerCase() ?? null;
    const rawJson = await request.json().catch(() => ({}));
    const parsed = adminInviteSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json(
        { error: "An administrator email is required" },
        {
          status: 400,
        },
      );
    }
    const email = parsed.data.email.trim().toLowerCase();

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

    const { data: resolvedUserId } = await service.rpc(
      "resolve_user_id_by_email",
      { p_email: email },
    );
    const invitedUserId = resolvedUserId ? String(resolvedUserId) : null;

    await service.from("organization_invites").upsert(
      {
        organization_id: membership.organization_id,
        email,
        invited_by: user.id,
        invited_user_id: invitedUserId,
        status: invitedUserId ? "accepted" : "pending",
        accepted_at: invitedUserId ? new Date().toISOString() : null,
      },
      { onConflict: "organization_id,email" },
    );

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
      // Delivery is advisory.
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
