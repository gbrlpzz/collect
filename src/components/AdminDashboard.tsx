import { useEffect, useState } from "react";
import type { FieldDefinition, Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Avatar, Button, Divider, Eyebrow, IconButton, StatusBadge } from "./Primitives";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { createSchemaDraft, loadProjectReadiness, publishSchemaDraft, sendProjectInvite, sendProjectPing, type ContributorReadiness, type SchemaDraft } from "../lib/adminBackend";
import { createFieldForType, fieldWithType, schemaFieldTypes } from "../data";

interface AdminDashboardProps {
  project: Project;
  projects?: Project[];
  observations: Observation[];
  onNavigate: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

export function AdminDashboard({ project, projects = [], observations, onNavigate, onSelectProject }: AdminDashboardProps) {
  const projectList = projects.filter((candidate) => candidate.id !== "empty-project");
  const hasProject = projectList.length > 0 || project.id !== "empty-project";
  const localWaiting = observations.filter((item) => item.status !== "SYNCED").length;
  const receivedCount = project.completeSubmissions;
  const [readiness, setReadiness] = useState<ContributorReadiness[] | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !hasProject) return;
    setReadiness(null);
    void loadProjectReadiness(project.id).then(setReadiness).catch(() => setReadiness([]));
  }, [hasProject, project.id]);

  const reportedWaiting = readiness?.reduce((total, row) => total + row.pending, 0) ?? null;

  return (
    <main className="page page-admin">
      <div className="page-heading admin-heading">
        <div><Eyebrow>Admin workspace</Eyebrow><h1>Projects</h1></div>
        <Button variant="primary" icon="plus" onClick={() => onNavigate("new-project")}>New project</Button>
      </div>

      <section className="admin-section">
        <div className="section-heading-row"><h2>Active fieldwork</h2></div>
        {hasProject ? (
          <div className="admin-project-list">{(projectList.length ? projectList : [project]).map((candidate) => <button className="admin-project-card" key={candidate.id} onClick={() => { onSelectProject(candidate); onNavigate("admin-project"); }}>
            <div className="admin-project-leading"><div className="organization-mark">{candidate.organizationMark}</div><div><div className="admin-project-title-row"><h3>{candidate.name}</h3></div><p>{candidate.organization} · Schema v{candidate.schemaVersion}</p></div></div>
            <div className="admin-project-stats"><span>{candidate.id === project.id ? receivedCount : candidate.completeSubmissions} received</span><span>{candidate.contributors} contributors</span><span>{candidate.id === project.id ? isSupabaseConfigured ? reportedWaiting === null ? "Checking status" : `${reportedWaiting} reported waiting` : `${localWaiting} local waiting` : "Open for status"}</span></div>
            <Icon name="chevron-right" size={19} />
          </button>)}</div>
        ) : (
          <div className="empty-list-state"><strong>Set up your workspace</strong><span>Create a project, define its schema, and invite contributors.</span><Button variant="secondary" icon="plus" onClick={() => onNavigate("new-project")}>Create project</Button></div>
        )}
      </section>

      {hasProject && <section className="admin-readiness">
        <div className="section-heading-row"><h2>Readiness</h2><p>Last reported device status</p></div>
        {!isSupabaseConfigured ? <div className="empty-list-state"><span>Preview data is not connected to a live contributor roster.</span></div> : readiness === null ? <div className="empty-list-state"><span>Checking the latest contributor status…</span></div> : <ReadinessList rows={readiness} />}
      </section>}
    </main>
  );
}

function ReadinessList({ rows }: { rows: ContributorReadiness[] }) {
  if (!rows.length) return <div className="empty-list-state"><strong>No contributors assigned</strong><span>Invite contributors from the project detail view.</span></div>;
  return <div className="readiness-list">{rows.map((row) => <div key={row.id}><Avatar initials={row.email.slice(0, 2).toUpperCase()} muted={!row.ready} /><div><strong>{row.email}</strong><span>{row.status}</span></div>{row.ready ? <Icon name="check" size={16} /> : <span className="readiness-pending">Needs attention</span>}</div>)}</div>;
}

type AdminTab = "setup" | "contributors" | "export";

interface AdminProjectProps {
  project: Project;
  observations: Observation[];
  onBack: () => void;
  onToast: (message: string) => void;
  onExport: () => void;
  onSchemaPublished: (project: Project) => void;
  onToggleStatus: () => void;
}

