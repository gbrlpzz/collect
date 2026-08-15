import { z } from "zod";
import type { FieldDefinition, Project } from "../types";
import { supabase } from "./supabaseClient";

// SAFETY: Vite injects build-time environment variables as strings or undefined.
const envOrgName = (
  import.meta.env.VITE_ORGANIZATION_NAME as string | undefined
)?.trim();
export const defaultOrganizationName = envOrgName || "Field organization";

export interface NewProjectInput {
  organizationName: string;
  name: string;
  description: string;
  instructions: string;
  fields: FieldDefinition[];
  emails: string[];
  license?: string;
  contactEmail?: string;
  datasetIdentifier?: string;
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
  /** Row represents a pending invitation the contributor has not claimed. */
  invitedOnly?: boolean;
}

import { invokeFunction, readFunctionErrorBody } from "./functionError";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

async function readableFunctionError(
  error: Error | { context?: Response } | null | undefined,
  fallback: string,
): Promise<Error> {
  const message = await readFunctionErrorBody(error);
  return new Error(message ?? fallback);
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

interface ProjectOverviewRow {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  description: string | null;
  instructions: string | null;
  status: string;
  license: string | null;
  contact_email: string | null;
  dataset_identifier: string | null;
  schema_id: string;
  schema_version: number;
  schema_json: { fields?: unknown } | null;
  contributor_count: number | null;
  complete_submission_count: number | null;
  last_received_at: string | null;
}

function projectFromOverview(row: ProjectOverviewRow): Project {
  // SAFETY: schema_json.fields is the published FieldDefinition[] array.
  const fields = Array.isArray(row.schema_json?.fields)
    ? (row.schema_json.fields as FieldDefinition[])
    : [];
  return {
    id: row.id,
    organizationId: row.organization_id,
    organization: row.organization_name,
    organizationMark: String(row.organization_name ?? "O")
      .slice(0, 1)
      .toUpperCase(),
    name: row.name,
    description: row.description ?? "",
    instructions: row.instructions ?? "",
    status: row.status === "closed" ? "closed" : "active",
    license: row.license,
    contactEmail: row.contact_email,
    datasetIdentifier: row.dataset_identifier,
    schemaVersion: Number(row.schema_version),
    schemaId: row.schema_id,
    contributors: row.contributor_count ?? 0,
    completeSubmissions: row.complete_submission_count ?? 0,
    lastReceived: row.last_received_at
      ? new Date(row.last_received_at).toLocaleString()
      : "No submissions yet",
    fields,
  };
}

export async function loadAssignedProjects(): Promise<Project[] | null> {
  const client = requireClient();
  const { data: projects, error } = await client
    .from("project_overviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return null;
  // SAFETY: Supabase query returns ProjectOverviewRow[] matching the projects view.
  return ((projects ?? []) as ProjectOverviewRow[]).map(projectFromOverview);
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

export async function loadUserOrganizationName(): Promise<string | null> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return null;
  const { data: membership } = await client
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (membership?.organizations) {
    // SAFETY: Supabase join returns joined organizations object or null.
    const org = membership.organizations as
      | { name?: string }
      | null
      | undefined;
    if (org?.name) return org.name;
  }
  return null;
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
  // SAFETY: organization_id is a UUID string or undefined from memberships table.
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
    license: input.license?.trim() || null,
    contact_email: input.contactEmail?.trim() || null,
    dataset_identifier: input.datasetIdentifier?.trim() || null,
    created_by: userData.user.id,
  });
  if (projectError) throw new Error("Project could not be created");
  const { data: project, error: projectReadError } = await client
    .from("projects")
    .select(
      "id,name,description,instructions,status,organization_id,license,contact_email,dataset_identifier",
    )
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
    projectFromOverview({
      ...project,
      organization_name: organizationName,
      schema_id: schemaId,
      schema_version: 1,
      schema_json: schemaJson,
      contributor_count: input.emails.length,
      complete_submission_count: 0,
      last_received_at: null,
    })
  );
}

const checkpointResultSchema = z.object({
  checkpoint_id: z.string(),
  download_url: z.string().nullable().optional(),
});

