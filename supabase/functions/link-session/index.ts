import { corsHeaders, json, options } from "../_shared/cors.ts";
import { errorMessage, requireUser, serviceClient } from "../_shared/auth.ts";
import { appUrl } from "../_shared/config.ts";
import { sha256 } from "../_shared/hash.ts";

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
      const code = randomCode();
      const codeHash = await sha256(code);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
      const { error } = await service.rpc("store_session_link_code", {
        p_code_hash: codeHash,
        p_user_id: user.id,
        p_expires_at: expiresAt.toISOString(),
      });
      if (error) {
        return json(
          { error: "A sign-in code could not be created" },
          { status: 500 },
        );
      }
      return json({ accepted: true, code, expires_in_seconds: 300 });
    }

    if (action === "exchange") {
      const code = String(body.code ?? "")
        .trim()
        .toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
        return json(
          { error: "Enter the eight-character sign-in code" },
          { status: 400 },
        );
      }
      const service = serviceClient();
      const codeHash = await sha256(code);
      // Resolve the redirect target before consuming the single-use code so a
      // misconfigured deployment cannot burn a valid code and then fail.
      const redirectTo = appUrl();
      // Consume in the same statement that validates the one-time code. Two
      // containers racing the same code can never both receive a session.
      const { data: userId } = await service.rpc("consume_session_link_code", {
        p_code_hash: codeHash,
      });
      if (typeof userId !== "string") {
        // Count the failed try so a guessed code invalidates after a small
        // number of attempts instead of being brute-forced inside its TTL.
        try {
          await service.rpc("bump_session_link_attempt", {
            p_code_hash: codeHash,
          });
        } catch {
          // Best effort; the exchange is rejected either way.
        }
        return json(
          { error: "That sign-in code is invalid or expired" },
          { status: 404 },
        );
      }

      const { data: owner } = await service.auth.admin.getUserById(userId);
      const email = owner?.user?.email;
      if (!email) {
        return json(
          { error: "The sign-in code could not be resolved" },
          { status: 409 },
        );
      }

      const { data: link, error: linkError } = await service.auth.admin
        .generateLink({
          type: "magiclink",
          email,
          options: {
            redirectTo,
          },
        });
      if (linkError || !link?.properties?.hashed_token) {
        return json(
          { error: "The sign-in link could not be generated" },
          { status: 502 },
        );
      }

      // The hashed token is what verifyOtp accepts as token_hash; it is
      // single-use and short-lived, so handing it to the linking container is
      // equivalent to opening the magic-link email there.
      return json({
        accepted: true,
        token_hash: link.properties.hashed_token,
        type: "magiclink",
      });
    }

    return json({ error: "Unknown link-session operation" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
