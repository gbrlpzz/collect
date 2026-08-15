import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/mail.ts";

const previewNotifySchema = z.object({
  email: z.string().min(1),
  name: z.string().nullable().optional(),
  organization: z.string().nullable().optional(),
  use_case: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

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
    const rawJson = await request.json().catch(() => ({}));
    const parsed = previewNotifySchema.safeParse(rawJson);
    if (!parsed.success) {
      return json({ error: "Missing email" }, { status: 400 });
    }
    const { email, name, organization, use_case, source } = parsed.data;

    const lines = [
      `New preview access request from ${email.trim()}`,
      name?.trim() ? `Name: ${name.trim()}` : null,
      organization?.trim() ? `Organization: ${organization.trim()}` : null,
      `Source: ${source?.trim() || "homepage"}`,
      use_case?.trim() ? `\n${use_case.trim()}` : null,
    ].filter((line): line is string => Boolean(line));

    await sendEmail({
      to: notifyTo,
      subject: `New collect preview request — ${email.trim()}`,
      text: lines.join("\n"),
    });
    return json({ notified: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
