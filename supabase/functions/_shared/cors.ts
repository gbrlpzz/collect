/**
 * Browser access control for every function.
 *
 * A deployment can be served from more than one origin — a canonical domain
 * plus the platform address that still hosts installed apps. APP_URL names the
 * canonical origin; APP_ALT_ORIGINS lists any others that must keep working,
 * comma separated. The response echoes the caller's origin when it is on that
 * list, so an installed app on the older address keeps syncing instead of
 * failing with an opaque CORS error.
 */
function allowedOrigins(): string[] {
  const values = [
    Deno.env.get("APP_URL") ?? "",
    ...(Deno.env.get("APP_ALT_ORIGINS") ?? "").split(","),
  ];
  return values
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter((value) => value.length > 0);
}

function allowOriginFor(request?: Request): string {
  const allowed = allowedOrigins();
  if (!allowed.length) return "*";
  const origin = request?.headers.get("Origin")?.trim().replace(/\/+$/, "");
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": allowOriginFor(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  Vary: "Origin",
};

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

export function options(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Serve a handler and stamp the caller-specific origin on whatever it
 * returned. Handlers keep building responses with `json()` and `options()`;
 * this is the single place that knows which origin asked.
 */
export function serve(
  handler: (request: Request) => Response | Promise<Response>,
): void {
  Deno.serve(async (request) => {
    const response = await handler(request);
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowOriginFor(request));
    headers.set("Vary", "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}
