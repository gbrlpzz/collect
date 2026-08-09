import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Eyebrow } from "./Primitives";

interface ContributorHomeProps {
  project: Project;
  observations: Observation[];
  hasDraft: boolean;
  onNavigate: (view: View) => void;
}

export function ContributorHome({ project, observations, hasDraft, onNavigate }: ContributorHomeProps) {
  const syncedCount = Math.max(0, project.completeSubmissions + observations.filter((item) => item.status === "SYNCED").length - (project.id === "project-valladolid-houses" ? 2 : 0));
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;
  const isReady = project.fields.length > 0;

  return (
    <main className="page page-contributor">
      <div className="page-heading page-heading-home">
        <Eyebrow>Fieldwork</Eyebrow>
        <h1>Projects</h1>
      </div>

      <section className="project-list" aria-label="Assigned projects">
        {isReady ? (
          <button className="project-row" onClick={() => onNavigate("project")}>
            <span className="project-row-mark" aria-hidden="true">{project.organizationMark}</span>
            <span className="project-row-copy">
              <strong>{project.name}</strong>
              <span>{project.organization} · {project.description}</span>
            </span>
            <span className="project-row-meta">
              <span>{waitingCount ? `${waitingCount} waiting` : "Up to date"}</span>
              <Icon name="chevron-right" size={17} />
            </span>
          </button>
        ) : (
          <div className="empty-list-state"><strong>No assigned projects</strong><span>Your administrator will send an invitation when fieldwork is ready.</span></div>
        )}
      </section>

      {hasDraft && (
        <button className="list-row resume-row" onClick={() => onNavigate("collector")}>
          <span className="resume-copy">
            <strong>Unfinished observation</strong>
            <span>Saved on this device</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      )}
      {isReady && <p className="page-note">{syncedCount} observations synced · data is saved locally before it is sent.</p>}
    </main>
  );
}
