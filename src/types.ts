export type View =
  | "home"
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

export interface SyncProgressEntry {
  phase: string;
  media: Record<string, number>;
}

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
  /** SPDX license identifier for the collected dataset (FAIR reuse). */
  license?: string | null;
  /** Dataset contact for reuse questions (FAIR access/reuse). */
  contactEmail?: string | null;
  /** Optional persistent identifier (DOI or landing-page URL). */
  datasetIdentifier?: string | null;
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

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FormScalar = string | number | boolean | null | undefined;
export type FormValue =
  | FormScalar
  | FormScalar[]
  | MediaAsset
  | MediaAsset[]
  | LocationValue
  | { [key: string]: FormValue }
  | Array<{ [key: string]: FormValue }>;

export type EnvironmentContext = Record<string, JsonValue>;
export type FormDraft = Record<string, FormValue>;
export type SubmissionValues = Record<string, FormValue>;

export interface Observation {
  id: string;
  projectId?: string;
  createdAt: string;
  clientCreatedAt?: string;
  schemaVersion?: number;
  deviceId?: string;
  status: SubmissionState;
  values: SubmissionValues;
  media?: MediaAsset[];
  /** Everything recorded automatically with the observation (device, screen,
   * connection, battery, timezone); never shown in the collection UI. */
  environment?: EnvironmentContext;
  /** The automatic attention-check answer (check key + selected value). */
  attentionResponse?: { checkKey: string; selectedValue: string } | null;
  correctsSubmissionId?: string;
}

export interface AppState {
  view: View;
  mode: AppMode;
  draft: FormDraft;
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

export function isRecord(val: FormValue): val is Record<string, FormValue>;
export function isRecord(
  val: JsonValue | undefined,
): val is Record<string, JsonValue>;
export function isRecord(
  val: FormValue | JsonValue | undefined,
): val is Record<string, FormValue> | Record<string, JsonValue> {
  return Boolean(val) && val instanceof Object && !Array.isArray(val);
}