export async function createCheckpoint(
  projectId: string,
): Promise<{ checkpointId: string; downloadUrl: string | null }> {
  const client = requireClient();
  const data = await invokeFunction(
    client,
    "export-checkpoint",
    { project_id: projectId },
    checkpointResultSchema,
  );
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
  const nextVersion = project.schemaVersion + 1;
  if (!supabase) {
    return {
      id: `preview-schema-v${nextVersion}`,
      version: nextVersion,
      projectId: project.id,
      fields: project.fields,
    };
  }
  const client = supabase;
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
  if (!supabase) return;
  const client = supabase;
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
 * Invite a new workspace administrator. The server adds the address to the
 * administrator allow-list and emails a plain invitation; the rights
 * themselves are granted when that address signs in, whatever method it uses.
 */
export async function inviteAdministrator(email: string): Promise<void> {
  const client = requireClient();
  await invokeFunction(client, "send-admin-invite", { email });
}

export async function sendProjectInvite(
  projectId: string,
  email: string,
  role: "contributor" | "admin" = "contributor",
  resend = false,
): Promise<void> {
  const client = requireClient();
  await invokeFunction(client, "send-project-invite", {
    project_id: projectId,
    email,
    role,
    resend,
  });
}

export async function removeProjectContributor(
  projectId: string,
  email: string,
): Promise<boolean> {
  const client = requireClient();
  const data = await invokeFunction(
    client,
    "remove-project-contributor",
    { project_id: projectId, email },
    z.object({ removed: z.boolean().optional() }),
  );
  return Boolean(data?.removed);
}

export async function mintContributorSigninCode(
  projectId: string,
  email: string,
): Promise<{ code: string; expiresInSeconds: number; emailed: boolean }> {
  const client = requireClient();
  const data = await invokeFunction(
    client,
    "contributor-signin-code",
    { action: "create", project_id: projectId, email },
    z.object({
      code: z.string(),
      expires_in_seconds: z.number().optional(),
      emailed: z.boolean().optional(),
    }),
  );
  return {
    code: String(data?.code ?? ""),
    expiresInSeconds: Number(data?.expires_in_seconds ?? 1200),
    emailed: Boolean(data?.emailed),
  };
}

export async function sendProjectPing(
  projectId: string,
  contributorId: string,
): Promise<void> {
  const client = requireClient();
  await invokeFunction(client, "send-project-ping", {
    project_id: projectId,
    contributor_id: contributorId,
  });
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

interface ReadinessRowInputs {
  members: Array<{ user_id: string }>;
  invites: Array<{
    id: string;
    email: string;
    invited_user_id: string | null;
    status: string;
  }>;
  statuses: Array<{
    contributor_id: string;
    last_seen_at: string | null;
    last_sync_success_at: string | null;
    pending_submissions: number | null;
    pending_media: number | null;
    fieldwork_complete: boolean | null;
  }>;
  profiles: Array<{
    user_id: string;
    attention_score: number | null;
    attention_checks_total: number | null;
    attention_correct_total: number | null;
    consent_granted_at: string | null;
    consent_revoked_at: string | null;
  }>;
}

/**
 * Pure roster assembly: members first (with their device readiness), then
 * still-pending invitations the contributor has not claimed, so an admin can
 * resend or revoke an invite that has not produced a member yet.
 */
export function buildReadinessRows(
  inputs: ReadinessRowInputs,
): ContributorReadiness[] {
  const { members, invites, statuses, profiles } = inputs;
  const rows: ContributorReadiness[] = members.map((member) => {
    const invite = (invites ?? []).find(
      (candidate) => candidate.invited_user_id === member.user_id,
    );
    const profile = (profiles ?? []).find(
      (candidate) => candidate.user_id === member.user_id,
    );
    // A contributor can run the web app and an installed PWA on the same
    // phone, each with its own device row. Readiness must hold across every
    // device: one empty device must not mask pending work on another.
    const devices = (statuses ?? []).filter(
      (candidate) => candidate.contributor_id === member.user_id,
    );
    const pending = devices.reduce(
      (total, device) =>
        total +
        Number(device.pending_submissions ?? 0) +
        Number(device.pending_media ?? 0),
      0,
    );
    const lastSeen = devices.length
      ? devices.reduce<string | null>(
          (latest, device) =>
            device.last_seen_at && (!latest || device.last_seen_at > latest)
              ? device.last_seen_at
              : latest,
          null,
        )
      : null;
    // Readiness is automatic: every known device must have reported a clean
    // state (durable outbox empty, fieldwork marked complete by the client
    // heartbeat). Contributors never press a separate "finished syncing"
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
  const memberEmails = new Set(rows.map((row) => row.email.toLowerCase()));
  for (const invite of invites ?? []) {
    if (invite.status !== "pending") continue;
    if (invite.invited_user_id) {
      if (members.some((member) => member.user_id === invite.invited_user_id))
        continue;
    } else if (memberEmails.has(invite.email.trim().toLowerCase())) {
      continue;
    }
    rows.push({
      id: `invite:${invite.id}`,
      email: invite.email,
      status: "Invitation pending",
      ready: false,
      pending: 0,
      lastSeen: null,
      received: 0,
      attentionScore: null,
      attentionChecksTotal: null,
      attentionCorrectTotal: null,
      consentGranted: false,
      invitedOnly: true,
    });
  }
  return rows;
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
        .select("id,email,invited_user_id,status")
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
  // SAFETY: Supabase queries return database rows matching ReadinessRowInputs.
  return buildReadinessRows({
    members: (members ?? []) as ReadinessRowInputs["members"],
    invites: (invites ?? []) as ReadinessRowInputs["invites"],
    statuses: (statuses ?? []) as ReadinessRowInputs["statuses"],
    profiles: (profiles ?? []) as ReadinessRowInputs["profiles"],
  });
}

export interface ContributorProfileDetails {
  submissions: Array<{
    id: string;
    status: string;
    clientCreatedAt: string | null;
    serverReceivedAt: string | null;
  }>;
  devices: Array<{
    id: string;
    lastSeenAt: string | null;
    pending: number;
    fieldworkComplete: boolean;
  }>;
  attention: Array<{
    checkKey: string;
    selectedValue: string;
    correct: boolean | null;
    passed: boolean | null;
    guessProbability: number | null;
    createdAt: string;
  }>;
}

/** Admin-only detail view for one contributor: research records are read via
 * RLS (project/organization administrator), never through a service role. */
export async function loadContributorProfileDetails(
  projectId: string,
  contributorId: string,
): Promise<ContributorProfileDetails> {
  const client = requireClient();
  const [{ data: submissions }, { data: statuses }, { data: attention }] =
    await Promise.all([
      client
        .from("submissions")
        .select("id,status,client_created_at,server_received_at")
        .eq("project_id", projectId)
        .eq("contributor_id", contributorId)
        .order("server_received_at", { ascending: false })
        .limit(50),
      client
        .from("device_project_status")
        .select(
          "device_id,last_seen_at,last_sync_success_at,pending_submissions,pending_media,fieldwork_complete",
        )
        .eq("project_id", projectId)
        .eq("contributor_id", contributorId),
      client
        .from("attention_responses")
        .select(
          "check_key,selected_value,correct,passed,guess_probability,created_at",
        )
        .eq("project_id", projectId)
        .eq("contributor_id", contributorId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
  return {
    submissions: (submissions ?? []).map((row) => ({
      id: String(row.id),
      status: String(row.status),
      clientCreatedAt: row.client_created_at,
      serverReceivedAt: row.server_received_at,
    })),
    devices: (statuses ?? []).map((row) => ({
      id: String(row.device_id),
      lastSeenAt: row.last_seen_at,
      pending:
        Number(row.pending_submissions ?? 0) + Number(row.pending_media ?? 0),
      fieldworkComplete: Boolean(row.fieldwork_complete),
    })),
    attention: (attention ?? []).map((row) => ({
      checkKey: String(row.check_key),
      selectedValue: String(row.selected_value),
      correct: row.correct ?? null,
      passed: row.passed ?? null,
      guessProbability: row.guess_probability ?? null,
      createdAt: String(row.created_at),
    })),
  };
}
