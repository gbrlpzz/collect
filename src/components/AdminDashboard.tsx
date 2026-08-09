import { useEffect, useState } from "react";
import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Avatar, Button, Divider, Eyebrow, StatusBadge } from "./Primitives";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { loadProjectReadiness, type ContributorReadiness } from "../lib/adminBackend";

interface AdminDashboardProps {
  project: Project;
  observations: Observation[];
  onNavigate: (view: View) => void;
}

export function AdminDashboard({ project, observations, onNavigate }: AdminDashboardProps) {
  const hasProject = project.id !== "empty-project";
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;
  const receivedCount = Math.max(0, project.completeSubmissions + observations.filter((item) => item.status === "SYNCED").length - (project.id === "project-valladolid-houses" ? 2 : 0));

  return (
    <main className="page page-admin">
      <div className="page-heading admin-heading">
        <div>
          <Eyebrow>Admin</Eyebrow>
          <h1>Projects</h1>
        </div>
        <Button variant="primary" icon="plus" onClick={() => onNavigate("new-project")}>New</Button>
      </div>

      <section className="admin-section">
        <div className="section-heading-row"><div><h2>Active fieldwork</h2></div></div>
        {hasProject ? (
          <button className="admin-project-card" onClick={() => onNavigate("admin-project")}>
            <div className="admin-project-leading"><div className="organization-mark">{project.organizationMark}</div><div><div className="admin-project-title-row"><h3>{project.name}</h3></div><p>{project.organization} · Schema v{project.schemaVersion}</p></div></div>
            <div className="admin-project-stats"><span>{receivedCount} received</span><span>{project.contributors} contributors</span><span>{waitingCount || 3} reported waiting</span></div>
            <Icon name="chevron-right" size={19} />
          </button>
        ) : (
          <div className="empty-list-state"><strong>No projects yet</strong><span>Create the first project, define its schema, and invite contributors.</span><Button variant="secondary" icon="plus" onClick={() => onNavigate("new-project")}>Create project</Button></div>
        )}
      </section>

      {hasProject && <section className="admin-readiness">
        <div className="section-heading-row"><h2>Readiness</h2><p>Last reported device status</p></div>
        <div className="readiness-list">
          <div><Avatar initials="GP" /><div><strong>Gabriele Pizzi</strong><span>Ready · 48 submissions</span></div><Icon name="check" size={16} /></div>
          <div><Avatar initials="MA" muted /><div><strong>Marco Alberti</strong><span>2 pending · reported 12 min ago</span></div><button className="mini-link">Ping</button></div>
          <div><Avatar initials="SA" muted /><div><strong>Sara Antonelli</strong><span>Last seen yesterday · 22 received</span></div><button className="mini-link">Ping</button></div>
        </div>
      </section>}
    </main>
  );
}

type AdminTab = "setup" | "contributors" | "export";

interface AdminProjectProps {
  project: Project;
  observations: Observation[];
  onBack: () => void;
  onToast: (message: string) => void;
  onExport: () => void;
  onDraftSchema: () => void;
  onToggleStatus: () => void;
}

export function AdminProject({ project, observations, onBack, onToast, onExport, onDraftSchema, onToggleStatus }: AdminProjectProps) {
  const [tab, setTab] = useState<AdminTab>("setup");
  const receivedCount = Math.max(0, project.completeSubmissions + observations.filter((item) => item.status === "SYNCED").length - (project.id === "project-valladolid-houses" ? 2 : 0));
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;
  return (
    <main className="page page-admin-project">
      <div className="back-row"><button className="back-button" onClick={onBack}><Icon name="arrow-left" size={17} /> Projects</button><StatusBadge tone="dark">Active</StatusBadge></div>
      <div className="admin-project-header"><div><Eyebrow>{project.organization}</Eyebrow><h1>{project.name}</h1><p className="lede">{project.description}</p></div><Button variant="secondary" icon={project.status === "active" ? "lock" : "refresh"} onClick={onToggleStatus}>{project.status === "active" ? "Close collection" : "Reopen collection"}</Button></div>
      <div className="admin-metrics"><div><span>Complete submissions</span><strong>{receivedCount}</strong></div><div><span>Contributors</span><strong>{project.contributors}</strong></div><div><span>Last received</span><strong>{project.lastReceived}</strong></div></div>
      <div className="admin-tabs" role="tablist" aria-label="Project administration">
        {(["setup", "contributors", "export"] as AdminTab[]).map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? "tab-active" : ""} onClick={() => setTab(item)}>{item === "setup" ? "Setup" : item === "contributors" ? "Contributors" : "Export"}</button>)}
      </div>
      {tab === "setup" && <SchemaPanel project={project} onToast={onToast} onDraftSchema={onDraftSchema} />}
      {tab === "contributors" && <ContributorsPanel projectId={project.id} waitingCount={waitingCount} onToast={onToast} />}
      {tab === "export" && <ExportPanel receivedCount={receivedCount} onToast={onToast} onExport={onExport} />}
    </main>
  );
}

