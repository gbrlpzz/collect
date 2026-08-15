import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import {
  errorMessage,
  projectAccess,
  requireUser,
  serviceClient,
} from "../_shared/auth.ts";
import { sha256 } from "../_shared/hash.ts";
import { sendEmail } from "../_shared/mail.ts";
import { bumpIpRateLimit } from "../_shared/rateLimit.ts";

const CODE_TTL_SECONDS = 20 * 60;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_RECENT_PER_USER = 3;

/**
 * Admin-minted, email-delivered contributor sign-in codes. The code itself is
 * the contributor's login credential: single-use, time-boxed, hashed at rest,
 * and exchanged through the same bridge as device-link codes.
 *
 * POST { action: "create", project_id, email }  (project administrator)
 *   Mints a code for an existing project contributor, emails it, and returns
 *   it so the administrator can also share it in person.
 * POST { action: "request", email }             (any visitor)
 *   Self-service: mints and emails a fresh code when the address belongs to an
 *   existing contributor. Always answers with the same accepted response so
 *   the login screen never reveals which addresses have accounts.
 */
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}

function codeEmail(code: string): { subject: string; text: string } {
  return {
    subject: "Your collect sign-in code",
    text: [
      `Your collect sign-in code is:`,
      ``,
      code,
      ``,
      `Enter it in the collect app on this device. It expires in 20 minutes and can only be used once.`,
      `If you did not request this code, you can ignore this email.`,
    ].join("\n"),
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "create") {
      const { user, service } = await requireUser(request);
      const projectId = String(body.project_id ?? "");
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!projectId || !email.includes("@")) {
        return json(
          { error: "Project and contributor email are required" },
          { status: 400 },
        );
      }
      const access = await projectAccess(service, projectId, user.id);
      if (!access?.admin) {
        return json(
          { error: "Administrator access is required" },
          { status: 403 },
        );
      }

      // The code is bound to a contributor account that is already a member
      // of this project — never to a random address. Resolve via the
      // security-definer RPC (the auth schema is not exposed to PostgREST).
      const { data: contributorId } = await service.rpc(
        "resolve_user_id_by_email",
        { p_email: email },
      );
      if (typeof contributorId !== "string") {
        return json(
          { error: "This person has no account yet; invite them first" },
          { status: 404 },
        );
      }
      const { data: membership } = await service
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", contributorId)
        .maybeSingle();
      if (!membership) {
        return json(
          { error: "This person is not a contributor of the project" },
          { status: 404 },
        );
      }

      const issued = await issueCode(
        service,
        contributorId,
        email,
        user.id,
        projectId,
        access.project.organization_id
          ? String(access.project.organization_id)
          : null,
        false,
      );
      return json({
        accepted: true,
        code: issued.code,
        expires_in_seconds: CODE_TTL_SECONDS,
        emailed: issued.emailed,
      });
    }

    if (action === "request") {
      const service = serviceClient();
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) {
        return json({ accepted: true });
      }
      // Per-IP throttle so one source cannot hammer many addresses. Answer
      // uniformly either way so the screen never reveals the limit.
      if (!(await bumpIpRateLimit(request, service))) {
        return json({ accepted: true });
      }
      // Self-service stays invitation-bound: a code is minted only for an
      // address that already contributes to a project or holds a pending
      // invitation. Every answer is identical, so the sign-in screen never
      // reveals which addresses exist.
      const { data: resolved } = await service.rpc("resolve_user_id_by_email", {
        p_email: email,
      });
      let userId = typeof resolved === "string" ? resolved : null;
      const { data: invite } = await service
        .from("project_invites")
        .select("id")
        .eq("status", "pending")
        .eq("email", email)
        .maybeSingle();
      if (!userId && invite) {
        // An invited person who cannot use a provider still needs a way in.
        // The account is created here — never for an uninvited address — and
        // membership is granted by claim-invites at first sign-in.
        const created = await service.auth.admin.createUser({
          email,
          email_confirm: true,
        });
        userId = created.data?.user?.id ?? null;
      }
      if (userId) {
        const { data: member } = await service
          .from("project_members")
          .select("user_id")
          .eq("user_id", userId)
          .eq("role", "contributor")
          .maybeSingle();
        if (member || invite) {
          try {
            await issueCode(service, userId, email, null, null, null);
          } catch {
            // Advisory by design: the login screen still answers uniformly.
          }
        }
      }
      return json({ accepted: true });
    }

    return json({ error: "Unknown sign-in code operation" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});

async function issueCode(
  service: ReturnType<typeof serviceClient>,
  userId: string,
  email: string,
  actorId: string | null,
  projectId: string | null,
  organizationId: string | null,
  throttle = true,
): Promise<{ code: string; emailed: boolean }> {
  // The mint throttle protects the anonymous self-service path from abuse.
  // Administrator minting is authenticated and audited, so onboarding a
  // whole team is never blocked by it.
  if (throttle) {
    const recent = await service.rpc("count_recent_session_link_codes", {
      p_user_id: userId,
    });
    const recentCount = Number(recent.data ?? 0);
    if (recentCount >= MAX_RECENT_PER_USER) {
      throw new Response(
        "Too many codes were issued recently; wait a few minutes",
        { status: 429 },
      );
    }
  }

  const code = randomCode();
  const codeHash = await sha256(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);
  const { error: storeError } = await service.rpc("store_session_link_code", {
    p_code_hash: codeHash,
    p_user_id: userId,
    p_expires_at: expiresAt.toISOString(),
  });
  if (storeError) {
    throw new Response("A sign-in code could not be created", { status: 500 });
  }

  let emailed = false;
  try {
    const message = codeEmail(code);
    await sendEmail({
      to: email,
      subject: message.subject,
      text: message.text,
    });
    emailed = true;
  } catch {
    // Email delivery is advisory (mail.ts contract): the administrator can
    // still share the returned code in person.
  }

  try {
    await service.from("audit_events").insert({
      organization_id: organizationId,
      project_id: projectId,
      actor_id: actorId,
      action: actorId
        ? "contributor_signin_code_issued"
        : "contributor_signin_code_requested",
      metadata: { email, user_id: userId },
    });
  } catch {
    // The audit trail is best-effort. A code is already stored (and possibly
    // emailed) at this point; a transient audit failure must never turn a
    // successful mint into an error for the caller.
  }
  return { code, emailed };
}
