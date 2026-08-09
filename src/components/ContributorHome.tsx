import type { Observation, Project, View } from "../types";
import { Icon } from "./Icon";
import { Avatar, Button, Divider, Eyebrow, StatusBadge } from "./Primitives";

interface ContributorHomeProps {
  project: Project;
  observations: Observation[];
  hasDraft: boolean;
  onNavigate: (view: View) => void;
}

export function ContributorHome({ project, observations, hasDraft, onNavigate }: ContributorHomeProps) {
  const syncedCount = Math.max(0, project.completeSubmissions + observations.filter((item) => item.status === "SYNCED").length - (project.id === "project-valladolid-houses" ? 2 : 0));
  const waitingCount = observations.filter((item) => item.status !== "SYNCED").length;
  const recent = observations.slice(-3).reverse();

  return (
    <main className="page page-contributor">
      <div className="page-heading page-heading-home">
        <div>
          <Eyebrow>Fieldwork</Eyebrow>
          <h1>Good morning, Gabriele.</h1>
          <p className="lede">Your projects are ready to use without a connection.</p>
        </div>
        <div className="last-sync desktop-only">Last successful sync · today at 09:32</div>
      </div>

      <section className="project-hero-card" aria-labelledby="active-project-title">
        <div className="project-hero-topline">
          <StatusBadge tone="dark">Ready offline</StatusBadge>
          <button className="inline-more" aria-label="More project actions">
            <Icon name="more" size={19} />
          </button>
        </div>
        <div className="project-identity">
          <div className="organization-mark">{project.organizationMark}</div>
          <div>
            <p className="organization-name">{project.organization}</p>
            <h2 id="active-project-title">{project.name}</h2>
            <p className="muted-copy">{project.description}</p>
          </div>
        </div>
        <Divider />
        <div className="project-hero-footer">
          <div className="sync-counts">
            <span><strong>{syncedCount}</strong> synced</span>
            <span className="count-separator">·</span>
            <span><strong>{waitingCount}</strong> waiting</span>
          </div>
          <Button variant="primary" iconAfter="arrow-right" onClick={() => onNavigate("project")}>
            Open project
          </Button>
        </div>
      </section>

      {hasDraft && (
        <button className="resume-card" onClick={() => onNavigate("collector")}>
          <span className="resume-icon"><Icon name="file" size={19} /></span>
          <span className="resume-copy">
            <strong>Unfinished observation</strong>
            <span>Saved on this device · continue where you left off</span>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      )}

      <div className="home-grid">
        <section className="surface-card recent-card">
          <div className="card-heading-row">
            <div>
              <Eyebrow>Recent activity</Eyebrow>
              <h2>Observations</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("project")}>View project <Icon name="arrow-right" size={15} /></button>
          </div>
          <div className="observation-list">
            {recent.map((observation) => (
              <div className="observation-row" key={observation.id}>
                <span className={`observation-state ${observation.status === "SYNCED" ? "state-synced" : "state-local"}`}>
                  <Icon name={observation.status === "SYNCED" ? "check" : "cloud"} size={15} />
                </span>
                <div className="observation-main">
                  <strong>{String(observation.values.site_code ?? "New observation")}</strong>
                  <span>{observation.createdAt}</span>
                </div>
                <span className="observation-status">{observation.status === "SYNCED" ? "Synced" : observation.status === "ACTION_REQUIRED" ? "Needs attention" : "Saved locally"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card storage-card">
          <div className="storage-card-top">
            <div className="storage-icon"><Icon name="shield" size={20} /></div>
            <StatusBadge tone="soft">Protected locally</StatusBadge>
          </div>
          <h2>Your fieldwork stays on this device</h2>
          <p>Every observation is saved before it is sent. A weak connection only slows synchronization.</p>
          <div className="storage-meta">
            <span><Icon name="archive" size={15} /> Local storage available</span>
            <span><Icon name="signal" size={15} /> Sync when connected</span>
          </div>
          <button className="text-button storage-link" onClick={() => onNavigate("project")}>View sync status <Icon name="arrow-right" size={15} /></button>
        </section>
      </div>

      <section className="assigned-row">
        <div>
          <Eyebrow>Assigned to you</Eyebrow>
          <h2>1 active project</h2>
        </div>
        <div className="assigned-people">
          <Avatar initials="GP" />
          <span className="assigned-copy">You are collecting for {project.organization}</span>
        </div>
      </section>
    </main>
  );
}
