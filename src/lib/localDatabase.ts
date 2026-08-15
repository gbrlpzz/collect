const DB_NAME = "collect-local-v1";
const DB_VERSION = 2;

let activeLocalScope = "default";

export const APP_STATE_STORE = "app-state";
export const SETTINGS_STORE = "settings";
export const PROJECTS_STORE = "projects";
export const DRAFTS_STORE = "drafts";
export const SUBMISSIONS_STORE = "submissions";
export const MEDIA_STORE = "media";
export const OUTBOX_STORE = "outbox";
export const RECEIPTS_STORE = "receipts";
export const DEVICE_STATE_STORE = "device-state";

export const ALL_STORES = [
  APP_STATE_STORE,
  SETTINGS_STORE,
  PROJECTS_STORE,
  DRAFTS_STORE,
  SUBMISSIONS_STORE,
  MEDIA_STORE,
  OUTBOX_STORE,
  RECEIPTS_STORE,
  DEVICE_STATE_STORE,
] as const;

/** Select the durable database for the active account. */
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

export function createRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  return openDatabaseByName(localDatabaseName());
}

// One connection per database name, reused for the page lifetime. Opening a
// fresh handle per call leaked connections (each pinning DB_VERSION, which
// eventually makes a future upgrade hang on onblocked).
const openConnections = new Map<string, Promise<IDBDatabase>>();

export function openDatabaseByName(name: string): Promise<IDBDatabase> {
  const cached = openConnections.get(name);
  if (cached) return cached;
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      ALL_STORES.forEach((storeName) => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName);
        }
      });
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        openConnections.delete(name);
      };
      // An abnormal close (storage pressure, private mode) must evict the
      // dead handle so the next call reopens instead of using it.
      database.onclose = () => openConnections.delete(name);
      resolve(database);
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
  openConnections.set(name, opening);
  // A failed open must not pin the cache slot.
  opening.catch(() => openConnections.delete(name));
  return opening;
}

/** Close and forget every cached connection. Used by tests and sign-out. */
export async function closeCachedDatabases(): Promise<void> {
  const pending = [...openConnections.values()];
  openConnections.clear();
  await Promise.all(
    pending.map(async (connection) => {
      try {
        (await connection).close();
      } catch {
        // Already closed or failed to open; nothing to release.
      }
    }),
  );
}
