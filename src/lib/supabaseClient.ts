import {
  createClient,
  type EmailOtpType,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { z } from "zod";
import { invokeFunction } from "./functionError";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
const configuredAppUrl = (
  import.meta.env.VITE_APP_URL as string | undefined
)?.trim();

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const localBackendKey = url ? `supabase:${url}` : "preview";
const pendingAuthEmailKey = `${localBackendKey}:pending-auth-email`;
let pendingInviteCallback = false;
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function isLocalOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

/** Keep magic links on the deployed app, never on localhost from a production build. */
export function authRedirectOrigin(): string {
  const currentOrigin =
    typeof window === "undefined" ? "" : window.location.origin;
  if (!configuredAppUrl) return currentOrigin;
  try {
    const configuredOrigin = new URL(configuredAppUrl).origin;
    if (isLocalOrigin(configuredOrigin) && !isLocalOrigin(currentOrigin))
      return currentOrigin;
    return configuredOrigin;
  } catch {
    return currentOrigin;
  }
}

function authCallbackParams(): URLSearchParams[] {
  if (typeof window === "undefined") return [];
  return [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.replace(/^#/, "")),
  ];
}

function authTokenHashParams(): {
  tokenHash: string;
  type: EmailOtpType;
} | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  if (!tokenHash) return null;
  const requestedType = params.get("type");
  const supportedTypes: EmailOtpType[] = [
    "email",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "signup",
  ];
  const type = supportedTypes.includes(requestedType as EmailOtpType)
    ? (requestedType as EmailOtpType)
    : "email";
  return { tokenHash, type };
}

/**
 * Supabase returns expired or already-used magic-link errors in the callback
 * URL. Keep this separate from session parsing so the UI can explain what
 * happened and offer a repeatable sign-in action.
 */
export function authCallbackError(): string | null {
  const params = authCallbackParams();
  const code =
    params
      .map((current) => current.get("error_code") ?? current.get("error"))
      .find(Boolean) ?? "";
  const description =
    params
      .map(
        (current) =>
          current.get("error_description") ?? current.get("error_reason"),
      )
      .find(Boolean) ?? "";
  if (!code && !description) return null;

  const detail = `${code} ${description}`.toLowerCase();
  if (
    detail.includes("expired") ||
    detail.includes("otp_expired") ||
    detail.includes("invalid")
  ) {
    return "That one-time link expired or was already used. Request a new link below.";
  }
  return "That sign-in link could not be used. Request a new one below.";
}

/**
 * Remove callback credentials and errors from the address bar after Supabase
 * has finished processing them. Access tokens belong in the client session,
 * never in a URL that remains visible or can be copied into another app.
 */
export function clearAuthCallbackUrl(): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  const callbackKeys = new Set([
    "code",
    "token_hash",
    "error",
    "error_code",
    "error_description",
    "error_reason",
    "type",
  ]);
  for (const key of callbackKeys) url.searchParams.delete(key);
  url.hash = "";
  window.history.replaceState(
    window.history.state,
    document.title,
    `${url.pathname}${url.search}`,
  );
}

/** True when this page is running as an installed PWA (home-screen app). */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
      standaloneNavigator.standalone,
  );
}

/**
 * Verify the six-digit code from the sign-in email. Unlike a magic link, the
 * code is typed into the current app, so it works identically in Safari and
 * in an installed PWA — the two storage containers iOS keeps separate.
 */
export async function verifySignInCode(
  email: string,
  code: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code.trim(),
    type: "email",
  });
  if (error) throw error;
}

/**
 * Password sign-in: works identically in every container (Safari, installed
 * PWA, desktop) with no email round-trip. This is the primary flow for
 * installed apps; the password is set once after the first magic-link or
 * invitation sign-in.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

/** Set (or change) the account password from the signed-in session. */
export async function setPassword(password: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/**
 * Mint a one-time device-link code for the signed-in web session. The code is
 * entered in another container (e.g. the installed PWA) to transfer the
 * session without email.
 */
export async function requestDeviceLinkCode(): Promise<{
  code: string;
  expiresInSeconds: number;
}> {
  if (!supabase) throw new Error("Supabase is not configured");
  const data = await invokeFunction(
    supabase,
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
 * Exchange a device-link code (shown on a signed-in web app) for a session in
 * the CURRENT container. The returned token_hash is single-use and short-lived.
 */
export async function linkDeviceSession(code: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const data = await invokeFunction(
    supabase,
    "link-session",
    { action: "exchange", code },
    z.object({ token_hash: z.string() }),
  );
  const tokenHash = String(data?.token_hash ?? "");
  if (!tokenHash) throw new Error("The sign-in code could not be exchanged");
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verifyError) throw verifyError;
}

/** True when the current callback was a project invitation (type=invite). */
export function wasInviteCallback(): boolean {
  if (pendingInviteCallback) return true;
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("type") === "invite" || hash.get("type") === "invite";
}

export function pendingAuthEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(pendingAuthEmailKey) ?? "";
  } catch {
    return "";
  }
}

export function rememberAuthEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(pendingAuthEmailKey, email);
  } catch {
    // Session storage is a convenience only; it must never block sign-in.
  }
}

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const emailRedirectTo = authRedirectOrigin();
  if (isLocalOrigin(emailRedirectTo) && !configuredAppUrl) {
    // A magic link that returns to localhost can only be opened in the same
    // browser that requested it — never on a phone or another device. This
    // instance has no VITE_APP_URL, so a link would be silently broken:
    // refuse to send it instead.
    throw new Error(
      "Sign-in links cannot be sent from this page: VITE_APP_URL is not set, so links would return to " +
        emailRedirectTo +
        ". Set VITE_APP_URL to the deployed app origin (see .env.example), or open the deployed app.",
    );
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Invite-only: accounts are created exclusively by an administrator
      // (project invitation or administrator invitation). The generic
      // sign-in screen must never create accounts by itself.
      shouldCreateUser: false,
      emailRedirectTo,
    },
  });
  if (error) throw error;
}

export async function authSession(): Promise<{
  data: { session: Session | null };
  error: Error | null;
}> {
  if (!supabase) return { data: { session: null }, error: null };
  const tokenHash = authTokenHashParams();
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
  // getSession waits for Supabase's URL detection to finish. Only then is it
  // safe to clean the fragment; this preserves the implicit-flow fallback
  // while ensuring expired/error callbacks never leave a token-shaped URL.
  if (result.data.session || authCallbackError()) clearAuthCallbackUrl();
  return result;
}
