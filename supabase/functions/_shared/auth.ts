import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2.112.3";

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
  const token = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "");
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
): Promise<
  {
    project: { id: string; organization_id: string; status: string };
    admin: boolean;
  } | null
> {
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

function matchesAllowedPattern(pattern: string, email: string): boolean {
  const candidate = pattern.trim().toLowerCase();
  const address = email.trim().toLowerCase();
  if (candidate.startsWith("@")) return address.endsWith(candidate);
  return address === candidate;
}

/**
 * The configured administrator patterns, or an empty list when the deployment
 * has none. The ALLOWED_EMAIL_PATTERNS secret takes precedence over the table.
 */
export async function adminAllowPatterns(
  service: SupabaseClient,
): Promise<string[]> {
  const raw = Deno.env.get("ALLOWED_EMAIL_PATTERNS")?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  const { data } = await service.rpc("list_allowed_admin_patterns");
  interface PatternRow {
    pattern?: string;
  }
  // SAFETY: RPC list_allowed_admin_patterns returns PatternRow[] array.
  const rows = (Array.isArray(data) ? data : []) as PatternRow[];
  return rows
    .map((row) => String(row.pattern ?? ""))
    .filter((pattern) => pattern.length > 0);
}

/** True when the secret holds the allow-list, so the table cannot be edited. */
export function allowListIsEnvironmentManaged(): boolean {
  return Boolean(Deno.env.get("ALLOWED_EMAIL_PATTERNS")?.trim());
}

/**
 * Strict allow-list test used to GRANT administrator access, never merely to
 * permit an invitation. A deployment with no configured pattern grants nobody:
 * anyone may create a contributor account, so a permissive default here would
 * hand the workspace to the next stranger who signs in.
 */
export async function isEmailExplicitlyAllowed(
  service: SupabaseClient,
  email: string,
): Promise<boolean> {
  const patterns = await adminAllowPatterns(service);
  if (!patterns.length) return false;
  return patterns.some((pattern: string) =>
    matchesAllowedPattern(pattern, email)
  );
}

export function errorMessage(
  error: Error | Response | unknown | null | undefined,
): string {
  // Fixed, non-sensitive strings only: raw Error.message can leak internal
  // details to clients. The operation itself is reported; specifics are never.
  if (error instanceof Response) return "Request could not be completed";
  return "Request could not be completed";
}
