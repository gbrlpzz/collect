import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, requireUser } from "../_shared/auth.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 320) return json({ error: "An administrator email is required" }, { status: 400 });

    // The inviter must already administer the workspace.
    const { data: membership } = await service
      .from("organization_members")
      .select("organization_id,role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (!membership) return json({ error: "Administrator access is required" }, { status: 403 });

    // Create the account (invite email) or reuse an existing one.
    const inviteResult = await service.auth.admin.inviteUserByEmail(email, {
      redirectTo: Deno.env.get("APP_URL") ?? "https://collect-tawny.vercel.app",
    });
    if (inviteResult.error && !/already|registered|exists/i.test(inviteResult.error.message)) {
      return json({ error: `The invitation could not be sent: ${inviteResult.error.message}` }, { status: 502 });
    }
    const invitedUserId = inviteResult.data?.user?.id ?? null;

    if (invitedUserId) {
      const { error: memberError } = await service.from("organization_members").upsert(
        { organization_id: membership.organization_id, user_id: invitedUserId, role: "admin" },
        { onConflict: "organization_id,user_id" },
      );
      if (memberError) return json({ error: "The administrator membership could not be recorded" }, { status: 500 });
    }

    await service.from("audit_events").insert({
      organization_id: membership.organization_id,
      actor_id: user.id,
      action: "admin_invited",
      metadata: { email, user_id: invitedUserId },
    });
    return json({ accepted: true, invited: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
