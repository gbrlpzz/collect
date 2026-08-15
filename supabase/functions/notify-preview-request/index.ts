import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/mail.ts";

// Notifies a maintainer inbox whenever someone submits the homepage
// "Request access" interest form. A Postgres trigger on preview_requests
// (see the matching migration) calls this function after every accepted
// insert, so the notification fires regardless of which client wrote the
// row. This is advisory only: it never feeds back into signup, RLS, or
// account provisioning, and its failure never blocks the insert (the
// trigger's HTTP call is fire-and-forget via pg_net).
//
// The destination address is deployment-specific, so it is read from
// PREVIEW_REQUEST_NOTIFY_TO rather than hardcoded: a self-hosted fork must
// configure its own inbox instead of silently emailing this project's
// maintainer.
serve(async (request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      {
        status: 405,
        headers: corsHeaders,
      },
    );
  }

  const expectedSecret = Deno.env.get("PREVIEW_REQUEST_WEBHOOK_SECRET");
  const providedSecret = request.headers.get("x-webhook-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifyTo = Deno.env.get("PREVIEW_REQUEST_NOTIFY_TO")?.trim();
  if (!notifyTo) {
    return json(
      { error: "PREVIEW_REQUEST_NOTIFY_TO is not configured" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email) {
      return json({ error: "Missing email" }, { status: 400 });
    }
    const organization =
      typeof body.organization === "string" && body.organization.trim()
        ? body.organization.trim()
        : null;
    const name = typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : null;
    const useCase = typeof body.use_case === "string" && body.use_case.trim()
      ? body.use_case.trim()
      : null;
    const source = typeof body.source === "string" && body.source.trim()
      ? body.source.trim()
      : "homepage";

    const lines = [
      `New preview access request from ${email}`,
      name ? `Name: ${name}` : null,
      organization ? `Organization: ${organization}` : null,
      `Source: ${source}`,
      useCase ? `\n${useCase}` : null,
    ].filter((line): line is string => Boolean(line));

    await sendEmail({
      to: notifyTo,
      subject: `New collect preview request — ${email}`,
      text: lines.join("\n"),
    });
    return json({ notified: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
