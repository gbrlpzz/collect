import { useEffect, useState } from "react";
import type { Observation, Project } from "../types";
import { getMyProfile } from "../lib/consent";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./ui";
import { AppCredit } from "./AppCredit";

interface ContributorHomeProps {
  projects: Project[];
  activeProject: Project;
  observations: Observation[];
  hasDraft: boolean;
  onStartObservation: (project: Project) => void;
  onChooseProject: (project: Project) => void;
  onResumeObservation: () => void;
  onDiscardAndStartObservation: (project: Project) => void;
  onOpenSync: () => void;
}

/**
 * The field surface is a single screen: the project context, the frequent
 * action, and the durable record. One assigned project is context, not a
 * choice; when several projects are assigned, the native picker remains
 * available as a secondary control without competing with starting an
 * observation. Project detail (description, instructions, sync status,
 * privacy) lives on the same page so there is no second, similar-looking
 * screen to tell apart.
 */
export function ContributorHome({
  projects,
  activeProject,
  observations,
  hasDraft,
  onStartObservation,
  onChooseProject,
  onResumeObservation,
  onDiscardAndStartObservation,
  onOpenSync,
}: ContributorHomeProps) {
  const project =
    projects.find((candidate) => candidate.id === activeProject.id) ??
    projects[0];
  // Distinguish "never assigned yet" from "access was revoked": a profile
  // with granted consent means this account was onboarded before, so an
  // empty assignment list now means the contributor was removed. The local
  // observations stay on the device either way.
  const [removedFromProject, setRemovedFromProject] = useState(false);
  useEffect(() => {
    if (projects.length > 0) {
      setRemovedFromProject(false);
      return;
    }
    let active = true;
    void getMyProfile()
      .then((profile) => {
        if (!active) return;
        setRemovedFromProject(
          Boolean(profile?.consentGrantedAt && !profile.consentRevokedAt),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projects.length]);
  const projectObservations = project
    ? observations.filter(
        (item) => !item.projectId || item.projectId === project.id,
      )
    : [];
  const recent = projectObservations.slice(-3).reverse();
  const isClosed = project?.status === "closed";
  const waitingCount = projectObservations.filter(
    (item) => item.status !== "SYNCED",
  ).length;
  const attentionCount = projectObservations.filter(
    (item) => item.status === "ACTION_REQUIRED",
  ).length;
  const syncedCount = project?.completeSubmissions ?? 0;

  const organizationName = project?.organization;

  return (
    <main className="page page-contributor">
      <div className="page-heading page-heading-home">
        {organizationName && <Eyebrow>{organizationName}</Eyebrow>}
        <h1>Fieldwork</h1>
      </div>

      {projects.length ? (
        <>
          {projects.length > 1 && (
            <section
              className="collection-context"
              aria-labelledby="project-context-title"
            >
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
            </section>
          )}

          <section className="project-intro" aria-labelledby="project-name">
            <div className="project-intro-copy">
              <Eyebrow>{project.organization}</Eyebrow>
              <h2 id="project-name">{project.name}</h2>
              {project.description && <p>{project.description}</p>}
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
                <h2>Recent observations</h2>
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
          <strong>
            {removedFromProject
              ? "Project access removed"
              : "No assigned project"}
          </strong>
          <span>
            {removedFromProject
              ? "This project no longer includes your account. Observations on this device stay here and can be exported from Profile at any time."
              : "Your administrator will send an invitation when fieldwork is ready."}
          </span>
        </div>
      )}
      <AppCredit />
    </main>
  );
}
