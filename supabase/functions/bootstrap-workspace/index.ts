import { z } from "npm:zod@4.4.3";
import { corsHeaders, json, options, serve } from "../_shared/cors.ts";
import { errorMessage, isEmailAllowed, requireUser } from "../_shared/auth.ts";

function configuredBootstrapEmail(): string | null {
  const value = Deno.env.get("BOOTSTRAP_ADMIN_EMAIL")?.trim().toLowerCase();
  return value || null;
}

const bootstrapSchema = z.object({
  organization_name: z.string().min(1).max(160),
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

  try {
    const { user, service } = await requireUser(request);
    const email = user.email?.trim().toLowerCase() ?? "";
    const bootstrapEmail = configuredBootstrapEmail();
    if (bootstrapEmail && email !== bootstrapEmail) {
      return json(
        {
          error: "This account is not configured as the first administrator",
        },
        { status: 403 },
      );
    }
    // Anyone may create a contributor account, so the first workspace must
    // stay behind the administrator allow-list wherever one is configured.
    if (!(await isEmailAllowed(service, email))) {
      return json(
        {
          error: "This account is not on the administrator allow-list",
        },
        { status: 403 },
      );
    }

    const rawJson = await request.json().catch(() => ({}));
    const parsed = bootstrapSchema.safeParse(rawJson);
    if (!parsed.success) {
      return json(
        {
          error: "A workspace name between 1 and 160 characters is required",
        },
        { status: 400 },
      );
    }
    const organizationName = parsed.data.organization_name.trim();

    const { data, error } = await service.rpc("bootstrap_organization", {
      target_name: organizationName,
      target_user: user.id,
    });
    if (error) {
      if (/workspace already exists/i.test(error.message)) {
        return json(
          {
            error:
              "This deployment already has a workspace. Ask an existing administrator to grant this account admin access.",
          },
          { status: 409 },
        );
      }
      return json(
        { error: "The first workspace could not be created" },
        {
          status: 500,
        },
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.organization_id) {
      return json(
        { error: "The first workspace could not be created" },
        {
          status: 500,
        },
      );
    }
    return json({
      organization_id: row.organization_id,
      organization_name: row.organization_name,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: errorMessage(error) }, { status: 500 });
  }
});
