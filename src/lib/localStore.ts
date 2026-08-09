import type { AppState, MediaAsset, Observation, SubmissionState } from "../types";

const DB_NAME = "collect-local-v1";
const DB_VERSION = 2;
const APP_STATE_STORE = "app-state";
const SETTINGS_STORE = "settings";
const PROJECTS_STORE = "projects";
const DRAFTS_STORE = "drafts";
const SUBMISSIONS_STORE = "submissions";
const MEDIA_STORE = "media";
const OUTBOX_STORE = "outbox";
const RECEIPTS_STORE = "receipts";
const DEVICE_STATE_STORE = "device-state";
const STATE_KEY = "singleton";

const ALL_STORES = [
  APP_STATE_STORE,
  SETTINGS_STORE,
  PROJECTS_STORE,
  DRAFTS_STORE,
  SUBMISSIONS_STORE,
  MEDIA_STORE,
  OUTBOX_STORE,
  RECEIPTS_STORE,
  DEVICE_STATE_STORE,
];

export interface DurableSubmission {
  id: string;
  projectId: string;
  schemaVersionId: string;
  schemaVersion?: number;
  payload: Record<string, unknown>;
  payloadHash: string | null;
  clientCreatedAt: string;
  deviceId: string;
  appVersion: string;
  status: SubmissionState;
  correctsSubmissionId?: string;
}

export interface DurableMedia {
  id: string;
  submissionId: string;
  fieldId: string;
  mimeType: string;
  byteSize: number;
  originalFilename: string;
  capturedAt?: string;
  sha256?: string;
  blob?: Blob;
  uploadState: "QUEUED" | "SYNCED";
}

export interface OutboxOperation {
  id: string;
  operationType: "CREATE_SUBMISSION" | "UPLOAD_MEDIA" | "FINALIZE_SUBMISSION";
  entityId: string;
  projectId: string;
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastError: string | null;
  state: "QUEUED" | "IN_PROGRESS" | "ACKNOWLEDGED" | "RETRYABLE_ERROR" | "ACTION_REQUIRED";
}

function createRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      ALL_STORES.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
      });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to open local database"));
    request.onblocked = () => reject(new Error("A previous collect database connection is blocking an update"));
  });
}

export async function loadAppState(): Promise<Partial<AppState> | null> {
  if (!("indexedDB" in window)) return null;
  try {
    const database = await openDatabase();
    const transaction = database.transaction([APP_STATE_STORE, SUBMISSIONS_STORE], "readonly");
    const transactionComplete = waitForTransaction(transaction);
    const savedRequest = createRequest(transaction.objectStore(APP_STATE_STORE).get(STATE_KEY));
    const submissionsRequest = createRequest(transaction.objectStore(SUBMISSIONS_STORE).getAll());
    const [saved, submissionsResult] = await Promise.all([savedRequest, submissionsRequest]);
    const submissions = submissionsResult as Observation[];
    await transactionComplete;
    if (!saved && submissions.length === 0) return null;
    return {
      ...(saved as Partial<AppState> | null),
      ...(submissions.length ? { observations: submissions } : {}),
    };
  } catch {
    return null;
  }
}

