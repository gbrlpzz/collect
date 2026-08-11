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
  const syncedCount = project.completeSubmissions;

  return (
    <main className="page page-project">
      <div className="back-row">
        <button className="back-button" onClick={() => onNavigate("home")}><Icon name="chevron-left" size={17} /> Projects</button>
      </div>

      <section className="project-intro">
        <div className="project-intro-copy">
          <Eyebrow>{project.organization}</Eyebrow>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
      </section>

      <p className="project-instructions">{project.instructions}</p>

      <Button variant="primary" fullWidth icon="plus" onClick={() => onNavigate("collector")} disabled={project.status === "closed"}>
        {project.status === "closed" ? "Collection closed" : "Add observation"}
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

      <details className="privacy-disclosure">
        <summary><Icon name="lock" size={15} /> What collect records on this device</summary>
        <ul>
          <li><strong>Location</strong> is captured only when you tap <em>Capture location</em> — never in the background. Latitude, longitude, accuracy, and capture time are stored with that observation.</li>
          <li><strong>Time</strong>: each observation stores the moment you saved it and your device timezone, so field evidence stays interpretable later.</li>
          <li><strong>Device identifier</strong>: a random, per-install ID (not a hardware fingerprint) labels observations so the server can show your sync status.</li>
          <li><strong>Media</strong>: photos and audio you add are kept as original files on this device.</li>
          <li>Nothing leaves this device until synchronization, and only the server that hosts your project receives it.</li>
        </ul>
      </details>

      <div className="project-footnote">Schema v{project.schemaVersion} · {project.fields.filter((field) => field.type !== "heading").length} fields</div>
    </main>
  );
}
