/**
 * Canonical deployed app origin for magic links, device-link tokens, and
 * reminder deep links. Every function reads it from APP_URL so a self-hosted
 * deployment never silently redirects users to another tenant's instance.
 * Failing loudly (rather than inventing a URL) matches the client-side
 * sendMagicLink guard, which refuses to send a broken link when VITE_APP_URL
 * is missing.
 */
export function appUrl(): string {
  const url = Deno.env.get("APP_URL")?.trim();
  if (!url) {
    throw new Response("APP_URL is not configured on this deployment", {
      status: 500,
    });
  }
  return url;
}