function SchemaPanel({ project, onToast, onDraftSchema }: { project: Project; onToast: (message: string) => void; onDraftSchema: () => void }) {
  const dataFields = project.fields.filter((field) => field.type !== "heading");
  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Published schema</Eyebrow><h2>Version {project.schemaVersion}</h2><p>Published Aug 07, 2026 · immutable for historical observations</p></div><Button variant="secondary" icon="file" onClick={onDraftSchema}>Edit as draft</Button></div><Divider /><div className="schema-list">{dataFields.map((field, index) => <div className="schema-field-row" key={field.id}><span className="schema-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{field.label}</strong><span>{field.key}</span></div><span className="schema-type">{field.type.replaceAll("_", " ")}</span><span className="schema-required">{field.required ? "Required" : "Optional"}</span><Icon name="chevron-right" size={16} /></div>)}</div></section>;
}

function ContributorsPanel({ projectId, waitingCount, onToast }: { projectId: string; waitingCount: number; onToast: (message: string) => void }) {
  const [remoteRows, setRemoteRows] = useState<ContributorReadiness[] | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void loadProjectReadiness(projectId).then(setRemoteRows).catch(() => undefined);
  }, [projectId]);
  if (remoteRows) {
    return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Assigned contributors</Eyebrow><h2>{remoteRows.length} people on this project</h2><p>Readiness is based on the last status reported by each device.</p></div><Button variant="secondary" icon="plus" onClick={() => onToast("Contributor invite flow opened.")}>Add contributor</Button></div><Divider /><div className="contributor-list">{remoteRows.map((row) => <div className="contributor-row" key={row.id}><Avatar initials={row.email.slice(0, 2).toUpperCase()} muted={!row.ready} /><div className="contributor-copy"><strong>{row.email}</strong><span>{row.status}</span></div><StatusBadge tone={row.ready ? "soft" : "neutral"}>{row.ready ? "Confirmed synced" : "Needs attention"}</StatusBadge>{row.ready ? <Icon name="check" size={17} /> : <Button variant="tertiary" icon="send" onClick={() => onToast(`Ping prepared for ${row.email}.`)}>Ping</Button>}</div>)}</div></section>;
  }
  const rows = [
    ["GP", "Gabriele Pizzi", "Ready · 48 submissions", "Ready", false],
    ["MA", "Marco Alberti", `${Math.max(waitingCount, 2)} pending · reported 12 min ago`, "Ping", true],
    ["SA", "Sara Antonelli", "Last seen yesterday · 22 received", "Ping", true],
  ] as const;
  return <section className="admin-panel"><div className="panel-heading"><div><Eyebrow>Assigned contributors</Eyebrow><h2>3 people on this project</h2><p>Readiness is based on the last status reported by each device.</p></div><Button variant="secondary" icon="plus" onClick={() => onToast("Contributor invite flow opened.")}>Add contributor</Button></div><Divider /><div className="contributor-list">{rows.map(([initials, name, status, action, muted]) => <div className="contributor-row" key={name}><Avatar initials={initials} muted={muted} /><div className="contributor-copy"><strong>{name}</strong><span>{status}</span></div><StatusBadge tone={action === "Ready" ? "soft" : "neutral"}>{action === "Ready" ? "Confirmed synced" : "Needs attention"}</StatusBadge>{action === "Ping" ? <Button variant="tertiary" icon="send" onClick={() => onToast(`Ping sent to ${name}.`)}>Ping</Button> : <Icon name="check" size={17} />}</div>)}</div></section>;
}

function ExportPanel({ receivedCount, onToast, onExport }: { receivedCount: number; onToast: (message: string) => void; onExport: () => void }) {
  return <section className="admin-panel export-panel"><div className="panel-heading"><div><Eyebrow>Checkpoint export</Eyebrow><h2>2 of 3 contributors confirmed fully synced</h2><p>You can always export a checkpoint of everything completely received by the server.</p></div><StatusBadge tone="dark">Checkpoint available</StatusBadge></div><div className="export-readiness"><div className="readiness-bar"><span style={{ width: "66%" }} /></div><div><span>Received at the server</span><strong>{receivedCount} submissions · 104 media files</strong></div></div><div className="package-preview"><div className="package-row"><Icon name="file" size={18} /><div><strong>valladolid-rural-houses_checkpoint-2026-08-09.zip</strong><span>JSONL · CSV · GeoJSON · schema versions · media</span></div><Icon name="check" size={16} /></div><div className="package-tree"><span><Icon name="folder" size={15} /> schema/</span><span><Icon name="folder" size={15} /> data/submissions.jsonl</span><span><Icon name="folder" size={15} /> media/</span><span><Icon name="file" size={15} /> manifest.json</span></div></div><Button variant="primary" icon="download" onClick={onExport}>Export checkpoint</Button><p className="export-note"><Icon name="info" size={15} /> Export is a snapshot, not a claim that offline devices have no unseen data.</p></section>;
}
