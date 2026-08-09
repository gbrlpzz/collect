import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Button, Divider, Eyebrow, IconButton, StatusBadge } from "./Primitives";

interface ProjectOverviewProps {
  project: Project;
  observations: Observation[];
  onNavigate: (view: View) => void;
  onOpenSync: () => void;
  onFinishFieldwork: () => void;
}

export function ProjectOverview({ project, observations, onNavigate, onOpenSync, onFinishFieldwork }: ProjectOverviewProps) {
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;
  const syncedCount = Math.max(0, project.completeSubmissions + observations.filter((item) => item.status === "SYNCED").length - (project.id === "project-valladolid-houses" ? 2 : 0));

  return (
    <main className="page page-project">
      <div className="back-row">
        <button className="back-button" onClick={() => onNavigate("home")}><Icon name="arrow-left" size={17} /> Projects</button>
        <StatusBadge tone="soft">{project.status === "active" ? "Collection active" : "Collection closed"}</StatusBadge>
      </div>

      <section className="project-intro">
        <div className="project-intro-mark">{project.organizationMark}</div>
        <div className="project-intro-copy">
          <Eyebrow>{project.organization}</Eyebrow>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <IconButton label="Project actions" icon="more" />
      </section>

      <section className="project-action-card">
        <div className="action-card-copy">
          <Eyebrow>Ready for the field</Eyebrow>
          <h2>Observe carefully. Submit confidently.</h2>
          <p>{project.instructions}</p>
        </div>
        <Button variant="primary" icon="plus" fullWidth onClick={() => onNavigate("collector")} disabled={project.status === "closed"}>
          {project.status === "closed" ? "Collection closed" : "Start collecting"}
        </Button>
      </section>

      <div className="project-detail-grid">
        <section className="surface-card project-status-card">
          <div className="card-heading-row">
            <div>
              <Eyebrow>Local ledger</Eyebrow>
              <h2>Sync status</h2>
            </div>
            <StatusBadge tone={waitingCount ? "dark" : "soft"}>{waitingCount ? `${waitingCount} waiting` : "Up to date"}</StatusBadge>
          </div>
          <div className="ledger-number-row">
            <div><strong>{syncedCount}</strong><span>synced</span></div>
            <div><strong>{waitingCount}</strong><span>waiting</span></div>
          </div>
          <Divider />
          <div className="sync-meta-row"><span>Last successful sync</span><strong>Today at 09:32</strong></div>
          <Button variant="secondary" icon="refresh" fullWidth onClick={onOpenSync}>Open sync status</Button>
          <Button variant="quiet" icon="check" fullWidth onClick={onFinishFieldwork}>Finish fieldwork</Button>
        </section>

        <section className="surface-card instructions-card">
          <div className="card-heading-row">
            <div>
              <Eyebrow>Instructions</Eyebrow>
              <h2>Before you begin</h2>
            </div>
            <Icon name="info" size={18} />
          </div>
          <ol className="instruction-list">
            <li><span>1</span><p>Work through the locations in sequence.</p></li>
            <li><span>2</span><p>Keep uncertainty explicit. Do not guess.</p></li>
            <li><span>3</span><p>Add a wide photo before you submit.</p></li>
          </ol>
          <div className="schema-note"><Icon name="file" size={16} /><span>Schema v{project.schemaVersion} · {project.fields.filter((field) => field.type !== "heading").length} fields</span></div>
        </section>
      </div>
    </main>
  );
}
