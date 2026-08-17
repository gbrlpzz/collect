import { z } from "zod";
import { isStandaloneApp } from "../platform";
import { requireAuthClient } from "./client";
import {
  authReturnUrl,
  localBackendKey,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

/**
 * Identity providers collect supports. Email stays the identifier: every
 * provider account is matched to its verified email address, so invitations,
 * memberships, and the administrator allow-list keep working unchanged.
 */
export const authProviders = ["google", "apple"] as const;
export type AuthProvider = (typeof authProviders)[number];

export const authProviderLabel = {
  google: "Google",
  apple: "Apple",
} as const satisfies Record<AuthProvider, string>;

const providerCacheKey = `${localBackendKey}:auth-providers`;
const settingsTimeoutMs = 6000;

function readCachedProviders(): AuthProvider[] | null {
  if (!globalThis.window) return null;
  try {
    const raw = globalThis.window.sessionStorage.getItem(providerCacheKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return authProviders.filter((provider) => parsed.includes(provider));
  } catch {
    return null;
  }
}

function writeCachedProviders(providers: AuthProvider[]): void {
  if (!globalThis.window) return;
  try {
    globalThis.window.sessionStorage.setItem(
      providerCacheKey,
      JSON.stringify(providers),
    );
  } catch {
    // The cache is a convenience only; it must never block sign-in.
  }
}

function configuredProviders(): AuthProvider[] | null {
  // SAFETY: Vite injects build-time environment variables as strings or undefined.
  const raw = (
    import.meta.env.VITE_AUTH_PROVIDERS as string | undefined
  )?.trim();
  if (raw === undefined || raw === "") return null;
  const requested = raw
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim());
  return authProviders.filter((provider) => requested.includes(provider));
}

let inFlight: Promise<AuthProvider[]> | null = null;

const settingsResponseSchema = z.object({
  external: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Ask the deployment which providers are actually enabled. Supabase publishes
 * this on its public settings endpoint, so the sign-in screen never offers a
 * button that would return "provider is not enabled", and a deployment that
 * turns Google or Apple on needs no front-end release.
 */
export async function enabledAuthProviders(): Promise<AuthProvider[]> {
  const configured = configuredProviders();
  if (configured) return configured;
  if (!supabaseUrl || !supabasePublishableKey) return [];
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settingsTimeoutMs);
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: supabasePublishableKey },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("settings unavailable");
      const json: unknown = await response.json();
      const parsed = settingsResponseSchema.safeParse(json);
      const external = parsed.success ? (parsed.data.external ?? {}) : {};
      const available = authProviders.filter(
        (provider) => external[provider] === true,
      );
      writeCachedProviders(available);
      return available;
    } catch {
      // Offline or blocked: fall back to what this browser last saw rather
      // than hiding every provider button.
      return readCachedProviders() ?? [];
    } finally {
      clearTimeout(timer);
    }
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Providers this browser already knows about, without waiting for network. */
export function knownAuthProviders(): AuthProvider[] {
  return configuredProviders() ?? readCachedProviders() ?? [];
}

const pendingAuthRoleKey = `${localBackendKey}:pending-auth-role`;

export function rememberAuthRole(role: "admin" | "contributor" | null): void {
  if (!globalThis.window) return;
  try {
    if (role) {
      globalThis.window.sessionStorage.setItem(pendingAuthRoleKey, role);
    } else {
      globalThis.window.sessionStorage.removeItem(pendingAuthRoleKey);
    }
  } catch {
    // Session storage is a convenience only; it must never block sign-in.
  }
}

export function consumePendingAuthRole(): "admin" | "contributor" | null {
  if (!globalThis.window) return null;
  try {
    const role = globalThis.window.sessionStorage.getItem(pendingAuthRoleKey);
    if (role) {
      globalThis.window.sessionStorage.removeItem(pendingAuthRoleKey);
    }
    return role === "admin" || role === "contributor" ? role : null;
  } catch {
    return null;
  }
}

function parseRoleQuery(param: string | null): "admin" | "contributor" | null {
  if (param === "admin" || param === "contributor") return param;
  return null;
}

/**
 * Start a provider sign-in. The browser leaves for the provider and returns to
 * the app entry URL with an authorization code, which the client exchanges for
 * a session. No email is sent, so this path has no mail quota to exhaust.
 */
export async function signInWithProvider(
  provider: AuthProvider,
  role?: "admin" | "contributor",
): Promise<void> {
  const targetRole =
    role ??
    (globalThis.window
      ? parseRoleQuery(
          new URLSearchParams(globalThis.window.location.search).get("role"),
        )
      : null);
  if (targetRole) {
    rememberAuthRole(targetRole);
  }
  const client = requireAuthClient();
  const standalone = isStandaloneApp();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authReturnUrl(targetRole),
      // Let people pick the account instead of silently reusing the last one;
      // shared field devices are common.
      queryParams:
        provider === "google" ? { prompt: "select_account" } : undefined,
      skipBrowserRedirect: standalone,
    },
  });
  if (error) throw error;
  if (standalone && data?.url && globalThis.window) {
    // In standalone iOS PWA, navigate out to system Safari so Google OAuth
    // does not fail with 403 disallowed_useragent in the standalone webview.
    globalThis.window.open(data.url, "_blank", "noopener,noreferrer");
  }
}
