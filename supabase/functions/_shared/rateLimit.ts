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
