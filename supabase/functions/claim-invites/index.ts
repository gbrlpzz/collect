import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, requireUser } from "../_shared/auth.ts";

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
    const email = user.email?.trim().toLowerCase();
    if (!email) return json({ accepted: true, claimed: 0 });
    const { data: invites, error: inviteError } = await service
      .from("project_invites")
      .select("id,project_id")
      .eq("status", "pending")
      .ilike("email", email);
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
    return json({ accepted: true, claimed });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
