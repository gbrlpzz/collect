/**
 * Authentication configuration: the deployment's Supabase coordinates and the
 * single browser origin every sign-in return must use.
 *
 * Nothing here talks to the network. Keeping the environment reading in one
 * module means the rest of the auth code never re-derives an origin or a key.
 */

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL as string | undefined
)?.trim();
const rawKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined
)?.trim();
const configuredAppUrl = (
  import.meta.env.VITE_APP_URL as string | undefined
)?.trim();

export const supabaseUrl = rawUrl || undefined;
export const supabasePublishableKey = rawKey || undefined;
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

/** Namespace for per-deployment local storage (one device may host several). */
export const localBackendKey = supabaseUrl
  ? `supabase:${supabaseUrl}`
  : "preview";

/** App base path inside the single deployment (homepage at /, app at /app). */
export const appBasePath = import.meta.env.PROD ? "/app" : "/";

export function isLocalOrigin(origin: string): boolean {
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

/**
 * Where a sign-in returns.
 *
 * People are returned to the origin they are actually using. A deployment can
 * answer on more than one address — a canonical domain plus the platform
 * address that still hosts installed apps — and a session belongs to the
 * origin that started it: sending someone to the other address would sign
 * them in somewhere they were not.
 *
 * The configured application URL is the fallback for local development, where
 * a returned link could never be opened on a phone.
 */
export function authRedirectOrigin(): string {
  const currentOrigin =
    typeof window === "undefined" ? "" : window.location.origin;
  if (currentOrigin && !isLocalOrigin(currentOrigin)) return currentOrigin;
  if (!configuredAppUrl) return currentOrigin;
  try {
    const configuredOrigin = new URL(configuredAppUrl).origin;
    if (isLocalOrigin(configuredOrigin)) return currentOrigin;
    return configuredOrigin;
  } catch {
    return currentOrigin;
  }
}

/** The exact URL every provider, link, and invitation returns to. */
export function authReturnUrl(): string {
  return authRedirectOrigin() + appBasePath;
}

/** True when this deployment has no canonical origin of its own. */
export function hasConfiguredAppUrl(): boolean {
  return Boolean(configuredAppUrl);
}
