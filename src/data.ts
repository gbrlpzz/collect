import type { FieldDefinition, Project } from "./types";

const choice = (id: string, value: string, label: string) => ({ id, value, label });

export const projectFields: FieldDefinition[] = [
  {
    id: "field-section-site",
    key: "site_section",
    label: "Site observation",
    type: "heading",
    description: "Capture the place before recording its condition.",
  },
  {
    id: "field-site-code",
    key: "site_code",
    label: "Site code",
    type: "short_text",
    description: "Use the code printed on the site sheet.",
    required: true,
    config: { placeholder: "e.g. VA-023", maxLength: 32 },
  },
  {
    id: "field-building-type",
    key: "building_type",
    label: "Building type",
    type: "single_choice",
    required: true,
    options: [
      choice("building-house", "house", "House"),
      choice("building-farm", "farm", "Farm building"),
      choice("building-workshop", "workshop", "Workshop"),
      choice("building-other", "other", "Other"),
    ],
  },
  {
    id: "field-occupancy",
    key: "building_occupancy",
    label: "Is the building occupied?",
    type: "tri_state",
    description: "Choose unknown when the evidence is inconclusive.",
    required: true,
  },
  {
    id: "field-condition",
    key: "building_condition",
    label: "Observed condition",
    type: "single_choice",
    options: [
      choice("condition-maintained", "maintained", "Maintained"),
      choice("condition-repair", "repair", "Needs repair"),
      choice("condition-derelict", "derelict", "Derelict"),
      choice("condition-ruin", "ruin", "Ruin"),
    ],
  },
  {
    id: "field-features",
    key: "visible_features",
    label: "Visible features",
    type: "multiple_choice",
    description: "Select every feature visible from the survey position.",
    options: [
      choice("feature-stone", "stone", "Stonework"),
      choice("feature-timber", "timber", "Timber"),
      choice("feature-tile", "tile", "Tile roof"),
      choice("feature-solar", "solar", "Solar equipment"),
    ],
  },
  {
    id: "field-section-provenance",
    key: "provenance_section",
    label: "Provenance",
    type: "heading",
    description: "The app keeps these details with the observation.",
  },
  {
    id: "field-observed-date",
    key: "observed_date",
    label: "Date observed",
    type: "date",
    required: true,
  },
  {
    id: "field-people",
    key: "people_count",
    label: "People present",
    type: "number",
    description: "Leave blank if not observed.",
    config: { integer: true, min: 0, unit: "people" },
  },
  {
    id: "field-location",
    key: "location",
    label: "Location",
    type: "location",
    description: "Capture coordinates and accuracy from the device.",
    required: true,
  },
  {
    id: "field-photo",
    key: "site_photos",
    label: "Site photos",
    type: "photo",
    description: "Preserve original files. Add at least one contextual image.",
    required: true,
    config: { minCount: 1, maxCount: 5, multiple: true },
  },
  {
    id: "field-notes",
    key: "notes",
    label: "Field notes",
    type: "long_text",
    description: "Record evidence, uncertainty, or anything that needs context.",
    config: { maxLength: 1200 },
  },
];

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
  project: demoProject,
};
