import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import {
  errorMessage,
  isEmailExplicitlyAllowed,
  requireUser,
} from "../_shared/auth.ts";
type AuthContext = Awaited<ReturnType<typeof requireUser>>;

const GENERIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "google.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "fastmail.com",
  "yandex.com",
]);

function emailDomain(email: string): string {
  const parts = email.toLowerCase().trim().split("@");
  return parts[1] ?? "";
}

function isGenericDomain(domain: string): boolean {
  return !domain || GENERIC_DOMAINS.has(domain);
}

/**
 * Administrator rights follow the allow-list, not the sign-in method.
 * Institutional domains (e.g. liminalfutures.com) are grouped into their
 * domain organization (e.g. Liminal), while generic consumer domains
 * (gmail.com, etc.) receive their own isolated personal workspaces so they
 * never share projects with strangers.
 */
async function grantAllowListedAdmin(
  service: AuthContext["service"],
  user: AuthContext["user"],
  email: string,
): Promise<boolean> {
  // Only a verified address may claim rights: it is the identifier every
  // membership, invitation, and allow-list entry is keyed on.
  if (!user.email_confirmed_at) return false;
  if (!(await isEmailExplicitlyAllowed(service, email))) return false;

  // 1. Claim any pending organization invitations for this email
  const { data: orgInvites } = await service
    .from("organization_invites")
    .select("id, organization_id")
    .eq("status", "pending")
    .eq("email", email);

  let claimedOrgInvite = false;
  for (const invite of orgInvites ?? []) {
    await service.from("organization_members").upsert(
      {
        organization_id: invite.organization_id,
        user_id: user.id,
        role: "admin",
      },
      { onConflict: "organization_id,user_id" },
    );
    await service
      .from("organization_invites")
      .update({
        status: "accepted",
        invited_user_id: user.id,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
    claimedOrgInvite = true;
  }

  const domain = emailDomain(email);

  // 2. If it is an institutional domain (e.g. liminalfutures.com), match or create the domain organization
  if (!isGenericDomain(domain)) {
    const { data: domainOrg } = await service
      .from("organizations")
      .select("id, name")
      .eq("domain", domain)
      .limit(1)
      .maybeSingle();

    if (domainOrg?.id) {
      await service.from("organization_members").upsert(
        {
          organization_id: domainOrg.id,
          user_id: user.id,
          role: "admin",
        },
        { onConflict: "organization_id,user_id" },
      );
      return true;
    }

    // Create domain organization (e.g. "Liminal" for liminalfutures.com)
    const orgName = domain === "liminalfutures.com"
      ? "Liminal"
      : `${
        domain.split(".")[0].charAt(0).toUpperCase() +
        domain.split(".")[0].slice(1)
      }`;
    const { data: newOrg, error: orgError } = await service
      .from("organizations")
      .insert({
        name: orgName,
        domain: domain,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (!orgError && newOrg?.id) {
      await service.from("organization_members").upsert(
        {
          organization_id: newOrg.id,
          user_id: user.id,
          role: "admin",
        },
        { onConflict: "organization_id,user_id" },
      );
      await service.from("audit_events").insert({
        organization_id: newOrg.id,
        actor_id: user.id,
        action: "admin_domain_workspace_provisioned",
        metadata: { email, domain },
      });
      return true;
    }
  }

  // 3. For generic / personal domains, check if user already has an organization membership
  const { data: existingMembership } = await service
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (existingMembership || claimedOrgInvite) return true;

  // 4. Provision personal workspace for generic email admin
  const { data: newOrg, error: orgError } = await service
    .from("organizations")
    .insert({
      name: "Field organization",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (orgError || !newOrg?.id) return false;

  await service.from("organization_members").upsert(
    {
      organization_id: newOrg.id,
      user_id: user.id,
      role: "admin",
    },
    { onConflict: "organization_id,user_id" },
  );

  await service.from("audit_events").insert({
    organization_id: newOrg.id,
    actor_id: user.id,
    action: "admin_personal_workspace_provisioned",
    metadata: { email },
  });
  return true;
}

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
    const email = user.email?.trim().toLowerCase();
    if (!email) return json({ accepted: true, claimed: 0, admin: false });
    const admin = await grantAllowListedAdmin(service, user, email).catch(
      () => false,
    );
    const { data: invites, error: inviteError } = await service
      .from("project_invites")
      .select("id,project_id")
      .eq("status", "pending")
      .eq("email", email);
    if (inviteError) {
      return json(
        { error: "Invitations could not be checked" },
        {
          status: 500,
        },
      );
    }
    let claimed = 0;
    for (const invite of invites ?? []) {
      const { error: memberError } = await service
        .from("project_members")
        .upsert(
          {
            project_id: invite.project_id,
            user_id: user.id,
            role: "contributor",
          },
          { onConflict: "project_id,user_id" },
        );
      if (memberError) continue;
      await service
        .from("project_invites")
        .update({
          status: "accepted",
          invited_user_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);
      claimed += 1;
    }
    return json({ accepted: true, claimed, admin });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
