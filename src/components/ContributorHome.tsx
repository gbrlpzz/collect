import type { Observation, Project } from "../types";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { Icon } from "./Icon";
import { Button } from "./ui";

interface ContributorHomeProps {
  projects: Project[];
  activeProject: Project;
  observations: Observation[];
  hasDraft: boolean;
  onStartObservation: (project: Project) => void;
  onOpenProject: (project: Project) => void;
  onChooseProject: (project: Project) => void;
  onResumeObservation: () => void;
  onDiscardAndStartObservation: (project: Project) => void;
}

/**
 * The field surface starts with the contributor's frequent action, not with
 * routing. A single assigned project is context, not a choice. When several
 * projects are assigned, the native picker remains available as a secondary
 * control without competing with starting an observation.
 */
export function ContributorHome({
  projects,
  activeProject,
  observations,
  hasDraft,
  onStartObservation,
  onOpenProject,
  onChooseProject,
  onResumeObservation,
  onDiscardAndStartObservation,
}: ContributorHomeProps) {
  const project =
    projects.find((candidate) => candidate.id === activeProject.id) ??
    projects[0];
  const projectObservations = project
    ? observations.filter(
        (item) => !item.projectId || item.projectId === project.id,
      )
    : [];
  const waitingCount = projectObservations.filter(
    (item) => item.status !== "SYNCED",
  ).length;
  const attentionCount = projectObservations.filter(
    (item) => item.status === "ACTION_REQUIRED",
  ).length;
  const recent = projectObservations.slice(-3).reverse();
  const isClosed = project?.status === "closed";

  return (
    <main className="page page-contributor">
      <div className="page-heading page-heading-home">
        <h1>New observation</h1>
        <p className="page-lede">
          Record what you see. It is saved on this device before it is sent.
        </p>
      </div>

      {projects.length ? (
        <>
          <section
            className="collection-context"
            aria-labelledby="project-context-title"
          >
            {projects.length > 1 ? (
              <label className="project-picker-label">
                <span id="project-context-title">Project</span>
                <select
                  aria-label="Project"
                  value={project.id}
                  onChange={(event) => {
                    const next = projects.find(
                      (candidate) => candidate.id === event.target.value,
                    );
                    if (next) onChooseProject(next);
                  }}
                >
                  {projects.map((candidate) => (
                    <option value={candidate.id} key={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <button
                className="collection-project-row"
                onClick={() => onOpenProject(project)}
              >
                <span>
                  <strong id="project-context-title">{project.name}</strong>
                  <span>{project.organization}</span>
                </span>
                <Icon name="chevron-right" size={17} />
              </button>
            )}
          </section>

          <div
            className={`primary-action-dock${hasDraft ? " primary-action-dock-draft" : ""}`}
          >
            <Button
              variant="primary"
              fullWidth
              icon={hasDraft ? undefined : "plus"}
              onClick={
                hasDraft
                  ? onResumeObservation
                  : () => onStartObservation(project)
              }
              disabled={isClosed}
            >
              {isClosed
                ? "Collection closed"
                : hasDraft
                  ? "Resume observation"
                  : "Add observation"}
            </Button>
            {hasDraft && (
              <button
                type="button"
                className="draft-restart-action"
                onClick={() => onDiscardAndStartObservation(project)}
                disabled={isClosed}
              >
                Discard and start new
              </button>
            )}
          </div>

          {recent.length > 0 && (
            <section
              className="collection-status"
              aria-label="Observation status"
            >
              <div className="section-heading-row">
                <div>
                  <h2>Recent observations</h2>
                  <p>
                    {attentionCount
                      ? `${attentionCount} need attention`
                      : waitingCount
                        ? `${waitingCount} waiting to send`
                        : "All saved"}
                  </p>
                </div>
              </div>
              <div className="recent-observation-list">
                {recent.map((observation) => {
                  const waiting = observation.status !== "SYNCED";
                  return (
                    <div
                      className="recent-observation-row"
                      key={observation.id}
                    >
                      <span className="recent-observation-copy">
                        <strong>
                          {String(
                            observation.values.site_code ?? "Observation",
                          )}
                        </strong>
                        <span title={formatExactTime(observation.createdAt)}>
                          {formatRelativeTime(observation.createdAt)}
                        </span>
                      </span>
                      <span>{waiting ? "Saved here" : "Sent"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="empty-list-state">
          <strong>No assigned project</strong>
          <span>
            Your administrator will send an invitation when fieldwork is ready.
          </span>
        </div>
      )}
    </main>
  );
}
