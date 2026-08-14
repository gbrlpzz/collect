import { useEffect, useState } from "react";
import { AdminProject } from "../components/AdminDashboard";
import { projectFields } from "../data/schemaFixtures";
import type { Project } from "../types";

type AdminTab = "setup" | "contributors" | "export";

const demoAdminProject: Project = {
  id: "demo-admin-project",
  organization: "Liminal Research Group",
  organizationMark: "L",
  name: "Vernacular buildings — Valpuesta",
  description: "Occupancy, masonry condition, and structural assessment survey",
  instructions: "Record building typologies and condition assessments.",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "valpuesta@liminal-lab.org",
  datasetIdentifier: "10.5281/zenodo.0000000",
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "2026-08-14T09:32:00.000Z",
  fields: projectFields,
};

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
            rx="1.5"
            fill="currentColor"
          />
          <path d="M23 4v4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Step 1: Admin Preview.
 * Live-linked directly to the production AdminProject component (src/components/AdminDashboard.tsx).
 * Renders in the dark iPhone mock-up using the real admin styling tokens.
 */
export function AdminWalkthrough({
  initialTab = "setup",
  onTabChange,
}: {
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
}) {
  const [tab, setTab] = useState<AdminTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (nextTab: AdminTab) => {
    setTab(nextTab);
    onTabChange?.(nextTab);
  };

  return (
    <div className="hp-iphone-wrap">
      <div className="hp-iphone hp-iphone-dark">
        <div className="hp-iphone-screen hp-iphone-screen-dark">
          <div className="hp-dynamic-island" aria-hidden="true" />
          <DarkStatusBar />

          <div className="hp-app-viewport hp-admin-viewport">
            <div
              className="app-shell"
              data-mode="admin"
              data-surface="admin"
              data-view="admin-project"
            >
              <div className="main-shell">
                <AdminProject
                  project={demoAdminProject}
                  initialTab={tab}
                  onTabChange={handleTabChange}
                  onBack={() => undefined}
                  onToast={() => undefined}
                  onExport={() => undefined}
                  onSchemaPublished={() => undefined}
                  onToggleStatus={() => undefined}
                  onPreviewContributor={() => undefined}
                />
              </div>
            </div>
          </div>

          <div className="hp-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
