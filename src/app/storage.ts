import type { Dispatch, SetStateAction } from "react";
import type { AppState } from "../types";
import { estimateLocalStorage } from "../lib/localStore";

export async function requestStoragePersistence(
  setState: Dispatch<SetStateAction<AppState>>,
  setStorageError: (message: string | null) => void,
): Promise<void> {
  if (!("storage" in navigator)) return;

  try {
    await navigator.storage.persist();
    const estimate = await estimateLocalStorage();
    setState((current) => ({
      ...current,
      storagePersistence: estimate.persisted ? "granted" : "not-granted",
      storageUsage: estimate.usage,
    }));
    if (
      estimate.usage &&
      estimate.quota &&
      estimate.usage / estimate.quota > 0.8
    ) {
      setStorageError(
        "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted.",
      );
    }
  } catch {
    setState((current) => ({ ...current, storagePersistence: "not-granted" }));
    setStorageError(
      "Persistent storage could not be confirmed. Sync collected data when connectivity returns.",
    );
  }
}
