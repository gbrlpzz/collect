import type { FieldDefinition, Project } from "../types";
import { supabase } from "./supabaseClient";

export const defaultOrganizationName =
  (
    (import.meta.env.VITE_ORGANIZATION_NAME as string | undefined) ??
    "Field organization"
  ).trim() || "Field organization";

export interface NewProjectInput {
  organizationName: string;
  name: string;
  description: string;
  instructions: string;
  fields: FieldDefinition[];
  emails: string[];
}

export interface ContributorReadiness {
  id: string;
  email: string;
  status: string;
  ready: boolean;
  pending: number;
  lastSeen: string | null;
  received: number;
  attentionScore: number | null;
  attentionChecksTotal: number | null;
  attentionCorrectTotal: number | null;
  consentGranted: boolean;
}

import { invokeFunction, readFunctionErrorBody } from "./functionError";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function readableFunctionError(
  error: unknown,
  fallback: string,
): Promise<Error> {
  const context =
    error && typeof error === "object"
      ? (error as { context?: unknown }).context
      : null;
  if (
    context &&
    typeof context === "object" &&
    "clone" in context &&
    typeof (context as { clone?: unknown }).clone === "function"
  ) {
    try {
      const body = (await (context as Response).clone().json()) as {
        error?: unknown;
      };
      if (typeof body.error === "string" && body.error.trim())
        return new Error(body.error);
    } catch {
      // Use the safe, user-facing fallback below when the response is not JSON.
    }
  }
  return new Error(fallback);
}

export async function bootstrapWorkspace(
  name: string,
): Promise<{ id: string; name: string }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("bootstrap-workspace", {
    body: { organization_name: name.trim() || defaultOrganizationName },
  });
  if (error)
    throw await readableFunctionError(
      error,
      "The first workspace could not be created",
    );
  if (!data?.organization_id)
    throw new Error("The first workspace could not be created");
  return {
    id: data.organization_id,
    name: data.organization_name ?? (name.trim() || defaultOrganizationName),
  };
}

function projectFromRemote(
  row: Record<string, any>,
  organization: Record<string, any>,
  schema: Record<string, any> | null,
  contributorCount: number,
  completeSubmissions: number,
  lastReceived: string,
): Project {
  const fields = Array.isArray(schema?.schema_json?.fields)
    ? (schema.schema_json.fields as FieldDefinition[])
    : [];
  return {
    id: row.id,
    organizationId: organization.id,
    organization: organization.name,
    organizationMark: String(organization.name ?? "O")
      .slice(0, 1)
      .toUpperCase(),
    name: row.name,
    description: row.description ?? "",
    instructions: row.instructions ?? "",
    status: row.status === "closed" ? "closed" : "active",
    schemaVersion: Number(schema?.version ?? 1),
    schemaId: schema?.id,
    contributors: contributorCount,
    completeSubmissions,
    lastReceived,
    fields,
  };
}