export function AdminProject({ project, observations, onBack, onToast, onExport, onSchemaPublished, onToggleStatus }: AdminProjectProps) {
  const [tab, setTab] = useState<AdminTab>("setup");
  const [readiness, setReadiness] = useState<ContributorReadiness[] | null>(null);
  const receivedCount = project.completeSubmissions;
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setReadiness(null);
    void loadProjectReadiness(project.id).then(setReadiness).catch(() => setReadiness([]));
  }, [project.id]);

  return (
    <main className="page page-admin-project">
      <div className="back-row"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Projects</button><StatusBadge tone={project.status === "active" ? "dark" : "soft"}>{project.status === "active" ? "Active" : "Closed"}</StatusBadge></div>
      <div className="admin-project-header"><div><Eyebrow>{project.organization}</Eyebrow><h1>{project.name}</h1><p className="lede">{project.description}</p></div><Button variant="secondary" icon={project.status === "active" ? "lock" : "refresh"} onClick={onToggleStatus}>{project.status === "active" ? "Close collection" : "Reopen collection"}</Button></div>
      <div className="admin-metrics"><div><span>Complete submissions</span><strong>{receivedCount}</strong></div><div><span>Contributors</span><strong>{project.contributors}</strong></div><div><span>Last received</span><strong>{project.lastReceived}</strong></div></div>
      <div className="admin-tabs" role="tablist" aria-label="Project administration">
        {(["setup", "contributors", "export"] as AdminTab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "tab-active" : ""} onClick={() => setTab(item)}>{item === "setup" ? "Setup" : item === "contributors" ? "Contributors" : "Export"}</button>)}
      </div>
      {tab === "setup" && <SchemaPanel project={project} onToast={onToast} onPublished={onSchemaPublished} />}
      {tab === "contributors" && <ContributorsPanel projectId={project.id} waitingCount={waitingCount} onToast={onToast} />}
      {tab === "export" && <ExportPanel project={project} receivedCount={receivedCount} readiness={readiness} onExport={onExport} />}
    </main>
  );
}

