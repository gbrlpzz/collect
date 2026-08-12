import type {
  AppState,
  MediaAsset,
  Observation,
  SubmissionState,
} from "../types";

const DB_NAME = "collect-local-v1";
const DB_VERSION = 2;
let activeLocalScope = "default";

/**
 * Each authenticated account gets its own IndexedDB database. This prevents
 * cached projects, drafts, media, and outbox rows from being reused when a
 * different person signs in on the same browser/device. The default scope is
 * retained for the isolated unit-test database.
 */
export function setLocalScope(scope: string): void {
  const normalized = scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "_")
    .slice(0, 120);
  activeLocalScope = normalized || "default";
}

export function localDatabaseName(): string {
  return activeLocalScope === "default"
    ? DB_NAME
    : `${DB_NAME}-${activeLocalScope}`;
}
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
const EXPLICIT_SIGN_OUT_KEY = "explicit-sign-out";

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
  /** Everything recorded automatically with the observation (device, screen,
   * connection, battery, timezone); never shown in the collection UI. */
  environment?: Record<string, unknown>;
  attentionResponse?: { checkKey: string; selectedValue: string } | null;
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
  captureSource?: string;
  sha256?: string;
  blob?: Blob;
  uploadState: "QUEUED" | "SYNCED";
}

/**
 * Persist selected draft media blobs immediately (before any debounced
 * autosave), so a force-kill cannot lose a photo/audio the contributor just
 * picked. submissionId is empty until the observation is submitted.
 */
export async function saveDraftMedia(assets: MediaAsset[]): Promise<void> {
  if (!("indexedDB" in window) || !assets.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readwrite");
  const store = transaction.objectStore(MEDIA_STORE);
  for (const asset of assets) {
    if (!asset.blob) continue;
    // A late draft write must never clobber a row that already belongs to a
    // submitted observation (rapid pick → submit race).
    const existingRequest = store.get(asset.id);
    const existing = await new Promise<DurableMedia | undefined>((resolve) => {
      existingRequest.onsuccess = () => resolve(existingRequest.result);
      existingRequest.onerror = () => resolve(undefined);
    });
    if (existing?.submissionId) continue;
    store.put(
      {
        id: asset.id,
        submissionId: "",
        fieldId: asset.fieldId ?? "",
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
        originalFilename: asset.name,
        capturedAt: asset.capturedAt,
        captureSource: asset.captureSource,
        sha256: asset.sha256,
        blob: asset.blob,
        uploadState: "QUEUED",
      } satisfies DurableMedia,
      asset.id,
    );
  }
  await waitForTransaction(transaction);
}

/** Drop draft media rows no longer referenced by the active draft. */
export async function deleteDraftMedia(ids: string[]): Promise<void> {
  if (!("indexedDB" in window) || !ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(MEDIA_STORE, "readwrite");
  const store = transaction.objectStore(MEDIA_STORE);
  for (const id of ids) {
    const request = store.get(id);
    request.onsuccess = () => {
      const row = request.result as DurableMedia | undefined;
      // Only delete rows that are still draft-scoped (never submitted).
      if (row && !row.submissionId) store.delete(id);
    };
  }
  await waitForTransaction(transaction);
}

function stripBlobsFromMedia(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const assets = value.filter(
    (item): item is MediaAsset =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "name" in item,
  );
  if (!assets.length) return value;
  return assets.map(({ blob: _blob, ...metadata }) => ({
    ...metadata,
    blob: undefined,
  }));
}

export interface OutboxOperation {
  id: string;
  operationType: "CREATE_SUBMISSION" | "UPLOAD_MEDIA" | "FINALIZE_SUBMISSION";
  entityId: string;
  projectId: string;
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  lastError: string | null;
  state:
    | "QUEUED"
    | "IN_PROGRESS"
    | "ACKNOWLEDGED"
    | "RETRYABLE_ERROR"
    | "ACTION_REQUIRED";
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
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(localDatabaseName(), DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      ALL_STORES.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName))
          database.createObjectStore(storeName);
      });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Unable to open local database"));
    request.onblocked = () =>
      reject(
        new Error(
          "A previous collect database connection is blocking an update",
        ),
      );
  });
}

