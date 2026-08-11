export type View =
  | "home"
  | "project"
  | "collector"
  | "admin"
  | "admin-project"
  | "new-project";

export type AppMode = "contributor" | "admin";

/**
 * A local state is deliberately more precise than a boolean synced flag.
 * The UI may summarize these states, but the durable queue keeps them so an
 * interrupted sync can resume from a known phase.
 */
export type SubmissionState =
  | "DRAFT"
  | "SAVED_LOCAL"
  | "QUEUED"
  | "SYNCING_METADATA"
  | "SYNCING_MEDIA"
  | "FINALIZING"
  | "SYNCED"
  | "RETRYABLE_ERROR"
  | "ACTION_REQUIRED";

export function isSubmissionPending(status: SubmissionState): boolean {
  return status !== "SYNCED" && status !== "DRAFT";
}

export function isSubmissionRetryable(status: SubmissionState): boolean {
  return isSubmissionPending(status) && status !== "ACTION_REQUIRED";
}

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "single_choice"
  | "multiple_choice"
  | "tri_state"
  | "date"
  | "datetime"
  | "location"
  | "photo"
  | "audio"
  | "repeatable_group"
  | "heading";

export interface FieldOption {
  id: string;
  value: string;
  label: string;
}

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  /** Nullable future-facing hook for ontology mapping; not surfaced in the MVP UI. */
  semantic_uri?: string | null;
  config?: Record<string, string | number | boolean>;
  options?: FieldOption[];
  children?: FieldDefinition[];
}

export interface Project {
  id: string;
  organizationId?: string;
  organization: string;
  organizationMark: string;
  name: string;
  description: string;
  instructions: string;
  status: "active" | "closed";
  schemaVersion: number;
  schemaId?: string;
  contributors: number;
  completeSubmissions: number;
  lastReceived: string;
  fields: FieldDefinition[];
}

export interface LocationValue {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  provider?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
  capturedAt?: string;
  captureSource?: string;
  sha256?: string;
  fieldId?: string;
  blob?: Blob;
}

export interface Observation {
  id: string;
  projectId?: string;
  createdAt: string;
  clientCreatedAt?: string;
  schemaVersion?: number;
  deviceId?: string;
  status: SubmissionState;
  values: Record<string, unknown>;
  media?: MediaAsset[];
  correctsSubmissionId?: string;
}

export interface AppState {
  view: View;
  mode: AppMode;
  draft: Record<string, unknown>;
  observations: Observation[];
  lastSavedAt: string | null;
  lastSyncAt: string | null;
  storagePersistence: "unknown" | "granted" | "not-granted";
  storageUsage: number | null;
  project: Project;
  projects?: Project[];
  fieldworkComplete?: Record<string, boolean>;
  /** Projects whose metadata, schema, and shell assets have been stored for offline use. */
  offlineReady?: Record<string, boolean>;
}
