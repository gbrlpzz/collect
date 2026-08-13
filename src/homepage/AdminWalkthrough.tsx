import { useState } from "react";
import { AdminProject } from "../components/AdminDashboard";
import { projectFields } from "../data/schemaFixtures";
import type { Project } from "../types";

const demoAdminProject: Project = {
  id: "valpuesta-project",
  organization: "Liminal Research Group",
  organizationMark: "L",
  name: "Vernacular buildings — Valpuesta",
  description: "Occupancy, masonry condition, and structural assessment survey",
  instructions: "Survey all vernacular buildings in the Valpuesta valley.",
  status: "active",
  schemaVersion: 1,
  license: "CC-BY-4.0",
  contactEmail: "research@liminal-lab.org",
  datasetIdentifier: "10.5281/zenodo.7891234",
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "2026-08-13T09:32:00.000Z",
  fields: projectFields,
};

export function AdminWalkthrough() {
  const [project, setProject] = useState<Project>(demoAdminProject);

  return (
    <div className="hp-admin-console-window">
      <div className="hp-console-titlebar">
        <div className="hp-traffic-lights" aria-hidden="true">
          <span className="hp-traffic-close" />
          <span className="hp-traffic-min" />
          <span className="hp-traffic-max" />
        </div>
        <span className="hp-console-title">collect Admin — {project.name}</span>
      </div>
      <div className="hp-admin-console-body">
        <AdminProject
          project={project}
          onBack={() => undefined}
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
      </div>
    </div>
  );
}