function openDatabaseByName(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      ALL_STORES.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName))
          database.createObjectStore(storeName);
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function loadAppState(): Promise<Partial<AppState> | null> {
  if (!("indexedDB" in window)) return null;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      [APP_STATE_STORE, SUBMISSIONS_STORE, MEDIA_STORE],
      "readonly",
    );
    const transactionComplete = waitForTransaction(transaction);
    const savedRequest = createRequest(
      transaction.objectStore(APP_STATE_STORE).get(STATE_KEY),
    );
    const submissionsRequest = createRequest(
      transaction.objectStore(SUBMISSIONS_STORE).getAll(),
    );
    const [saved, submissionsResult] = await Promise.all([
      savedRequest,
      submissionsRequest,
    ]);
    const submissions = submissionsResult as Observation[];
    const mediaRequest = transaction.objectStore(MEDIA_STORE).getAll();
    const mediaRows = (await createRequest(mediaRequest)) as DurableMedia[];
    await transactionComplete;
    if (!saved && submissions.length === 0) return null;
    // Media blobs are stored once in MEDIA_STORE; reattach them to the
    // metadata-only observation rows so uploads work after a reload.
    const mediaById = new Map(mediaRows.map((media) => [media.id, media]));
    const hydrateAssets = (value: unknown): unknown => {
      if (!Array.isArray(value)) return value;
      const assets = value.filter(
        (item): item is MediaAsset =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "name" in item,
      );
      if (!assets.length) return value;
      let changed = false;
      const media = assets.map((asset) => {
        const durable = mediaById.get(asset.id);
        if (durable?.blob && !asset.blob) {
          changed = true;
          return { ...asset, blob: durable.blob };
        }
        return asset;
      });
      return changed ? media : value;
    };
    const hydrated = submissions.map((observation) => {
      if (!observation.media?.length) return observation;
      let changed = false;
      const media = observation.media.map((asset) => {
        const durable = mediaById.get(asset.id);
        if (durable?.blob && !asset.blob) {
          changed = true;
          return { ...asset, blob: durable.blob };
        }
        return asset;
      });
      return changed ? { ...observation, media } : observation;
    });
    const savedState = saved as Partial<AppState> | null;
    const draft = savedState?.draft
      ? Object.fromEntries(
          Object.entries(savedState.draft).map(([key, value]) => [
            key,
            hydrateAssets(value),
          ]),
        )
      : savedState?.draft;
    return {
      ...savedState,
      ...(draft !== savedState?.draft ? { draft } : {}),
      ...(hydrated.length ? { observations: hydrated } : {}),
    };
  } catch {
    return null;
  }
}

export interface StoredRecoveryData {
  submissions: Observation[];
  media: DurableMedia[];
  outbox: OutboxOperation[];
  drafts: unknown;
  projects: unknown;
  appState: unknown;
  receipts: unknown;
}

/**
 * Read every local store directly. This is the recovery-mode path: it works
 * even when the app-state singleton is missing or corrupt, and it is what the
 * recovery export and "known records" sync use when normal boot fails.
 */
export async function readStoredRecoveryData(): Promise<StoredRecoveryData> {
  const database = await openDatabase();
  const transaction = database.transaction(ALL_STORES, "readonly");
  const transactionComplete = waitForTransaction(transaction);
  const [submissions, media, outbox, drafts, projects, appState, receipts] =
    await Promise.all([
      createRequest(transaction.objectStore(SUBMISSIONS_STORE).getAll()),
      createRequest(transaction.objectStore(MEDIA_STORE).getAll()),
      createRequest(transaction.objectStore(OUTBOX_STORE).getAll()),
      createRequest(transaction.objectStore(DRAFTS_STORE).get("active")),
      createRequest(transaction.objectStore(PROJECTS_STORE).getAll()),
      createRequest(transaction.objectStore(APP_STATE_STORE).get(STATE_KEY)),
      createRequest(transaction.objectStore(RECEIPTS_STORE).getAll()),
    ]);
  await transactionComplete;
  return {
    submissions: submissions as Observation[],
    media: media as DurableMedia[],
    outbox: outbox as OutboxOperation[],
    drafts,
    projects,
    appState,
    receipts,
  };
}

/** A lightweight boot probe so the app can distinguish "empty database" from
 * "database needs attention" instead of silently booting blank. */
