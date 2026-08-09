import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Eyebrow } from "./Primitives";

interface ContributorHomeProps {
  projects: Project[];
  observations: Observation[];
  hasDraft: boolean;
  onNavigate: (view: View) => void;
  onSelectProject: (project: Project) => void;
}

export function ContributorHome({ projects, observations, hasDraft, onNavigate, onSelectProject }: ContributorHomeProps) {
  return (
    <main className="page page-contributor">
      <div className="page-heading page-heading-home"><Eyebrow>Fieldwork</Eyebrow><h1>Projects</h1></div>
      <section className="project-list" aria-label="Assigned projects">
        {projects.length ? projects.map((project) => {
          const projectObservations = observations.filter((item) => !item.projectId || item.projectId === project.id);
          const waitingCount = projectObservations.filter((item) => item.status !== "SYNCED").length;
          return <button className="project-row" key={project.id} onClick={() => onSelectProject(project)}>
            <span className="project-row-mark" aria-hidden="true">{project.organizationMark}</span>
            <span className="project-row-copy"><strong>{project.name}</strong><span>{project.organization} · {project.description}</span></span>
            <span className="project-row-meta"><span>{waitingCount ? `${waitingCount} waiting` : "Up to date"}</span><Icon name="chevron-right" size={17} /></span>
          </button>;
        }) : <div className="empty-list-state"><strong>No assigned projects</strong><span>Your administrator will send an invitation when fieldwork is ready.</span></div>}
      </section>
      {hasDraft && <button className="list-row resume-row" onClick={() => onNavigate("collector")}><span className="resume-copy"><strong>Unfinished observation</strong><span>Saved on this device</span></span><Icon name="chevron-right" size={18} /></button>}
      {projects.length > 0 && <p className="page-note">Saved on this device before it is sent.</p>}
    </main>
  );
}
