import type { FieldDefinition, Project } from "../types";
import { supabase } from "./supabaseClient";

export interface NewProjectInput {
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
}

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

function projectFromRemote(row: Record<string, any>, organization: Record<string, any>, schema: Record<string, any> | null, contributorCount: number, completeSubmissions: number, lastReceived: string): Project {
  const fields = Array.isArray(schema?.schema_json?.fields) ? schema.schema_json.fields as FieldDefinition[] : [];
  return {
    id: row.id,
    organizationId: organization.id,
    organization: organization.name,
    organizationMark: String(organization.name ?? "O").slice(0, 1).toUpperCase(),
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

export async function loadAssignedProject(): Promise<Project | null> {
  const client = requireClient();
  const { data: projects, error } = await client.from("projects").select("id,organization_id,name,description,instructions,status").order("created_at", { ascending: false }).limit(1);
  if (error || !projects?.length) return null;
  const row = projects[0] as Record<string, any>;
  const [{ data: organization }, { data: schema }, { count: contributorCount }, { count: completeSubmissions }, { data: latest }] = await Promise.all([
    client.from("organizations").select("id,name,logo_path").eq("id", row.organization_id).maybeSingle(),
    client.from("project_schemas").select("id,version,schema_json").eq("project_id", row.id).not("published_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle(),
    client.from("project_members").select("user_id", { count: "exact", head: true }).eq("project_id", row.id),
    client.from("submissions").select("id", { count: "exact", head: true }).eq("project_id", row.id).eq("status", "COMPLETE"),
    client.from("submissions").select("server_received_at").eq("project_id", row.id).eq("status", "COMPLETE").order("server_received_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!organization || !schema) return null;
  return projectFromRemote(row, organization, schema, contributorCount ?? 0, completeSubmissions ?? 0, latest?.server_received_at ? new Date(latest.server_received_at).toLocaleString() : "No submissions yet");
}

export async function createRemoteProject(input: NewProjectInput): Promise<Project> {
  const client = requireClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Authentication is required to create a project");
  const { data: membership } = await client.from("organization_members").select("organization_id").eq("user_id", userData.user.id).eq("role", "admin").limit(1).maybeSingle();
  let organizationId = membership?.organization_id as string | undefined;
  if (!organizationId) {
    const { data: organization, error: organizationError } = await client.from("organizations").insert({ name: "My field workspace", created_by: userData.user.id }).select("id").single();
    if (organizationError || !organization) throw new Error("Workspace could not be created");
    organizationId = organization.id;
  }
  const { data: project, error: projectError } = await client.from("projects").insert({ organization_id: organizationId, name: input.name.trim() || "Untitled field project", description: input.description, instructions: input.instructions, created_by: userData.user.id }).select("id,name,description,instructions,status,organization_id").single();
  if (projectError || !project) throw new Error("Project could not be created");
  const schemaId = crypto.randomUUID();
  const schemaJson = { schema_id: schemaId, version: 1, project_id: project.id, published_at: new Date().toISOString(), fields: input.fields };
  const { error: schemaError } = await client.from("project_schemas").insert({ id: schemaId, project_id: project.id, version: 1, schema_json: schemaJson, published_at: new Date().toISOString(), published_by: userData.user.id });
  if (schemaError) throw new Error("Schema could not be published");
  for (const email of input.emails) {
    if (!email.trim()) continue;
    const response = await client.functions.invoke("send-project-invite", { body: { project_id: project.id, email: email.trim() } });
    if (response.error) throw response.error;
  }
  return (await loadAssignedProject()) ?? projectFromRemote(project, { id: organizationId, name: "My field workspace" }, { id: schemaId, version: 1, schema_json: schemaJson }, input.emails.length, 0, "No submissions yet");
}

export async function createCheckpoint(projectId: string): Promise<{ checkpointId: string; downloadUrl: string | null }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("export-checkpoint", { body: { project_id: projectId } });
  if (error) throw error;
  return { checkpointId: data.checkpoint_id, downloadUrl: data.download_url ?? null };
}

export async function cloneSchemaDraft(project: Project): Promise<void> {
  const client = requireClient();
  const nextVersion = project.schemaVersion + 1;
  const schemaId = crypto.randomUUID();
  const schemaJson = { schema_id: schemaId, version: nextVersion, project_id: project.id, published_at: null, fields: project.fields };
  const { error } = await client.from("project_schemas").insert({ id: schemaId, project_id: project.id, version: nextVersion, schema_json: schemaJson, published_at: null });
  if (error) throw error;
}

export async function sendProjectInvite(projectId: string, email: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.functions.invoke("send-project-invite", { body: { project_id: projectId, email } });
  if (error) throw error;
}

export async function updateProjectStatus(projectId: string, status: "active" | "closed"): Promise<void> {
  const client = requireClient();
  const { error } = await client.from("projects").update({ status }).eq("id", projectId);
  if (error) throw error;
}

export async function loadProjectReadiness(projectId: string): Promise<ContributorReadiness[]> {
  const client = requireClient();
  const [{ data: members }, { data: invites }, { data: statuses }] = await Promise.all([
    client.from("project_members").select("user_id").eq("project_id", projectId),
    client.from("project_invites").select("email,invited_user_id,status").eq("project_id", projectId),
    client.from("device_project_status").select("contributor_id,last_seen_at,last_sync_success_at,pending_submissions,pending_media,fieldwork_complete").eq("project_id", projectId).order("last_seen_at", { ascending: false }),
  ]);
  return (members ?? []).map((member: { user_id: string }) => {
    const invite = (invites ?? []).find((candidate: { invited_user_id: string | null }) => candidate.invited_user_id === member.user_id);
    const device = (statuses ?? []).find((candidate: { contributor_id: string }) => candidate.contributor_id === member.user_id);
    const pending = Number(device?.pending_submissions ?? 0) + Number(device?.pending_media ?? 0);
    const ready = Boolean(device?.fieldwork_complete && pending === 0);
    return {
      id: member.user_id,
      email: invite?.email ?? `Contributor ${member.user_id.slice(0, 6)}`,
      status: ready ? "Ready" : device?.last_seen_at ? `${pending} pending · last seen ${new Date(device.last_seen_at).toLocaleString()}` : "No status reported",
      ready,
      pending,
      lastSeen: device?.last_seen_at ?? null,
      received: 0,
    };
  });
}
