import type { Observation, Project } from "../types";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./ui";

interface ContributorHomeProps {
  projects: Project[];
  activeProject: Project;
  observations: Observation[];
  hasDraft: boolean;
  onStartObservation: (project: Project) => void;
  onOpenProject: (project: Project) => void;
  onChooseProject: (project: Project) => void;
  onResumeObservation: () => void;
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
        <Eyebrow>Fieldwork</Eyebrow>
        <h1>New observation</h1>
        <p className="page-lede">
          Record what you see. It is saved on this device before it is sent.
        </p>
      </div>

      {projects.length ? (
        <>
          {hasDraft && (
            <button
              className="resume-row list-row"
              onClick={onResumeObservation}
            >
              <span className="resume-copy">
                <strong>Resume observation</strong>
                <span>Draft saved on this device</span>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          )}

          <Button
            variant="primary"
            fullWidth
            icon="plus"
            onClick={() => onStartObservation(project)}
            disabled={isClosed}
          >
            {isClosed ? "Collection closed" : "Start observation"}
          </Button>

          <section
            className="collection-context"
            aria-labelledby="project-context-title"
          >
            <div className="collection-context-copy">
              <Eyebrow>Project</Eyebrow>
              <h2 id="project-context-title">{project.name}</h2>
              <p>{project.description}</p>
            </div>
            {projects.length > 1 ? (
              <label className="project-picker-label">
                <span>Project</span>
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
                className="text-button collection-details-button"
                onClick={() => onOpenProject(project)}
              >
                Project details <Icon name="chevron-right" size={15} />
              </button>
            )}
          </section>

          {recent.length > 0 && (
            <section
              className="collection-status"
              aria-label="Observation status"
            >
              <div className="section-heading-row">
                <div>
                  <Eyebrow>Recent</Eyebrow>
                  <h2>
                    {attentionCount
                      ? `${attentionCount} need attention`
                      : waitingCount
                        ? `${waitingCount} waiting to send`
                        : "All saved"}
                  </h2>
                </div>
                <span className="collection-status-count">
                  {projectObservations.length} total
                </span>
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
                        <span>{observation.createdAt}</span>
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