export async function probeLocalDatabase(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  if (!("indexedDB" in window))
    return { ok: false, error: "IndexedDB is not available in this browser" };
  try {
    const database = await openDatabase();
    const transaction = database.transaction(
      [APP_STATE_STORE, SUBMISSIONS_STORE],
      "readonly",
    );
    await Promise.all([
      createRequest(transaction.objectStore(APP_STATE_STORE).get(STATE_KEY)),
      createRequest(transaction.objectStore(SUBMISSIONS_STORE).getAll()),
      waitForTransaction(transaction),
    ]);
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The local database could not be opened",
    };
  }
}

export async function getStoredBackendKey(): Promise<string | null> {
  if (!("indexedDB" in window)) return null;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(SETTINGS_STORE, "readonly");
    const transactionComplete = waitForTransaction(transaction);
    const resultRequest = createRequest(
      transaction.objectStore(SETTINGS_STORE).get("backend"),
    );
    const [result] = await Promise.all([resultRequest, transactionComplete]);
    return typeof result === "string" ? result : null;
  } catch {
    return null;
  }
}

export async function getExplicitSignOut(): Promise<boolean> {
  if (!("indexedDB" in window)) return false;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(SETTINGS_STORE, "readonly");
    const transactionComplete = waitForTransaction(transaction);
    const resultRequest = createRequest(
      transaction.objectStore(SETTINGS_STORE).get(EXPLICIT_SIGN_OUT_KEY),
    );
    const [result] = await Promise.all([resultRequest, transactionComplete]);
    return result === true;
  } catch {
    return false;
  }
}

export async function setExplicitSignOut(value: boolean): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS_STORE, "readwrite");
  transaction.objectStore(SETTINGS_STORE).put(value, EXPLICIT_SIGN_OUT_KEY);
  await waitForTransaction(transaction);
}

