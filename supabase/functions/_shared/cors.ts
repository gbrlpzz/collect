/**
 * Browser access control for every function.
 *
 * A deployment can be served from more than one origin — a canonical domain
 * plus the platform address that still hosts installed apps. APP_URL names the
 * canonical origin; APP_ALT_ORIGINS lists any others that must keep working,
 * comma separated. The response echoes the caller's origin when it is on that
 * list, so an installed app on the older address keeps syncing instead of
 * failing with an opaque CORS error. With no origin configured the functions
 * fail closed: no cross-origin browser access is granted at all.
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

function allowOriginFor(request?: Request): string | null {
  const allowed = allowedOrigins();
  if (!allowed.length) return null;
  const origin = request?.headers.get("Origin")?.trim().replace(/\/+$/, "");
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
}

function corsHeaderRecord(origin: string | null) {
  const headers = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    Vary: "Origin",
  };
  if (origin) {
    return { ...headers, "Access-Control-Allow-Origin": origin };
  }
  return headers;
}

export const corsHeaders = corsHeaderRecord(allowOriginFor());

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export function json(body: JsonValue, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
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
    const origin = allowOriginFor(request);
    if (origin) headers.set("Access-Control-Allow-Origin", origin);
    else headers.delete("Access-Control-Allow-Origin");
    headers.set("Vary", "Origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}