async function hydrateProject(
  client: ReturnType<typeof requireClient>,
  row: Record<string, any>,
): Promise<Project | null> {
  const [
    { data: organization },
    { data: schema },
    { count: contributorCount },
    { count: completeSubmissions },
    { data: latest },
  ] = await Promise.all([
    client
      .from("organizations")
      .select("id,name,logo_path")
      .eq("id", row.organization_id)
      .maybeSingle(),
    client
      .from("project_schemas")
      .select("id,version,schema_json")
      .eq("project_id", row.id)
      .not("published_at", "is", null)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("project_members")
      .select("user_id", { count: "exact", head: true })
      .eq("project_id", row.id),
    client
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", row.id)
      .eq("status", "COMPLETE"),
    client
      .from("submissions")
      .select("server_received_at")
      .eq("project_id", row.id)
      .eq("status", "COMPLETE")
      .order("server_received_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!organization || !schema) return null;
  return projectFromRemote(
    row,
    organization,
    schema,
    contributorCount ?? 0,
    completeSubmissions ?? 0,
    latest?.server_received_at
      ? new Date(latest.server_received_at).toLocaleString()
      : "No submissions yet",
  );
}

export async function loadAssignedProjects(): Promise<Project[] | null> {
  const client = requireClient();
  const { data: projects, error } = await client
    .from("projects")
    .select("id,organization_id,name,description,instructions,status")
    .order("created_at", { ascending: false });
  if (error) return null;
  if (!projects?.length) return [];
  const hydrated = await Promise.all(
    (projects as Record<string, any>[]).map((row) =>
      hydrateProject(client, row),
    ),
  );
  return hydrated.filter((project): project is Project => Boolean(project));
}

export async function loadAssignedProject(): Promise<Project | null> {
  return (await loadAssignedProjects())?.[0] ?? null;
}

export async function loadUserAdminAccess(): Promise<boolean> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return false;
  const [{ data: orgAdmin }, { data: projectAdmin }] = await Promise.all([
    client
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle(),
    client
      .from("project_members")
      .select("project_id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle(),
  ]);
  return Boolean(orgAdmin) || Boolean(projectAdmin);
}

export async function createRemoteProject(
  input: NewProjectInput,
): Promise<Project> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user)
    throw new Error("Authentication is required to create a project");
  const { data: membership } = await client
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  let organizationId = membership?.organization_id as string | undefined;
  let organizationName = defaultOrganizationName;
  if (!organizationId) {
    const organization = await bootstrapWorkspace(input.organizationName);
    organizationId = organization.id;
    organizationName = organization.name;
  } else {
    const { data: organization } = await client
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();
    organizationName = organization?.name ?? defaultOrganizationName;
  }
  // No .select() here: INSERT ... RETURNING re-applies the SELECT policy, whose
  // membership check cannot see the just-inserted row in the same statement.
  // The id is client-generated (stable identity), inserted first, then read
  // back in a separate statement.
  const projectId = crypto.randomUUID();
  const { error: projectError } = await client.from("projects").insert({
    id: projectId,
    organization_id: organizationId,
    name: input.name.trim() || "Untitled field project",
    description: input.description,
    instructions: input.instructions,
    created_by: userData.user.id,
  });
  if (projectError) throw new Error("Project could not be created");
  const { data: project, error: projectReadError } = await client
    .from("projects")
    .select("id,name,description,instructions,status,organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectReadError || !project)
    throw new Error("Project could not be created");
  const schemaId = crypto.randomUUID();
  const schemaJson = {
    schema_id: schemaId,
    version: 1,
    project_id: project.id,
    published_at: new Date().toISOString(),
    fields: input.fields,
  };
  const { error: schemaError } = await client.from("project_schemas").insert({
    id: schemaId,
    project_id: project.id,
    version: 1,
    schema_json: schemaJson,
    published_at: new Date().toISOString(),
    published_by: userData.user.id,
  });
  if (schemaError) throw new Error("Schema could not be published");
  for (const email of input.emails) {
    if (!email.trim()) continue;
    const response = await client.functions.invoke("send-project-invite", {
      body: { project_id: project.id, email: email.trim() },
    });
    if (response.error) throw response.error;
  }
  return (
    (await loadAssignedProjects())?.find(
      (candidate) => candidate.id === project.id,
    ) ??
    projectFromRemote(
      project,
      { id: organizationId, name: organizationName },
      { id: schemaId, version: 1, schema_json: schemaJson },
      input.emails.length,
      0,
      "No submissions yet",
    )
  );
}

export async function createCheckpoint(
  projectId: string,
): Promise<{ checkpointId: string; downloadUrl: string | null }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("export-checkpoint", {
    body: { project_id: projectId },
  });
  if (error) throw error;
  return {
    checkpointId: data.checkpoint_id,
    downloadUrl: data.download_url ?? null,
  };
}

export async function cloneSchemaDraft(project: Project): Promise<void> {
  const client = requireClient();
  const nextVersion = project.schemaVersion + 1;
  const schemaId = crypto.randomUUID();
  const schemaJson = {
    schema_id: schemaId,
    version: nextVersion,
    project_id: project.id,
    published_at: null,
    fields: project.fields,
  };
  const { error } = await client.from("project_schemas").insert({
    id: schemaId,
    project_id: project.id,
    version: nextVersion,
    schema_json: schemaJson,
    published_at: null,
  });
  if (error) throw error;
}

export interface SchemaDraft {
  id: string;
  version: number;
  projectId: string;
  fields: FieldDefinition[];
}

export async function createSchemaDraft(
  project: Project,
): Promise<SchemaDraft> {
  const client = requireClient();
  const nextVersion = project.schemaVersion + 1;
  const { data: existing } = await client
    .from("project_schemas")
    .select("id,version,schema_json")
    .eq("project_id", project.id)
    .eq("version", nextVersion)
    .maybeSingle();
  if (existing)
    return {
      id: existing.id,
      version: existing.version,
      projectId: project.id,
      fields: existing.schema_json?.fields ?? project.fields,
    };
  const schemaId = crypto.randomUUID();
  const schemaJson = {
    schema_id: schemaId,
    version: nextVersion,
    project_id: project.id,
    published_at: null,
    fields: project.fields,
  };
  const { error } = await client.from("project_schemas").insert({
    id: schemaId,
    project_id: project.id,
    version: nextVersion,
    schema_json: schemaJson,
    published_at: null,
  });
  if (error) throw error;
  return {
    id: schemaId,
    version: nextVersion,
    projectId: project.id,
    fields: project.fields,
  };
}

export async function publishSchemaDraft(draft: SchemaDraft): Promise<void> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user)
    throw new Error("Authentication is required to publish a schema");
  const schemaJson = {
    schema_id: draft.id,
    version: draft.version,
    project_id: draft.projectId,
    published_at: new Date().toISOString(),
    fields: draft.fields,
  };
  const { error } = await client
    .from("project_schemas")
    .update({
      schema_json: schemaJson,
      published_at: new Date().toISOString(),
      published_by: userData.user.id,
    })
    .eq("id", draft.id)
    .is("published_at", null);
  if (error) throw error;
}