export async function saveAppState(
  state: AppState,
  backendKey = "preview",
): Promise<void> {
  if (!("indexedDB" in window))
    throw new Error("IndexedDB is unavailable in this browser");
  const database = await openDatabase();
  const transaction = database.transaction(
    [
      APP_STATE_STORE,
      SETTINGS_STORE,
      PROJECTS_STORE,
      DRAFTS_STORE,
      SUBMISSIONS_STORE,
    ],
    "readwrite",
  );
  const transactionComplete = waitForTransaction(transaction);
  // The app-state singleton mirrors the same metadata-only shapes as the
  // submission store: blobs are never duplicated outside MEDIA_STORE.
  const stateWithoutBlobs: AppState = {
    ...state,
    draft: Object.fromEntries(
      Object.entries(state.draft).map(([key, value]) => [
        key,
        stripBlobsFromMedia(value),
      ]),
    ),
    observations: state.observations.map((observation) =>
      observation.media?.some((asset) => asset.blob !== undefined)
        ? {
            ...observation,
            media: observation.media.map(({ blob: _blob, ...metadata }) => ({
              ...metadata,
              blob: undefined,
            })),
          }
        : observation,
    ),
  };
  transaction.objectStore(APP_STATE_STORE).put(stateWithoutBlobs, STATE_KEY);
  transaction
    .objectStore(SETTINGS_STORE)
    .put({ mode: state.mode, view: state.view }, "session");
  transaction.objectStore(SETTINGS_STORE).put(backendKey, "backend");
  transaction.objectStore(PROJECTS_STORE).put(state.project, state.project.id);
  state.projects?.forEach((project) =>
    transaction.objectStore(PROJECTS_STORE).put(project, project.id),
  );
  const draftWithoutBlobs: Record<string, unknown> = Object.fromEntries(
    Object.entries(state.draft).map(([key, value]) => [
      key,
      stripBlobsFromMedia(value),
    ]),
  );
  transaction.objectStore(DRAFTS_STORE).put(draftWithoutBlobs, "active");
  // Media blobs live only in MEDIA_STORE (committed once at submit). The
  // app-state and submissions mirrors persist metadata only, so a debounced
  // autosave never re-serializes large media into quota repeatedly.
  state.observations.forEach((observation) => {
    const withoutBlobs: Observation = observation.media?.some(
      (asset) => asset.blob !== undefined,
    )
      ? {
          ...observation,
          media: observation.media.map(({ blob: _blob, ...metadata }) => ({
            ...metadata,
            blob: undefined,
          })),
        }
      : observation;
    const store = transaction.objectStore(SUBMISSIONS_STORE);
    // A stale autosave must never downgrade a durable SYNCED row back to a
    // pending status after the receipt transaction already cleared the outbox.
    const existingRequest = store.get(observation.id);
    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as Observation | undefined;
      if (existing?.status === "SYNCED" && withoutBlobs.status !== "SYNCED") {
        store.put(
          { ...existing, ...withoutBlobs, status: "SYNCED" },
          observation.id,
        );
        return;
      }
      store.put(withoutBlobs, observation.id);
    };
  });
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
  if (!("indexedDB" in window))
    throw new Error("IndexedDB is unavailable in this browser");
  const database = await openDatabase();
  const transaction = database.transaction(
    [SUBMISSIONS_STORE, MEDIA_STORE, OUTBOX_STORE],
    "readwrite",
  );
  const transactionComplete = waitForTransaction(transaction);
  transaction
    .objectStore(SUBMISSIONS_STORE)
    .put(input.observation, input.submission.id);
  input.media.forEach((media) =>
    transaction.objectStore(MEDIA_STORE).put(media, media.id),
  );
  transaction.objectStore(OUTBOX_STORE).put(
    {
      id: `submission:${input.submission.id}`,
      operationType: "CREATE_SUBMISSION",
      entityId: input.submission.id,
      projectId: input.submission.projectId,
      attempts: 0,
      createdAt: input.submission.clientCreatedAt,
      nextAttemptAt: input.submission.clientCreatedAt,
      lastAttemptAt: null,
      lastError: null,
      state: "QUEUED",
    } satisfies OutboxOperation,
    `submission:${input.submission.id}`,
  );
  input.media.forEach((media) =>
    transaction.objectStore(OUTBOX_STORE).put(
      {
        id: `media:${media.id}`,
        operationType: "UPLOAD_MEDIA",
        entityId: media.id,
        projectId: input.submission.projectId,
        attempts: 0,
        createdAt: input.submission.clientCreatedAt,
        nextAttemptAt: input.submission.clientCreatedAt,
        lastAttemptAt: null,
        lastError: null,
        state: "QUEUED",
      } satisfies OutboxOperation,
      `media:${media.id}`,
    ),
  );
  transaction.objectStore(OUTBOX_STORE).put(
    {
      id: `finalize:${input.submission.id}`,
      operationType: "FINALIZE_SUBMISSION",
      entityId: input.submission.id,
      projectId: input.submission.projectId,
      attempts: 0,
      createdAt: input.submission.clientCreatedAt,
      nextAttemptAt: input.submission.clientCreatedAt,
      lastAttemptAt: null,
      lastError: null,
      state: "QUEUED",
    } satisfies OutboxOperation,
    `finalize:${input.submission.id}`,
  );
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
export async function markLocalSubmissionsSynced(
  ids: string[],
  receiptOverrides: Partial<LocalReceipt> = {},
): Promise<void> {
  if (!("indexedDB" in window) || !ids.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(
    [SUBMISSIONS_STORE, MEDIA_STORE, OUTBOX_STORE, RECEIPTS_STORE],
    "readwrite",
  );
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
          if (media)
            transaction
              .objectStore(MEDIA_STORE)
              .put({ ...media, uploadState: "SYNCED" }, asset.id);
        };
        outbox.delete(`media:${asset.id}`);
      });
      receipts.put(
        {
          submissionId: id,
          receivedAt: receiptOverrides.receivedAt ?? new Date().toISOString(),
          finalizedAt: receiptOverrides.finalizedAt ?? null,
          serverStatus: receiptOverrides.serverStatus ?? "COMPLETE",
          demo: receiptOverrides.demo ?? false,
        },
        id,
      );
    };
    outbox.delete(`submission:${id}`);
    outbox.delete(`finalize:${id}`);
  });
  await transactionComplete;
}

