import type { SupabaseClient } from "npm:@supabase/supabase-js@2.112.2";
import { sha256 } from "./hash.ts";

/**
 * Increment the shared per-source-IP request budget and report whether the
 * caller is still allowed. This is the effective control for both the
 * anonymous self-service sign-in-code request and the sign-in-code exchange:
 * a code's hash cannot be known without the code itself, so per-code attempt
 * counters can never observe a wrong guess.
 */
export async function bumpIpRateLimit(
  request: Request,
  service: SupabaseClient,
): Promise<boolean> {
  // The rightmost entry is appended by the proxy closest to this function
  // (the platform gateway). Earlier entries are client-controlled and can be
  // forged to rotate the bucket; the last hop is the one we can trust.
  const ip = request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    "";
  const { data: allowed } = await service
    .rpc("bump_signin_code_request", { p_ip_hash: await sha256(ip) })
    .maybeSingle();
  return allowed !== false;
}

/**
 * Per-administrator budget for minting sign-in codes. Generous by design
 * (onboarding a roster is a burst of legitimate mints) but bounded, so a
 * compromised administrator session cannot mint codes without limit. Uses
 * the same throttling table under a distinct hashed key; 60 codes per hour.
 */
export async function bumpAdminMintLimit(
  service: SupabaseClient,
  adminUserId: string,
): Promise<boolean> {
  const key = await sha256(`admin-code-mint:${adminUserId}`);
  const { data: allowed } = await service
    .rpc("bump_signin_code_request", {
      p_ip_hash: key,
      p_window_minutes: 60,
      p_max_requests: 60,
    })
    .maybeSingle();
  return allowed !== false;
}
