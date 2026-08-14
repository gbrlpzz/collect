/**
 * Canonical deployed app origin for magic links, device-link tokens, and
 * reminder deep links. Every function reads it from APP_URL so a self-hosted
 * deployment never silently redirects users to another tenant's instance.
 * Failing loudly (rather than inventing a URL) matches the client-side
 * sendMagicLink guard, which refuses to send a broken link when VITE_APP_URL
 * is missing.
 */
function appOrigin(): string {
  const url = Deno.env.get("APP_URL")?.trim();
  if (!url) {
    throw new Response("APP_URL is not configured on this deployment", {
      status: 500,
    });
  }
  return url.replace(/\/+$/, "");
}

/**
 * The installed field app entry point. The single deployment serves the app
 * under /app (the marketing homepage lives at /), so every magic-link,
 * device-link, and reminder redirect must target /app to reach the surface
 * that actually processes the auth callback.
 */
export function appEntryUrl(): string {
  return `${appOrigin()}/app`;
}
