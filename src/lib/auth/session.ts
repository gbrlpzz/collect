import type { EmailOtpType, Session } from "@supabase/supabase-js";
import { supabase } from "./client";

let pendingInviteCallback = false;

function callbackParams(): URLSearchParams[] {
  if (!globalThis.window) return [];
  return [
    new URLSearchParams(globalThis.window.location.search),
    new URLSearchParams(globalThis.window.location.hash.replace(/^#/, "")),
  ];
}

function readCallbackValue(...keys: string[]): string {
  for (const params of callbackParams()) {
    for (const key of keys) {
      const value = params.get(key);
      if (value) return value;
    }
  }
  return "";
}

const supportedOtpTypes = [
  "email",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "signup",
] as const;

function isEmailOtpType(value: string | null): value is EmailOtpType {
  // SAFETY: supportedOtpTypes matches the Supabase EmailOtpType union.
  return (
    value !== null &&
    supportedOtpTypes.includes(value as (typeof supportedOtpTypes)[number])
  );
}

function tokenHashParams(): { tokenHash: string; type: EmailOtpType } | null {
  if (!globalThis.window) return null;
  const params = new URLSearchParams(globalThis.window.location.search);
  const tokenHash = params.get("token_hash");
  if (!tokenHash) return null;
  const requestedType = params.get("type");
  const type: EmailOtpType = isEmailOtpType(requestedType)
    ? requestedType
    : "email";
  return { tokenHash, type };
}

/** True when the address bar still carries a failed sign-in return. */
export function hasAuthCallbackError(): boolean {
  return Boolean(
    readCallbackValue("error_code", "error") ||
    readCallbackValue("error_description", "error_reason"),
  );
}

/**
 * Sign-in returns report failure in the callback URL: expired links, refused
 * provider consent, or a closed deployment. Keep this separate from session
 * parsing so the screen can explain what happened and offer the next action.
 */
export function authCallbackError(): string | null {
  const code = readCallbackValue("error_code", "error");
  const description = readCallbackValue("error_description", "error_reason");
  if (!code && !description) return null;

  const detail = `${code} ${description}`.toLowerCase();
  // A cancelled provider sheet is a decision, not a failure. Say nothing.
  if (detail.includes("access_denied") && !detail.includes("expired"))
    return null;
  if (detail.includes("signup") && detail.includes("disabled"))
    return "This deployment is not accepting new accounts. Ask your administrator for an invitation.";
  if (detail.includes("provider") && detail.includes("disabled"))
    return "That sign-in provider is not enabled for this deployment. Use another option below.";
  if (detail.includes("email") && detail.includes("verif"))
    return "That provider did not share a verified email address. Use another option below.";
  if (
    detail.includes("expired") ||
    detail.includes("otp_expired") ||
    detail.includes("invalid")
  )
    return "That one-time link expired or was already used. Request a new link below.";
  return "That sign-in could not be completed. Try again below.";
}

/**
 * Remove callback credentials and errors from the address bar after Supabase
 * has finished processing them. Access tokens and authorization codes belong
 * in the client session, never in a URL that stays visible or gets copied.
 */
export function clearAuthCallbackUrl(): void {
  if (!globalThis.window || !globalThis.window.history?.replaceState) return;
  const url = new URL(globalThis.window.location.href);
  const callbackKeys = new Set([
    "code",
    "token_hash",
    "error",
    "error_code",
    "error_description",
    "error_reason",
    "type",
    "provider_token",
    "provider_refresh_token",
  ]);
  for (const key of callbackKeys) url.searchParams.delete(key);
  url.hash = "";
  globalThis.window.history.replaceState(
    globalThis.window.history.state,
    document.title,
    `${url.pathname}${url.search}`,
  );
}

/** True when the current callback was a project invitation (type=invite). */
export function wasInviteCallback(): boolean {
  if (pendingInviteCallback) return true;
  return readCallbackValue("type") === "invite";
}

/**
 * Read the session, finishing whatever sign-in return is in the URL first:
 * a token hash (email link or device-link exchange) is verified here, while a
 * provider authorization code is exchanged by the client during start-up.
 */
export async function authSession(): Promise<{
  data: { session: Session | null };
  error: Error | null;
}> {
  if (!supabase) return { data: { session: null }, error: null };
  const tokenHash = tokenHashParams();
  if (tokenHash) {
    if (tokenHash.type === "invite") pendingInviteCallback = true;
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash.tokenHash,
      type: tokenHash.type,
    });
    // Token-hash callbacks are single-use credentials. Remove them whether
    // verification succeeded or returned an explicit Auth error.
    clearAuthCallbackUrl();
    return { data: { session: result.data.session }, error: result.error };
  }
  const result = await supabase.auth.getSession();
  // getSession waits for the client's URL detection (including the provider
  // code exchange) to finish. Only then is it safe to clean the address bar;
  // this preserves the implicit-flow fallback while ensuring expired or
  // refused returns never leave a token-shaped URL behind.
  if (result.data.session || hasAuthCallbackError()) clearAuthCallbackUrl();
  return result;
}
