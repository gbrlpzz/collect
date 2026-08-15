import { corsHeaders, json, options, serve } from "../_shared/cors.ts";

serve((request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return json({
    ok: true,
    service: "collect",
    checked_at: new Date().toISOString(),
  });
});
