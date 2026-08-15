import { z } from "zod";
import { invokeFunction } from "../functionError";
import { requireAuthClient } from "./client";

/**
 * Mint a one-time device-link code for the signed-in session. The code is
 * typed into another container (an installed PWA, a second phone) to move the
 * session there without email. On iOS an installed app and Safari are separate
 * storage containers, so this is the bridge between them.
 */
export async function requestDeviceLinkCode(): Promise<{
  code: string;
  expiresInSeconds: number;
}> {
  const client = requireAuthClient();
  const data = await invokeFunction(
    client,
    "link-session",
    { action: "create" },
    z.object({ code: z.string(), expires_in_seconds: z.number().optional() }),
  );
  return {
    code: String(data?.code ?? ""),
    expiresInSeconds: Number(data?.expires_in_seconds ?? 300),
  };
}

/**
 * Exchange a device-link or administrator-issued code for a session in the
 * CURRENT container. The returned token hash is single-use and short-lived.
 */
export async function linkDeviceSession(code: string): Promise<void> {
  const client = requireAuthClient();
  const data = await invokeFunction(
    client,
    "link-session",
    { action: "exchange", code },
    z.object({ token_hash: z.string() }),
  );
  const tokenHash = String(data?.token_hash ?? "");
  if (!tokenHash) throw new Error("The sign-in code could not be exchanged");
  const { error: verifyError } = await client.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verifyError) throw verifyError;
}

/**
 * Self-service sign-in code: ask the server to mint and email a fresh
 * contributor code for this address. The server answers uniformly whether or
 * not the address has an account, so the screen never reveals which addresses
 * exist.
 */
export async function requestContributorSigninCode(
  email: string,
): Promise<void> {
  const client = requireAuthClient();
  await invokeFunction(client, "contributor-signin-code", {
    action: "request",
    email,
  });
}
