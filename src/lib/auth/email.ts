import { requireAuthClient } from "./client";
import {
  authReturnUrl,
  hasConfiguredAppUrl,
  isLocalOrigin,
  localBackendKey,
} from "./config";

const pendingAuthEmailKey = `${localBackendKey}:pending-auth-email`;

/** The address last typed on the sign-in screen, for a friendlier retry. */
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

/**
 * Password sign-in: works identically in every container (Safari, installed
 * PWA, desktop) with no email round-trip. The password is set once after a
 * link, invitation, or code sign-in.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<void> {
  const client = requireAuthClient();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

/** Set (or change) the account password from the signed-in session. */
export async function setPassword(password: string): Promise<void> {
  const client = requireAuthClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

import { rememberAuthRole } from "./providers";

/**
 * Email sign-in link. This is a backup path: it never creates an account, so
 * a stranger cannot spend the deployment's mail quota, and people who already
 * have an account can always get in without a provider.
 */
export async function sendMagicLink(
  email: string,
  role?: "admin" | "contributor",
): Promise<void> {
  const targetRole =
    role ??
    (typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("role") as
          | "admin"
          | "contributor"
          | null)
      : null);
  if (targetRole) {
    rememberAuthRole(targetRole);
  }
  const client = requireAuthClient();
  const emailRedirectTo = authReturnUrl(targetRole);
  if (isLocalOrigin(emailRedirectTo) && !hasConfiguredAppUrl()) {
    // A link that returns to localhost can only be opened in the same browser
    // that requested it — never on a phone or another device. This instance
    // has no VITE_APP_URL, so the link would be silently broken: refuse to
    // send it instead.
    throw new Error(
      "Sign-in links cannot be sent from this page: VITE_APP_URL is not set, so links would return to " +
        emailRedirectTo +
        ". Set VITE_APP_URL to the deployed app origin (see .env.example), or open the deployed app.",
    );
  }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      // New accounts come from a provider sign-in or an administrator
      // invitation. The link path only re-opens an account that exists.
      shouldCreateUser: false,
      emailRedirectTo,
    },
  });
  if (error) throw error;
}
