import type { Project } from "../types";
import { projectFields } from "./schemaFixtures";

export const demoProject: Project = {
  id: "project-valladolid-houses",
  organization: "Liminal Research Group",
  organizationMark: "L",
  name: "Valladolid Rural Houses",
  description: "Occupancy and condition survey",
  instructions:
    "Move through the assigned rural houses in sequence. Capture what is observable, keep uncertain answers explicit, and add one wide photo before submitting.",
  status: "active",
  schemaVersion: 3,
  contributors: 3,
  completeSubmissions: 104,
  lastReceived: "Today at 09:32",
  fields: projectFields,
};

export const emptyProject: Project = {
  id: "empty-project",
  organization: "Field organization",
  organizationMark: "O",
  name: "No project yet",
  description: "Create a project to begin collecting.",
  instructions: "",
  status: "active",
  schemaVersion: 0,
  contributors: 0,
  completeSubmissions: 0,
  lastReceived: "No submissions yet",
  fields: [],
};

export const initialState = {
  view: "home" as const,
  mode: "contributor" as const,
  draft: {
    observed_date: new Date().toISOString().slice(0, 10),
  },
  observations: [
    {
      id: "obs-104",
      createdAt: "Today at 09:32",
      status: "SYNCED" as const,
      values: { site_code: "VA-022" },
    },
    {
      id: "obs-103",
      createdAt: "Today at 09:18",
      status: "SYNCED" as const,
      values: { site_code: "VA-021" },
    },
  ],
  lastSavedAt: null,
  lastSyncAt: null,
  storagePersistence: "unknown" as const,
  storageUsage: null,
  fieldworkComplete: {},
  offlineReady: { [demoProject.id]: true },
  project: demoProject,
  projects: [demoProject],
};
