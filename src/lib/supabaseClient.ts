import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(url && publishableKey);
export const localBackendKey = url ? `supabase:${url}` : "preview";
const pendingAuthEmailKey = `${localBackendKey}:pending-auth-email`;
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function authCallbackParams(): URLSearchParams[] {
  if (typeof window === "undefined") return [];
  return [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.replace(/^#/, "")),
  ];
}

/**
 * Supabase returns expired or already-used magic-link errors in the callback
 * URL. Keep this separate from session parsing so the UI can explain what
 * happened and offer a repeatable sign-in action.
 */
export function authCallbackError(): string | null {
  const params = authCallbackParams();
  const code = params.map((current) => current.get("error_code") ?? current.get("error")).find(Boolean) ?? "";
  const description = params.map((current) => current.get("error_description") ?? current.get("error_reason")).find(Boolean) ?? "";
  if (!code && !description) return null;

  const detail = `${code} ${description}`.toLowerCase();
  if (detail.includes("expired") || detail.includes("otp_expired") || detail.includes("invalid")) {
    return "That one-time link expired or was already used. Request a new link below.";
  }
  return "That sign-in link could not be used. Request a new one below.";
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
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // The first workspace administrator may not have an existing account yet.
      // Project invitations still use the server-side admin invite flow.
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export function authSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
  if (!supabase) return Promise.resolve({ data: { session: null }, error: null });
  return supabase.auth.getSession();
}