/**
 * Invite a new workspace administrator. Account creation and membership are
 * handled server-side by the send-admin-invite function; the generic sign-in
 * screen can never create accounts.
 */
export async function inviteAdministrator(email: string): Promise<void> {
  const client = requireClient();
  await invokeFunction(client, "send-admin-invite", { email });
}

export async function sendProjectInvite(
  projectId: string,
  email: string,
  role: "contributor" | "admin" = "contributor",
): Promise<void> {
  const client = requireClient();
  const { error } = await client.functions.invoke("send-project-invite", {
    body: { project_id: projectId, email, role },
  });
  if (error) throw error;
}

export async function sendProjectPing(
  projectId: string,
  contributorId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.functions.invoke("send-project-ping", {
    body: { project_id: projectId, contributor_id: contributorId },
  });
  if (error) throw error;
}

export async function updateProjectStatus(
  projectId: string,
  status: "active" | "closed",
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from("projects")
    .update({ status })
    .eq("id", projectId);
  if (error) throw error;
}

export async function loadProjectReadiness(
  projectId: string,
): Promise<ContributorReadiness[]> {
  const client = requireClient();
  const [{ data: members }, { data: invites }, { data: statuses }] =
    await Promise.all([
      client
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId),
      client
        .from("project_invites")
        .select("email,invited_user_id,status")
        .eq("project_id", projectId),
      client
        .from("device_project_status")
        .select(
          "contributor_id,last_seen_at,last_sync_success_at,pending_submissions,pending_media,fieldwork_complete",
        )
        .eq("project_id", projectId)
        .order("last_seen_at", { ascending: false }),
    ]);
  const memberIds = (members ?? []).map(
    (member: { user_id: string }) => member.user_id,
  );
  const { data: profiles } = memberIds.length
    ? await client
        .from("contributor_profiles")
        .select(
          "user_id,attention_score,attention_checks_total,attention_correct_total,consent_granted_at,consent_revoked_at",
        )
        .in("user_id", memberIds)
    : { data: [] };
  return (members ?? []).map((member: { user_id: string }) => {
    const invite = (invites ?? []).find(
      (candidate: { invited_user_id: string | null }) =>
        candidate.invited_user_id === member.user_id,
    );
    const profile = (profiles ?? []).find(
      (candidate: { user_id: string }) => candidate.user_id === member.user_id,
    );
    // A contributor can run the web app and an installed PWA on the same
    // phone, each with its own device row. Readiness must hold across every
    // device: one empty device must not mask pending work on another.
    const devices = (statuses ?? []).filter(
      (candidate: { contributor_id: string }) =>
        candidate.contributor_id === member.user_id,
    );
    const pending = devices.reduce(
      (total, device) =>
        total +
        Number(device.pending_submissions ?? 0) +
        Number(device.pending_media ?? 0),
      0,
    );
    const lastSeen = devices.length
      ? devices.reduce(
          (latest, device) =>
            device.last_seen_at && (!latest || device.last_seen_at > latest)
              ? device.last_seen_at
              : latest,
          null as string | null,
        )
      : null;
    // Readiness is automatic: every known device must have reported a clean
    // state (durable outbox empty, fieldwork marked complete by the client
    // heartbeat). Contributors never press a separate “finished syncing”
    // control just to make an already-empty queue visible to admins.
    const ready =
      devices.length > 0 &&
      devices.every(
        (device) =>
          Boolean(device.fieldwork_complete) &&
          Number(device.pending_submissions ?? 0) === 0 &&
          Number(device.pending_media ?? 0) === 0,
      );
    return {
      id: member.user_id,
      email: invite?.email ?? `Contributor ${member.user_id.slice(0, 6)}`,
      status: ready
        ? "Ready"
        : lastSeen
          ? `${pending} pending · last seen ${new Date(lastSeen).toLocaleString()}`
          : "No status reported",
      ready,
      pending,
      lastSeen,
      received: 0,
      attentionScore: profile?.attention_score ?? null,
      attentionChecksTotal: profile?.attention_checks_total ?? null,
      attentionCorrectTotal: profile?.attention_correct_total ?? null,
      consentGranted: profile?.consent_granted_at
        ? !profile.consent_revoked_at
        : false,
    };
  });
}
