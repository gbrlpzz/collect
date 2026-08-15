import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, requireUser, serviceClient } from "../_shared/auth.ts";
import { appEntryUrl } from "../_shared/config.ts";
import { bumpIpRateLimit } from "../_shared/rateLimit.ts";
import { sha256 } from "../_shared/hash.ts";

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const linkSessionSchema = z.object({
  action: z.string(),
  code: z.string().optional(),
});

serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }
  try {
    const rawJson = await request.json().catch(() => ({}));
    const parsed = linkSessionSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json({ error: "Invalid request" }, { status: 400 });
    }
    const { action } = parsed.data;

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
      const code = (parsed.data.code ?? "")
        .trim()
        .toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
        return json(
          { error: "Enter the eight-character sign-in code" },
          { status: 400 },
        );
      }
      const service = serviceClient();
      if (!(await bumpIpRateLimit(request, service))) {
        return json(
          {
            error:
              "Too many sign-in attempts. Wait a few minutes and try again.",
          },
          { status: 429 },
        );
      }
      const codeHash = await sha256(code);
      const redirectTo = appEntryUrl();
      const { data: userId } = await service.rpc("consume_session_link_code", {
        p_code_hash: codeHash,
      });
      const resolvedUserId = userId ? String(userId) : null;
      if (!resolvedUserId) {
        return json(
          { error: "That sign-in code is invalid or expired" },
          { status: 404 },
        );
      }

      const { data: owner } = await service.auth.admin.getUserById(
        resolvedUserId,
      );
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
