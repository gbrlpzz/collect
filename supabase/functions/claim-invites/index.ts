import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import {
  errorMessage,
  isEmailExplicitlyAllowed,
  requireUser,
} from "../_shared/auth.ts";
type AuthContext = Awaited<ReturnType<typeof requireUser>>;

/**
 * Administrator rights follow the allow-list, not the sign-in method. An
 * allow-listed address becomes an administrator of the workspace the first
 * time it signs in — with Google, Apple, a link, or a code. A deployment with
 * no configured pattern grants nobody, so open contributor sign-up can never
 * turn into an unexpected administrator.
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
  const { data: organization } = await service
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!organization?.id) return false;
  const { data: existing } = await service
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.role === "admin") return true;
  const { error } = await service.from("organization_members").upsert(
    {
      organization_id: organization.id,
      user_id: user.id,
      role: "admin",
    },
    { onConflict: "organization_id,user_id" },
  );
  if (error) return false;
  await service.from("audit_events").insert({
    organization_id: organization.id,
    actor_id: user.id,
    action: "admin_granted_from_allow_list",
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
