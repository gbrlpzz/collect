import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Supabase server configuration is incomplete");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireUser(
  request: Request,
): Promise<{ user: User; service: SupabaseClient }> {
  const token = request.headers.get("Authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) throw new Response("Authentication required", { status: 401 });
  const service = serviceClient();
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user) {
    throw new Response("Authentication required", { status: 401 });
  }
  return { user: data.user, service };
}

export async function projectAccess(
  service: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<{ project: Record<string, unknown>; admin: boolean } | null> {
  const { data: project, error: projectError } = await service
    .from("projects")
    .select("id,organization_id,status")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError || !project) return null;

  const { data: organizationMembership } = await service
    .from("organization_members")
    .select("role")
    .eq("organization_id", project.organization_id)
    .eq("user_id", userId)
    .maybeSingle();
  const { data: projectMembership } = await service
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  const admin = organizationMembership?.role === "admin" ||
    projectMembership?.role === "admin";
  if (!admin && !projectMembership) return null;
  return { project, admin };
}

/**
 * Optional administrator allow-list. When ALLOWED_EMAIL_PATTERNS is set (a
 * comma-separated list of exact addresses and/or @domain suffixes), only
 * matching emails may be invited as administrators. Contributor invitations
 * are unrestricted: admins invite whoever they need. Unset = any address may
 * become an administrator (the default for self-hosted deployments).
 */
export function isEmailAllowed(email: string): boolean {
  const raw = Deno.env.get("ALLOWED_EMAIL_PATTERNS")?.trim();
  if (!raw) return true;
  const address = email.trim().toLowerCase();
  return raw.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean).some((pattern) => {
    if (pattern.startsWith("@")) return address.endsWith(pattern);
    return address === pattern;
  });
}

export function errorMessage(error: unknown): string {
  // Fixed, non-sensitive strings only: raw Error.message can leak internal
  // details to clients. The operation itself is reported; specifics are never.
  if (error instanceof Response) return "Request could not be completed";
  return "Request could not be completed";
}
