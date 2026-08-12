import { afterEach, describe, expect, it } from "vitest";
import { initialState } from "../src/data/demoState";
import {
  getExplicitSignOut,
  getStoredBackendKey,
  loadAppState,
  migrateLegacyDatabase,
  saveAppState,
  setExplicitSignOut,
  setLocalScope,
} from "../src/lib/localStore";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Could not delete ${name}`));
  });
}

describe("legacy local database migration", () => {
  afterEach(() => setLocalScope("default"));

  it("copies keyed primitive settings before opening the target write", async () => {
    await Promise.all([
      deleteDatabase("collect-local-v1"),
      deleteDatabase("collect-local-v1-migration-test"),
    ]);
    setLocalScope("default");
    await saveAppState(initialState, "backend-a");
    await setExplicitSignOut(true);

    setLocalScope("migration-test");
    await migrateLegacyDatabase("migration-test");

    expect(await getStoredBackendKey()).toBe("backend-a");
    expect(await getExplicitSignOut()).toBe(true);
    expect((await loadAppState())?.project?.id).toBe(initialState.project.id);
  });
});