function SchemaPanel({ project, onToast, onPublished }: { project: Project; onToast: (message: string) => void; onPublished: (project: Project) => void }) {
  const [draft, setDraft] = useState<SchemaDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const dataFields = project.fields.filter((field) => field.type !== "heading");

  const startDraft = async () => {
    setBusy(true);
    try {
      setDraft(await createSchemaDraft(project));
    } catch {
      onToast("The schema draft could not be opened");
    } finally {
      setBusy(false);
    }
  };

  if (draft) return <SchemaDraftEditor project={project} draft={draft} busy={busy} setBusy={setBusy} onCancel={() => setDraft(null)} onToast={onToast} onPublished={onPublished} />;
  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Published schema</Eyebrow><h2>Version {project.schemaVersion}</h2><p>Immutable for historical observations</p></div><Button variant="secondary" icon="file" onClick={() => void startDraft()} disabled={busy}>Edit as draft</Button></div><Divider /><div className="schema-list">{dataFields.map((field, index) => <div className="schema-field-row" key={field.id}><span className="schema-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{field.label}</strong><span>{field.key}</span></div><span className="schema-type">{field.type.replaceAll("_", " ")}</span><span className="schema-required">{field.required ? "Required" : "Optional"}</span><Icon name="chevron-right" size={16} /></div>)}</div></section>;
}

function SchemaDraftEditor({ project, draft, busy, setBusy, onCancel, onToast, onPublished }: { project: Project; draft: SchemaDraft; busy: boolean; setBusy: (value: boolean) => void; onCancel: () => void; onToast: (message: string) => void; onPublished: (project: Project) => void }) {
  const [fields, setFields] = useState<FieldDefinition[]>(draft.fields);
  const updateField = (id: string, patch: Partial<FieldDefinition>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const removeField = (id: string) => setFields((current) => current.filter((field) => field.id !== id));
  const publish = async () => {
    if (!fields.some((field) => field.type !== "heading")) {
      onToast("Add at least one data field before publishing");
      return;
    }
    setBusy(true);
    try {
      const nextDraft = { ...draft, fields };
      await publishSchemaDraft(nextDraft);
      onPublished({ ...project, fields, schemaVersion: draft.version, schemaId: draft.id });
      onToast(`Schema v${draft.version} published`);
    } catch {
      onToast("The schema could not be published");
    } finally {
      setBusy(false);
    }
  };
  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Schema draft</Eyebrow><h2>Version {draft.version}</h2><p>Review the draft, then publish an immutable version.</p></div><StatusBadge tone="soft">Draft</StatusBadge></div><Divider /><div className="builder-list">{fields.map((field, index) => <div className="builder-row" key={field.id}><span className="builder-index">{String(index + 1).padStart(2, "0")}</span><div className="builder-controls"><input className="builder-inline-input" value={field.label} aria-label={`Draft field ${index + 1} label`} onChange={(event) => updateField(field.id, { label: event.target.value })} /><div><input className="builder-key-input" value={field.key} aria-label={`${field.label} machine key`} onChange={(event) => updateField(field.id, { key: event.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} /><select className="builder-select" value={field.type} aria-label={`${field.label} type`} onChange={(event) => updateField(field.id, fieldWithType(field, event.target.value as Exclude<FieldDefinition["type"], "heading">))}>{schemaFieldTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}</select></div></div><label className="builder-required"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(field.id, { required: event.target.checked })} /> Required</label><IconButton label={`Remove ${field.label}`} icon="x" onClick={() => removeField(field.id)} /></div>)}</div><button className="add-field-row" onClick={() => setFields((current) => [...current, createFieldForType("short_text", current.length + 1)])}><Icon name="plus" size={17} /> Add field</button><div className="schema-builder-note"><Icon name="shield" size={17} /><span>Published schemas are immutable. Existing observations stay attached to their original version.</span></div><div className="wizard-actions"><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant="primary" icon="check" onClick={() => void publish()} disabled={busy}>{busy ? "Publishing…" : "Publish version"}</Button></div></section>;
}

function ContributorsPanel({ projectId, waitingCount, onToast }: { projectId: string; waitingCount: number; onToast: (message: string) => void }) {
  const [remoteRows, setRemoteRows] = useState<ContributorReadiness[] | null>(null);

  const refresh = () => {
    if (!isSupabaseConfigured) return;
    setRemoteRows(null);
    void loadProjectReadiness(projectId).then(setRemoteRows).catch(() => setRemoteRows([]));
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setRemoteRows(null);
    void loadProjectReadiness(projectId).then(setRemoteRows).catch(() => setRemoteRows([]));
  }, [projectId]);

  const invite = async () => {
    const email = window.prompt("Contributor email address")?.trim();
    if (!email) return;
    if (!isSupabaseConfigured) {
      onToast("Contributor invites are available after connecting Supabase");
      return;
    }
    try {
      await sendProjectInvite(projectId, email);
      onToast(`Invitation sent to ${email}`);
      refresh();
    } catch {
      onToast("The invitation could not be sent");
    }
  };

  const ping = async (contributorId: string, email: string) => {
    try {
      await sendProjectPing(projectId, contributorId);
      onToast(`Reminder sent to ${email}`);
    } catch {
      onToast("Email reminders need a configured mail provider");
    }
  };

  if (remoteRows) return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Assigned contributors</Eyebrow><h2>{remoteRows.length} people on this project</h2><p>Readiness is based on the last status reported by each device.</p></div><Button variant="secondary" icon="plus" onClick={() => void invite()}>Add contributor</Button></div><Divider /><div className="contributor-list">{remoteRows.length ? remoteRows.map((row) => <div className="contributor-row" key={row.id}><Avatar initials={row.email.slice(0, 2).toUpperCase()} muted={!row.ready} /><div className="contributor-copy"><strong>{row.email}</strong><span>{row.status}</span></div><StatusBadge tone={row.ready ? "soft" : "neutral"}>{row.ready ? "Confirmed synced" : "Needs attention"}</StatusBadge>{row.ready ? <Icon name="check" size={17} /> : <Button variant="tertiary" icon="send" onClick={() => void ping(row.id, row.email)}>Ping</Button>}</div>) : <div className="empty-list-state"><strong>No contributors assigned</strong><span>Invite the field team when the project is ready.</span></div>}</div></section>;
  if (isSupabaseConfigured) return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Assigned contributors</Eyebrow><h2>Checking the roster</h2><p>Readiness is based on the last status reported by each device.</p></div></div></section>;

  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Assigned contributors</Eyebrow><h2>Preview roster</h2><p>Preview data is not connected to a live contributor roster.</p></div><Button variant="secondary" icon="plus" onClick={() => onToast("Contributor invites are available after connecting Supabase")}>Add contributor</Button></div><Divider /><div className="empty-list-state"><span>{waitingCount} local observations waiting in preview.</span></div></section>;
}

function ExportPanel({ project, receivedCount, readiness, onExport }: { project: Project; receivedCount: number; readiness: ContributorReadiness[] | null; onExport: () => void }) {
  const total = readiness?.length ?? project.contributors;
  const ready = readiness?.filter((row) => row.ready).length ?? 0;
  const readinessKnown = !isSupabaseConfigured || readiness !== null;
  const percentage = total ? Math.round((ready / total) * 100) : 0;
  const readyForFinal = readinessKnown && ready === total && total > 0;
  return <section className="admin-panel export-panel"><div className="panel-heading"><div><Eyebrow>Checkpoint export</Eyebrow><h2>{readinessKnown ? `${ready} of ${total} contributors confirmed fully synced` : "Checking contributor readiness"}</h2><p>You can always export a checkpoint of everything completely received by the server.</p></div><StatusBadge tone={readyForFinal ? "dark" : "soft"}>{readyForFinal ? "Ready for final export" : "Checkpoint available"}</StatusBadge></div><div className="export-readiness"><div className="readiness-bar"><span style={{ width: `${percentage}%` }} /></div><div><span>Received at the server</span><strong>{receivedCount} submissions · media included in package</strong></div></div><div className="package-preview"><div className="package-row"><Icon name="file" size={18} /><div><strong>{project.name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}_checkpoint.zip</strong><span>JSONL · CSV · GeoJSON · schema versions · media</span></div><Icon name="check" size={16} /></div><div className="package-tree"><span><Icon name="folder" size={15} /> schema/</span><span><Icon name="folder" size={15} /> data/submissions.jsonl</span><span><Icon name="folder" size={15} /> media/</span><span><Icon name="file" size={15} /> manifest.json</span></div></div><Button variant="primary" icon="download" onClick={onExport}>Export checkpoint</Button><p className="export-note"><Icon name="info" size={15} /> Export is a snapshot, not a claim that offline devices have no unseen data.</p></section>;
}
