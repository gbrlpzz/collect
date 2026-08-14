import { useState } from "react";
import { AdminProject, type AdminTab } from "../components/AdminDashboard";
import { TopBar } from "../components/TopBar";
import { Icon } from "../components/Icon";
import { Eyebrow } from "../components/ui";
import { projectFields } from "../data/schemaFixtures";
import type { ContributorReadiness } from "../lib/adminBackend";
import type { Project } from "../types";

export type { AdminTab };

const adminDemoProject: Project = {
  id: "valpuesta-fieldwork",
  organization: "Liminal Research Group",
  organizationMark: "L",
  name: "Vernacular buildings — Valpuesta",
  description:
    "Occupancy, masonry condition, and structural assessment survey.",
  instructions:
    "Record building type, occupancy status, and field photographs.",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "valpuesta@liminal-lab.org",
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "2026-08-14T09:32:00.000Z",
  fields: projectFields,
};

const adminDemoReadinessRows: ContributorReadiness[] = [
  {
    id: "user-1",
    email: "elena@liminal-lab.org",
    status: "Active",
    ready: true,
    pending: 0,
    lastSeen: new Date(Date.now() - 1000 * 60).toISOString(),
    received: 42,
    attentionScore: 95,
    attentionChecksTotal: 42,
    attentionCorrectTotal: 40,
    consentGranted: true,
  },
  {
    id: "user-2",
    email: "marcus@liminal-lab.org",
    status: "Active",
    ready: true,
    pending: 0,
    lastSeen: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    received: 38,
    attentionScore: 100,
    attentionChecksTotal: 38,
    attentionCorrectTotal: 38,
    consentGranted: true,
  },
  {
    id: "user-3",
    email: "claire@liminal-lab.org",
    status: "Syncing",
    ready: false,
    pending: 1,
    lastSeen: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    received: 24,
    attentionScore: 88,
    attentionChecksTotal: 24,
    attentionCorrectTotal: 21,
    consentGranted: true,
  },
];

function DarkStatusBar() {
  return (
    <div className="hp-status-bar hp-status-bar-dark" aria-hidden="true">
      <span className="hp-status-time">9:41</span>
      <span className="hp-status-icons">
        <svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="0.8" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.8" />
          <rect x="9" y="3" width="3" height="9" rx="0.8" />
          <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.8" />
        </svg>
        <svg
          viewBox="0 0 16 12"
          width="16"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M1.5 8.5a9.5 9.5 0 0 1 13 0" />
          <path d="M4 6.2a6.4 6.4 0 0 1 8 0" />
          <path d="M6.5 4a3.6 3.6 0 0 1 3 0" />
        </svg>
        <svg
          viewBox="0 0 25 12"
          width="25"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        >
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="3" />
          <rect
            x="2.2"
            y="2.2"
            width="15"
            height="7.6"
            rx="1.6"
            fill="currentColor"
            stroke="none"
          />
          <path
            d="M23.5 4v4a2 2 0 0 0 0-4Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      </span>
    </div>
  );
}

export function AdminWalkthrough({
  initialTab = "setup",
  onTabChange,
}: {
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}) {
  const [project, setProject] = useState<Project>(adminDemoProject);
  const [view, setView] = useState<"project" | "list">("project");

  const handleTabChange = (nextTab: AdminTab) => {
    onTabChange?.(nextTab);
  };

  return (
    <div className="hp-iphone-wrap">
      <div className="hp-iphone hp-iphone-dark">
        <div className="hp-iphone-screen hp-iphone-screen-dark">
          <div className="hp-dynamic-island" aria-hidden="true" />
          <DarkStatusBar />

          <div
            className="hp-app-viewport"
            data-mode="admin"
            data-surface="admin"
            data-preview="true"
          >
            <div
              className="app-shell"
              data-mode="admin"
              data-surface="admin"
              data-view={view === "list" ? "admin" : "admin-project"}
              data-preview="true"
            >
              <TopBar
                mode="admin"
                view={view === "list" ? "admin" : "admin-project"}
                onNavigate={() => setView("list")}
                isPreview={true}
              />

              <div className="main-shell">
                {view === "list" ? (
                  <main className="page page-admin">
                    <div className="page-heading">
                      <Eyebrow>Projects</Eyebrow>
                      <h1>Field projects</h1>
                    </div>
                    <div className="project-list">
                      <button
                        type="button"
                        className="project-row"
                        onClick={() => setView("project")}
                      >
                        <div className="project-row-copy">
                          <strong>{project.name}</strong>
                          <span>{project.organization} · Active</span>
                        </div>
                        <div className="project-row-meta">
                          <span>104 sent</span>
                          <Icon name="chevron-right" size={16} />
                        </div>
                      </button>
                    </div>
                  </main>
                ) : (
                  <AdminProject
                    project={project}
                    previewRows={adminDemoReadinessRows}
                    initialTab={initialTab}
                    onTabChange={handleTabChange}
                    onBack={() => setView("list")}
                    onToast={() => undefined}
                    onExport={() => undefined}
                    onSchemaPublished={(updated) => setProject(updated)}
                    onToggleStatus={() =>
                      setProject((p) => ({
                        ...p,
                        status: p.status === "active" ? "closed" : "active",
                      }))
                    }
                  />
                )}
              </div>
            </div>
          </div>

          <div className="hp-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
