// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The sign-in screen must offer exactly the providers a deployment enables.
 * Supabase publishes that fact; asking it removes the drift between what the
 * screen shows and what the server accepts.
 */
const settingsUrl = "https://project.example.co/auth/v1/settings";

async function loadProviders() {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.example.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("VITE_AUTH_PROVIDERS", "");
  return await import("../src/lib/auth/providers");
}

describe("provider discovery", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("offers only the providers the deployment reports", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ external: { google: true, apple: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { enabledAuthProviders, knownAuthProviders } = await loadProviders();
    expect(await enabledAuthProviders()).toEqual(["google"]);
    expect(fetchMock.mock.calls[0][0]).toBe(settingsUrl);
    // A second visit in the same session needs no round trip.
    expect(knownAuthProviders()).toEqual(["google"]);
  });

  it("keeps the last known providers when the deployment is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ external: { google: true, apple: true } }),
      }),
    );
    const first = await loadProviders();
    expect(await first.enabledAuthProviders()).toEqual(["google", "apple"]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const second = await loadProviders();
    expect(await second.enabledAuthProviders()).toEqual(["google", "apple"]);
  });

  it("offers nothing when the deployment enables no provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ external: { email: true } }),
      }),
    );
    const { enabledAuthProviders } = await loadProviders();
    expect(await enabledAuthProviders()).toEqual([]);
  });

  it("stores and consumes pending auth role across OAuth redirects", async () => {
    const { rememberAuthRole, consumePendingAuthRole } = await loadProviders();
    expect(consumePendingAuthRole()).toBeNull();

    rememberAuthRole("admin");
    expect(consumePendingAuthRole()).toBe("admin");
    // Once consumed, it is cleared from storage so it does not leak into later logins.
    expect(consumePendingAuthRole()).toBeNull();
  });
});