export async function setLocalSubmissionStatus(
  id: string,
  status: SubmissionState,
): Promise<void> {
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

export async function markOutboxOperation(
  operationId: string,
  state: OutboxOperation["state"],
): Promise<void> {
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

export async function recordOutboxFailure(
  id: string,
  message: string,
  actionRequired = false,
): Promise<void> {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  const transaction = database.transaction(
    [SUBMISSIONS_STORE, OUTBOX_STORE],
    "readwrite",
  );
  const transactionComplete = waitForTransaction(transaction);
  const submissions = transaction.objectStore(SUBMISSIONS_STORE);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  const submissionRequest = submissions.get(id);
  let observation: Observation | undefined;
  let operations: OutboxOperation[] | undefined;
  const applyFailure = () => {
    if (!observation || !operations) return;
    const mediaIds = new Set(
      (observation.media ?? []).map((asset) => asset.id),
    );
    const now = Date.now();
    operations
      .filter(
        (operation) =>
          operation.entityId === id || mediaIds.has(operation.entityId),
      )
      .forEach((operation) => {
        const attempts = operation.attempts + 1;
        const delay =
          Math.min(30 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 10)) +
          Math.floor(Math.random() * 1000);
        outbox.put(
          {
            ...operation,
            attempts,
            lastError: message,
            lastAttemptAt: new Date(now).toISOString(),
            nextAttemptAt: new Date(now + delay).toISOString(),
            state: actionRequired ? "ACTION_REQUIRED" : "RETRYABLE_ERROR",
          },
          operation.id,
        );
      });
  };
  submissionRequest.onsuccess = () => {
    observation = submissionRequest.result as Observation | undefined;
    if (observation)
      submissions.put(
        {
          ...observation,
          status: actionRequired ? "ACTION_REQUIRED" : "RETRYABLE_ERROR",
        },
        id,
      );
    applyFailure();
  };
  const outboxRequest = outbox.getAll();
  outboxRequest.onsuccess = () => {
    operations = outboxRequest.result as OutboxOperation[];
    applyFailure();
  };
  await transactionComplete;
}

/**
 * Durable pending counts per project, derived from the outbox instead of
 * in-memory observation statuses. This is what device-status heartbeats
 * should report: media rows that were already acknowledged do not count.
 */
export async function getPendingOutboxCounts(projectId?: string): Promise<{
  pendingSubmissions: number;
  pendingMedia: number;
}> {
  const operations = await getOutboxOperations();
  const relevant = projectId
    ? operations.filter((operation) => operation.projectId === projectId)
    : operations;
  const submissionIds = new Set<string>();
  let pendingMedia = 0;
  for (const operation of relevant) {
    if (operation.state === "ACKNOWLEDGED") continue;
    if (operation.operationType === "UPLOAD_MEDIA") pendingMedia += 1;
    else submissionIds.add(operation.entityId);
  }
  return { pendingSubmissions: submissionIds.size, pendingMedia };
}

/** True when a durable server receipt exists for this submission. */
export async function hasLocalReceipt(id: string): Promise<boolean> {
  if (!("indexedDB" in window)) return false;
  try {
    const database = await openDatabase();
    const transaction = database.transaction(RECEIPTS_STORE, "readonly");
    const transactionComplete = waitForTransaction(transaction);
    const result = await createRequest(
      transaction.objectStore(RECEIPTS_STORE).get(id),
    );
    await transactionComplete;
    return result !== undefined && result !== null;
  } catch {
    return false;
  }
}

export async function getOutboxOperations(): Promise<OutboxOperation[]> {
  if (!("indexedDB" in window)) return [];
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const transactionComplete = waitForTransaction(transaction);
  const rows = (await createRequest(
    transaction.objectStore(OUTBOX_STORE).getAll(),
  )) as OutboxOperation[];
  await transactionComplete;
  return rows;
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (!("indexedDB" in window)) return crypto.randomUUID();
  const database = await openDatabase();
  const readTransaction = database.transaction(DEVICE_STATE_STORE, "readonly");
  const existing = await createRequest(
    readTransaction.objectStore(DEVICE_STATE_STORE).get("device_id"),
  );
  if (typeof existing === "string") return existing;
  const deviceId = crypto.randomUUID();
  const writeTransaction = database.transaction(
    DEVICE_STATE_STORE,
    "readwrite",
  );
  writeTransaction.objectStore(DEVICE_STATE_STORE).put(deviceId, "device_id");
  await waitForTransaction(writeTransaction);
  return deviceId;
}

interface SyncLease {
  owner: string;
  expiresAt: number;
}

const LEGACY_DB_NAME = "collect-local-v1";
const LEGACY_IMPORTED_TO_KEY = "legacy-imported-to";

/**
 * One-time upgrade path: before local databases were scoped per account, all
 * data lived in the shared "collect-local-v1" database. On first boot for an
 * account whose scoped database is empty, import the legacy rows (submissions,
 * media, outbox, drafts, projects, receipts, device state) so no cached
 * fieldwork is stranded by the upgrade. Only the first account that boots
 * after the upgrade adopts the legacy data; every other account starts clean.
 */
export async function migrateLegacyDatabase(scope: string): Promise<void> {
  if (!("indexedDB" in window) || scope === "default") return;
  try {
    // Scoped database must exist with its stores before we can copy into it.
    const scoped = await openDatabase();
    const scopedCount = await createRequest(
      scoped
        .transaction(SUBMISSIONS_STORE, "readonly")
        .objectStore(SUBMISSIONS_STORE)
        .count(),
    );
    if (scopedCount > 0) return;

    const legacy = await openDatabaseByName(LEGACY_DB_NAME);
    if (!legacy) return;

    const settingsRequest = createRequest(
      legacy
        .transaction(SETTINGS_STORE, "readonly")
        .objectStore(SETTINGS_STORE)
        .get(LEGACY_IMPORTED_TO_KEY),
    );
    const importedTo = await settingsRequest;
    if (typeof importedTo === "string" && importedTo !== scope) return;

    const copyStore = async (
      storeName: string,
      target: IDBObjectStore,
    ): Promise<void> => {
      const rows = await createRequest(
        legacy
          .transaction(storeName, "readonly")
          .objectStore(storeName)
          .getAll(),
      );
      for (const row of rows as Array<{ id?: string }>) {
        if (row && typeof row === "object" && "id" in row)
          target.put(row, row.id);
        else if (row && typeof row === "object") {
          // Keyed stores without an id field keep their own keys; re-put with
          // the original key by reading keys separately.
          const keys = await createRequest(
            legacy
              .transaction(storeName, "readonly")
              .objectStore(storeName)
              .getAllKeys(),
          );
          const values = await createRequest(
            legacy
              .transaction(storeName, "readonly")
              .objectStore(storeName)
              .getAll(),
          );
          for (let i = 0; i < keys.length; i += 1)
            target.put(values[i], keys[i]);
          return;
        }
      }
    };

    const writeTx = scoped.transaction(ALL_STORES, "readwrite");
    const writeComplete = waitForTransaction(writeTx);
    for (const storeName of ALL_STORES) {
      await copyStore(storeName, writeTx.objectStore(storeName));
    }
    await writeComplete;

    const markTx = legacy.transaction(SETTINGS_STORE, "readwrite");
    markTx.objectStore(SETTINGS_STORE).put(scope, LEGACY_IMPORTED_TO_KEY);
    await waitForTransaction(markTx);
  } catch {
    // The upgrade is best-effort; collection must never be blocked by it.
  }
}

/** A short durable lease prevents normal multi-tab contention. Server IDs and
 * unique constraints remain the correctness backstop if two tabs race. */
export async function acquireSyncLease(
  owner: string,
  ttlMs = 30_000,
): Promise<boolean> {
  if (!("indexedDB" in window)) return false;
  const database = await openDatabase();
  const transaction = database.transaction(DEVICE_STATE_STORE, "readwrite");
  const transactionComplete = waitForTransaction(transaction);
  let acquired = false;
  const store = transaction.objectStore(DEVICE_STATE_STORE);
  const request = store.get("sync_lease");
  request.onsuccess = () => {
    const current = request.result as SyncLease | undefined;
    if (
      !current ||
      current.expiresAt <= Date.now() ||
      current.owner === owner
    ) {
      store.put(
        { owner, expiresAt: Date.now() + ttlMs } satisfies SyncLease,
        "sync_lease",
      );
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

export async function estimateLocalStorage(): Promise<{
  usage: number | null;
  quota: number | null;
  persisted: boolean | null;
}> {
  if (!("storage" in navigator))
    return { usage: null, quota: null, persisted: null };
  const estimate = await navigator.storage.estimate();
  const persisted =
    "persisted" in navigator.storage
      ? await navigator.storage.persisted()
      : null;
  return {
    usage: estimate.usage ?? null,
    quota: estimate.quota ?? null,
    persisted,
  };
}

export function mediaFromAssets(
  assets: MediaAsset[],
  submissionId: string,
  fieldId = "unknown",
): DurableMedia[] {
  return assets.map((asset) => ({
    id: asset.id,
    submissionId,
    fieldId: asset.fieldId ?? fieldId,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    originalFilename: asset.name,
    capturedAt: asset.capturedAt,
    captureSource: asset.captureSource,
    sha256: asset.sha256,
    blob: asset.blob,
    uploadState: "QUEUED",
  }));
}
