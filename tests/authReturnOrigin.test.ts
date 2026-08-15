// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A deployment can answer on several origins. A session belongs to the origin
 * that started it, so a sign-in must return to the address the person is
 * actually using — never to another one where they would not be signed in.
 */
async function loadConfig(appUrl?: string) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.example.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("VITE_APP_URL", appUrl ?? "");
  return await import("../src/lib/auth/config");
}

function serveFrom(origin: string) {
  const url = new URL(origin);
  vi.stubGlobal("window", {
    ...window,
    location: { ...window.location, origin, hostname: url.hostname },
  });
}

describe("sign-in return origin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns to the canonical domain when that is where the app was opened", async () => {
    serveFrom("https://collect.example.org");
    const { authRedirectOrigin, authReturnUrl } = await loadConfig(
      "https://collect.vercel.example",
    );
    expect(authRedirectOrigin()).toBe("https://collect.example.org");
    expect(authReturnUrl().startsWith("https://collect.example.org")).toBe(
      true,
    );
  });

  it("returns to the second served origin instead of moving the session", async () => {
    serveFrom("https://collect.vercel.example");
    const { authRedirectOrigin } = await loadConfig(
      "https://collect.example.org",
    );
    expect(authRedirectOrigin()).toBe("https://collect.vercel.example");
  });

  it("uses the deployed address when the page itself is local", async () => {
    serveFrom("http://localhost:5173");
    const { authRedirectOrigin } = await loadConfig(
      "https://collect.example.org",
    );
    expect(authRedirectOrigin()).toBe("https://collect.example.org");
  });

  it("stays local when no deployed address is configured", async () => {
    serveFrom("http://localhost:5173");
    const { authRedirectOrigin } = await loadConfig("");
    expect(authRedirectOrigin()).toBe("http://localhost:5173");
  });
});