export async function getStoredBackendKey(): Promise<string | null> {
  if (!("indexedDB" in window)) return null;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(SETTINGS_STORE, "readonly");
    const transactionComplete = waitForTransaction(transaction);
    const resultRequest = createRequest(transaction.objectStore(SETTINGS_STORE).get("backend"));
    const [result] = await Promise.all([resultRequest, transactionComplete]);
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export async function saveAppState(state: AppState, backendKey = "preview"): Promise<void> {
  if (!("indexedDB" in window)) throw new Error("IndexedDB is unavailable in this browser");
  const database = await openDatabase();
  const transaction = database.transaction([APP_STATE_STORE, SETTINGS_STORE, PROJECTS_STORE, DRAFTS_STORE, SUBMISSIONS_STORE], "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  transaction.objectStore(APP_STATE_STORE).put(state, STATE_KEY);
  transaction.objectStore(SETTINGS_STORE).put({ mode: state.mode, view: state.view }, "session");
  transaction.objectStore(SETTINGS_STORE).put(backendKey, "backend");
  transaction.objectStore(PROJECTS_STORE).put(state.project, state.project.id);
  state.projects?.forEach((project) => transaction.objectStore(PROJECTS_STORE).put(project, project.id));
  transaction.objectStore(DRAFTS_STORE).put(state.draft, "active");
  state.observations.forEach((observation) => transaction.objectStore(SUBMISSIONS_STORE).put(observation, observation.id));
  await transactionComplete;
}

/**
 * The local receipt boundary. A submission and its outbox operation are
 * committed in one IndexedDB transaction before the UI may say "saved".
 */
export async function commitLocalSubmission(input: {
  submission: DurableSubmission;
  media: DurableMedia[];
  observation: Observation;
}): Promise<void> {
  if (!("indexedDB" in window)) throw new Error("IndexedDB is unavailable in this browser");
  const database = await openDatabase();
  const transaction = database.transaction([SUBMISSIONS_STORE, MEDIA_STORE, OUTBOX_STORE], "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  transaction.objectStore(SUBMISSIONS_STORE).put(input.observation, input.submission.id);
  input.media.forEach((media) => transaction.objectStore(MEDIA_STORE).put(media, media.id));
  transaction.objectStore(OUTBOX_STORE).put({
    id: `submission:${input.submission.id}`,
    operationType: "CREATE_SUBMISSION",
    entityId: input.submission.id,
    projectId: input.submission.projectId,
    attempts: 0,
    createdAt: input.submission.clientCreatedAt,
    nextAttemptAt: input.submission.clientCreatedAt,
    lastError: null,
    state: "QUEUED",
  } satisfies OutboxOperation, `submission:${input.submission.id}`);
  input.media.forEach((media) => transaction.objectStore(OUTBOX_STORE).put({
    id: `media:${media.id}`,
    operationType: "UPLOAD_MEDIA",
    entityId: media.id,
    projectId: input.submission.projectId,
    attempts: 0,
    createdAt: input.submission.clientCreatedAt,
    nextAttemptAt: input.submission.clientCreatedAt,
    lastError: null,
    state: "QUEUED",
  } satisfies OutboxOperation, `media:${media.id}`));
  transaction.objectStore(OUTBOX_STORE).put({
    id: `finalize:${input.submission.id}`,
    operationType: "FINALIZE_SUBMISSION",
    entityId: input.submission.id,
    projectId: input.submission.projectId,
    attempts: 0,
    createdAt: input.submission.clientCreatedAt,
    nextAttemptAt: input.submission.clientCreatedAt,
    lastError: null,
    state: "QUEUED",
  } satisfies OutboxOperation, `finalize:${input.submission.id}`);
  await transactionComplete;
}

export interface LocalReceipt {
  submissionId: string;
  receivedAt: string;
  finalizedAt?: string | null;
  serverStatus?: string;
  demo?: boolean;
}

/**
 * This is the only function that may remove field-data operations from the
 * outbox. It is called only after a complete server receipt (or the explicit
 * local demo adapter) has been obtained.
 */
export async function markLocalSubmissionsSynced(ids: string[], receiptOverrides: Partial<LocalReceipt> = {}): Promise<void> {
  if (!("indexedDB" in window) || !ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction([SUBMISSIONS_STORE, MEDIA_STORE, OUTBOX_STORE, RECEIPTS_STORE], "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  const submissions = transaction.objectStore(SUBMISSIONS_STORE);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  const receipts = transaction.objectStore(RECEIPTS_STORE);
  ids.forEach((id) => {
    const request = submissions.get(id);
    request.onsuccess = () => {
      const observation = request.result as Observation | undefined;
      if (!observation) return;
      submissions.put({ ...observation, status: "SYNCED" }, id);
      observation.media?.forEach((asset) => {
        const mediaRequest = transaction.objectStore(MEDIA_STORE).get(asset.id);
        mediaRequest.onsuccess = () => {
          const media = mediaRequest.result as DurableMedia | undefined;
          if (media) transaction.objectStore(MEDIA_STORE).put({ ...media, uploadState: "SYNCED" }, asset.id);
        };
        outbox.delete(`media:${asset.id}`);
      });
      receipts.put({
        submissionId: id,
        receivedAt: receiptOverrides.receivedAt ?? new Date().toISOString(),
        finalizedAt: receiptOverrides.finalizedAt ?? null,
        serverStatus: receiptOverrides.serverStatus ?? "COMPLETE",
        demo: receiptOverrides.demo ?? false,
      }, id);
    };
    outbox.delete(`submission:${id}`);
    outbox.delete(`finalize:${id}`);
  });
  await transactionComplete;
}

export async function setLocalSubmissionStatus(id: string, status: SubmissionState): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(SUBMISSIONS_STORE, "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(SUBMISSIONS_STORE);
  const request = store.get(id);
  request.onsuccess = () => {
    const observation = request.result as Observation | undefined;
    if (observation) store.put({ ...observation, status }, id);
  };
  await transactionComplete;
}

export async function markOutboxOperation(operationId: string, state: OutboxOperation["state"]): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(OUTBOX_STORE);
  const request = store.get(operationId);
  request.onsuccess = () => {
    const operation = request.result as OutboxOperation | undefined;
    if (operation) store.put({ ...operation, state }, operationId);
  };
  await transactionComplete;
}

export async function recordOutboxFailure(id: string, message: string, actionRequired = false): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction([SUBMISSIONS_STORE, OUTBOX_STORE], "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  const submissions = transaction.objectStore(SUBMISSIONS_STORE);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  const submissionRequest = submissions.get(id);
  let observation: Observation | undefined;
  let operations: OutboxOperation[] | undefined;
  const applyFailure = () => {
    if (!observation || !operations) return;
    const mediaIds = new Set((observation.media ?? []).map((asset) => asset.id));
    const now = Date.now();
    operations
      .filter((operation) => operation.entityId === id || mediaIds.has(operation.entityId))
      .forEach((operation) => {
        const attempts = operation.attempts + 1;
        const delay = Math.min(30 * 60 * 1000, 1000 * (2 ** Math.min(attempts, 10))) + Math.floor(Math.random() * 1000);
        outbox.put({
          ...operation,
          attempts,
          lastError: message,
          nextAttemptAt: new Date(now + delay).toISOString(),
          state: actionRequired ? "ACTION_REQUIRED" : "RETRYABLE_ERROR",
        }, operation.id);
      });
  };
  submissionRequest.onsuccess = () => {
    observation = submissionRequest.result as Observation | undefined;
    if (observation) submissions.put({ ...observation, status: actionRequired ? "ACTION_REQUIRED" : "RETRYABLE_ERROR" }, id);
    applyFailure();
  };
  const outboxRequest = outbox.getAll();
  outboxRequest.onsuccess = () => {
    operations = outboxRequest.result as OutboxOperation[];
    applyFailure();
  };
  await transactionComplete;
}

export async function getOutboxOperations(): Promise<OutboxOperation[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const transactionComplete = waitForTransaction(transaction);
  const rows = await createRequest(transaction.objectStore(OUTBOX_STORE).getAll()) as OutboxOperation[];
  await transactionComplete;
  return rows;
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (!("indexedDB" in window)) return crypto.randomUUID();
  const database = await openDatabase();
  const readTransaction = database.transaction(DEVICE_STATE_STORE, "readonly");
  const existing = await createRequest(readTransaction.objectStore(DEVICE_STATE_STORE).get("device_id"));
  if (typeof existing === "string") return existing;
  const deviceId = crypto.randomUUID();
  const writeTransaction = database.transaction(DEVICE_STATE_STORE, "readwrite");
  writeTransaction.objectStore(DEVICE_STATE_STORE).put(deviceId, "device_id");
  await waitForTransaction(writeTransaction);
  return deviceId;
}

interface SyncLease {
  owner: string;
  expiresAt: number;
}

/** A short durable lease prevents normal multi-tab contention. Server IDs and
 * unique constraints remain the correctness backstop if two tabs race. */
export async function acquireSyncLease(owner: string, ttlMs = 30_000): Promise<boolean> {
  if (!("indexedDB" in window)) return false;
  const database = await openDatabase();
  const transaction = database.transaction(DEVICE_STATE_STORE, "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  let acquired = false;
  const store = transaction.objectStore(DEVICE_STATE_STORE);
  const request = store.get("sync_lease");
  request.onsuccess = () => {
    const current = request.result as SyncLease | undefined;
    if (!current || current.expiresAt <= Date.now() || current.owner === owner) {
      store.put({ owner, expiresAt: Date.now() + ttlMs } satisfies SyncLease, "sync_lease");
      acquired = true;
    }
  };
  await transactionComplete;
  return acquired;
}

export async function releaseSyncLease(owner: string): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(DEVICE_STATE_STORE, "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  const store = transaction.objectStore(DEVICE_STATE_STORE);
  const request = store.get("sync_lease");
  request.onsuccess = () => {
    const current = request.result as SyncLease | undefined;
    if (current?.owner === owner) store.delete("sync_lease");
  };
  await transactionComplete;
}

export async function estimateLocalStorage(): Promise<{ usage: number | null; quota: number | null; persisted: boolean | null }> {
  if (!("storage" in navigator)) return { usage: null, quota: null, persisted: null };
  const estimate = await navigator.storage.estimate();
  const persisted = "persisted" in navigator.storage ? await navigator.storage.persisted() : null;
  return { usage: estimate.usage ?? null, quota: estimate.quota ?? null, persisted };
}

export function mediaFromAssets(assets: MediaAsset[], submissionId: string, fieldId = "unknown"): DurableMedia[] {
  return assets.map((asset) => ({
    id: asset.id,
    submissionId,
    fieldId: asset.fieldId ?? fieldId,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    originalFilename: asset.name,
    capturedAt: asset.capturedAt,
    sha256: asset.sha256,
    blob: asset.blob,
    uploadState: "QUEUED",
  }));
}
