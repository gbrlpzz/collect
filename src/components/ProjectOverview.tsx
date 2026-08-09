import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./Primitives";

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
      </div>

      <section className="project-intro">
        <div className="project-intro-copy">
          <Eyebrow>{project.organization}</Eyebrow>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
      </section>

      <p className="project-instructions">{project.instructions}</p>

      <Button variant="primary" fullWidth iconAfter="arrow-right" onClick={() => onNavigate("collector")} disabled={project.status === "closed"}>
        {project.status === "closed" ? "Collection closed" : "Start collecting"}
      </Button>

      <section className="project-list project-list-detail" aria-label="Project status">
        <button className="list-row" onClick={onOpenSync}>
          <span className="list-row-copy"><strong>{waitingCount ? `${waitingCount} waiting to sync` : "Up to date"}</strong><span>{syncedCount} observations synced</span></span>
          <Icon name="chevron-right" size={17} />
        </button>
        <button className="list-row" onClick={onFinishFieldwork}>
          <span className="list-row-copy"><strong>Finish fieldwork</strong><span>Confirm that all saved observations have synced</span></span>
          <Icon name="chevron-right" size={17} />
        </button>
      </section>

      <div className="project-footnote">Schema v{project.schemaVersion} · {project.fields.filter((field) => field.type !== "heading").length} fields</div>
    </main>
  );
}
