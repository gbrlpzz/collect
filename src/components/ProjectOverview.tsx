import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./ui";

interface ProjectOverviewProps {
  project: Project;
  observations: Observation[];
  onNavigate: (view: View) => void;
  onOpenSync: () => void;
}

export function ProjectOverview({
  project,
  observations,
  onNavigate,
  onOpenSync,
}: ProjectOverviewProps) {
  const waitingCount = observations.filter(
    (item) => item.status !== "SYNCED",
  ).length;
  const attentionCount = observations.filter(
    (item) => item.status === "ACTION_REQUIRED",
  ).length;
  const syncedCount = project.completeSubmissions;

  return (
    <main className="page page-project">
      <div className="back-row">
        <button className="back-button" onClick={() => onNavigate("home")}>
          <Icon name="chevron-left" size={17} /> Fieldwork
        </button>
      </div>

      <section className="project-intro">
        <div className="project-intro-copy">
          <Eyebrow>{project.organization}</Eyebrow>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
      </section>

      {project.instructions && (
        <section
          className="project-guidance"
          aria-labelledby="instructions-title"
        >
          <h2 id="instructions-title">Instructions</h2>
          <p className="project-instructions">{project.instructions}</p>
        </section>
      )}

      <Button
        variant="primary"
        fullWidth
        icon="plus"
        onClick={() => onNavigate("collector")}
        disabled={project.status === "closed"}
      >
        {project.status === "closed" ? "Collection closed" : "Add observation"}
      </Button>

      <section
        className="project-list project-list-detail"
        aria-label="Project status"
      >
        <button
          className="list-row"
          onClick={onOpenSync}
          aria-label="View sync status"
        >
          <span className="list-row-copy">
            <strong>
              {attentionCount
                ? `${attentionCount} need attention`
                : waitingCount
                  ? `${waitingCount} waiting to send`
                  : "Up to date"}
            </strong>
            <span>
              {attentionCount
                ? "Open sync status to review"
                : waitingCount
                  ? "Syncing automatically"
                  : `${syncedCount} observations synced`}
            </span>
          </span>
          <Icon name="chevron-right" size={17} />
        </button>
      </section>

      <details className="privacy-disclosure">
        <summary>
          <Icon name="lock" size={17} />
          <span className="privacy-summary-copy">
            <strong>Data and privacy</strong>
            <span>What is recorded, why, and who can access it</span>
          </span>
          <Icon name="chevron-down" size={16} />
        </summary>
        <dl className="privacy-facts">
          <div>
            <dt>Observation</dt>
            <dd>Your answers, save time, timezone, and schema version.</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              Coordinates, accuracy, and capture time. Projects that declare a
              location field require Location Services before collection.
            </dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>
              A random install ID plus device, operating system, browser,
              screen, connection, battery, and language information used for
              provenance and recovery.
            </dd>
          </div>
          <div>
            <dt>Media</dt>
            <dd>Original photos and audio you choose to add.</dd>
          </div>
          <div>
            <dt>Access</dt>
            <dd>
              Only the assigned project and its authorized administrators.
            </dd>
          </div>
          <div>
            <dt>Transfer</dt>
            <dd>
              Data stays on this device until synchronization and goes only to
              this project&rsquo;s server.
            </dd>
          </div>
        </dl>
      </details>
    </main>
  );
}
