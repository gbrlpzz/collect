import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, requireUser } from "../_shared/auth.ts";

function randomCode(): string {
  // 8 characters from an unambiguous alphabet (no 0/O/1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/**
 * Device-link bridge across iOS containers.
 *
 * POST { action: "create" }            (authenticated) mints a one-time code
 *                                      for the signed-in user and returns it.
 * POST { action: "exchange", code }    (any container) consumes the code and
 *                                      returns a fresh magic-link token for
 *                                      the owning user; the caller verifies it
 *                                      with supabase.auth.verifyOtp and the
 *                                      session lands in the current container.
 */
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const { user, service } = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "create") {
      const code = randomCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      const { error } = await service.from("session_link_codes").insert({
        code,
        user_id: user.id,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
      if (error) return json({ error: "A sign-in code could not be created" }, { status: 500 });
      return json({ accepted: true, code, expires_in_seconds: 300 });
    }

    if (action === "exchange") {
      const code = String(body.code ?? "").trim().toUpperCase();
      if (!code) return json({ error: "A sign-in code is required" }, { status: 400 });
      const { data: row } = await service
        .from("session_link_codes")
        .select("user_id,expires_at,used_at")
        .eq("code", code)
        .maybeSingle();
      if (!row) return json({ error: "That sign-in code is not valid" }, { status: 404 });
      if (row.used_at) return json({ error: "That sign-in code was already used" }, { status: 409 });
      if (new Date(row.expires_at).getTime() < Date.now()) return json({ error: "That sign-in code has expired" }, { status: 410 });

      const { data: owner } = await service.auth.admin.getUserById(row.user_id);
      const email = owner?.user?.email;
      if (!email) return json({ error: "The sign-in code could not be resolved" }, { status: 409 });

      const { data: link, error: linkError } = await service.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: Deno.env.get("APP_URL") ?? "https://collect-tawny.vercel.app" },
      });
      if (linkError || !link?.properties?.hashed_token) {
        return json({ error: "The sign-in link could not be generated" }, { status: 502 });
      }

      await service.from("session_link_codes").update({ used_at: new Date().toISOString() }).eq("code", code);
      // The hashed token is what verifyOtp accepts as token_hash; it is
      // single-use and short-lived, so handing it to the linking container is
      // equivalent to opening the magic-link email there.
      return json({ accepted: true, token_hash: link.properties.hashed_token, type: "magiclink" });
    }

    return json({ error: "Unknown link-session operation" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
