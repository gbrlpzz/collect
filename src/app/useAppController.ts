import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSubmissionPending } from "../types";
import type { AppMode, AppState, SyncProgressEntry, View } from "../types";
import type { MediaAsset } from "../types";
import { emptyProject, initialState } from "../data/demoState";
import {
  getExplicitSignOut,
  getOrCreateDeviceId,
  getStoredBackendKey,
  loadAppState,
  migrateLegacyDatabase,
  probeLocalDatabase,
  saveAppState,
  setExplicitSignOut,
  setLocalScope,
} from "../lib/localStore";
import {
  authSession,
  isSupabaseConfigured,
  localBackendKey,
  supabase,
} from "../lib/supabaseClient";
import { claimInvites, reportDeviceStatus } from "../lib/remoteBackend";
import {
  bootstrapWorkspace,
  createCheckpoint,
  createRemoteProject,
  defaultOrganizationName,
  loadAssignedProjects,
  loadUserAdminAccess,
  updateProjectStatus,
} from "../lib/adminBackend";
import type { ConfirmationDialogProps } from "../components/ui";
import { syncNow as runSync } from "./syncController";
import { exportRecoveryPackage as downloadRecoveryPackage } from "./recovery";
import { requestStoragePersistence } from "./storage";
import { commitLocalObservation } from "./submission";
import { useSyncLifecycle } from "./useSyncLifecycle";

const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "0.1.2";

const entryRole = (() => {
  if (typeof window === "undefined") return null;
  const role = new URLSearchParams(window.location.search).get("role");
  return role === "admin" || role === "contributor" ? role : null;
})();

export type ConfirmationRequest = Pick<
  ConfirmationDialogProps,
  "title" | "message" | "confirmLabel" | "cancelLabel" | "destructive"
>;

export function useAppController() {
  const [state, setState] = useState<AppState>(() => ({
    ...(isSupabaseConfigured
      ? {
          ...initialState,
          observations: [],
          project: emptyProject,
          projects: [],
        }
      : initialState),
    // A dedicated install (?role=admin or ?role=contributor) starts directly
    // in its surface; the general URL keeps the previous behavior.
    ...(entryRole === "admin"
      ? { mode: "admin" as const, view: "admin" as const }
      : entryRole === "contributor"
        ? { mode: "contributor" as const }
        : {}),
  }));
  const [hydrated, setHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [canAdmin, setCanAdmin] = useState(!isSupabaseConfigured);
  const [previewUnlocked, setPreviewUnlocked] = useState(false);
  const [localCacheAvailable, setLocalCacheAvailable] = useState(false);
  const [explicitSignOut, setExplicitSignOutState] = useState(false);
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<
    Record<string, SyncProgressEntry>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [collectorPreview, setCollectorPreview] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null,
  );
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(
    null,
  );
  const toastTimerRef = useRef<number | undefined>(undefined);
  const syncOwnerRef = useRef(`sync-worker-${crypto.randomUUID()}`);

  const surface: "admin" | "contributor" =
    state.mode === "admin" ? "admin" : "contributor";

  useEffect(() => {
    document.documentElement.dataset.collectSurface = surface;
    document.documentElement.style.colorScheme =
      surface === "admin" ? "dark" : "light";
  }, [surface]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let active = true;
    let lastUserId: string | null = null;
    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      const userId = nextSession?.user.id ?? null;
      if (userId !== lastUserId) {
        // Every account gets its own IndexedDB database. Switching accounts
        // (or signing out to an anonymous scope) must never reuse another
        // person's cached projects, drafts, media, or outbox.
        setLocalScope(userId ?? "default");
        if (lastUserId !== null && userId !== null) {
          // A different person signed in: reset in-memory state and reload so
          // every effect re-runs against the new account's local database.
          setHydrated(false);
          setLocalCacheAvailable(false);
          setState((current) => ({
            ...current,
            observations: [],
            project: emptyProject,
            projects: [],
            draft: { observed_date: new Date().toISOString().slice(0, 10) },
            fieldworkComplete: {},
          }));
          window.location.reload();
          return;
        }
        lastUserId = userId;
      }
      setSession(nextSession);
      if (nextSession) {
        setExplicitSignOutState(false);
        void setExplicitSignOut(false).catch(() => undefined);
      }
      setAuthLoading(false);
      if (nextSession) void claimInvites().catch(() => undefined);
    };
    void authSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => applySession(nextSession),
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured && authLoading) return;
    let active = true;
    // One-time upgrade: adopt legacy single-user local data into this
    // account's scoped database before anything reads local state.
    if (isSupabaseConfigured && session?.user.id) {
      void migrateLegacyDatabase(session.user.id).catch(() => undefined);
    }
    void probeLocalDatabase()
      .then((probe) => {
        if (!active) return;
        if (!probe.ok) {
          // Recovery mode: never boot a blank state over an unreadable database,
          // and never let the autosave effect overwrite it (see autosave guard).
          setDbError(probe.error);
          setHydrated(true);
          return;
        }
        return Promise.all([
          loadAppState(),
          getStoredBackendKey(),
          getExplicitSignOut(),
        ]).then(([saved, storedBackendKey, storedExplicitSignOut]) => {
          if (!active) return;
          setExplicitSignOutState(storedExplicitSignOut);
          const belongsToCurrentBackend =
            !isSupabaseConfigured || storedBackendKey === localBackendKey;
          setLocalCacheAvailable(Boolean(saved && belongsToCurrentBackend));
          if (saved && belongsToCurrentBackend) {
            setCanAdmin(!isSupabaseConfigured || saved.mode === "admin");
            setState((current) => ({
              ...current,
              ...saved,
              project: { ...current.project, ...(saved.project ?? {}) },
              projects:
                saved.projects ??
                (saved.project ? [saved.project] : current.projects),
            }));
          }
          setHydrated(true);
        });
      })
      .catch(() => {
        if (active) {
          setDbError("The local database could not be opened");
          setHydrated(true);
        }
      });
    return () => {
      active = false;
    };
  }, [authLoading, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    void Promise.all([loadAssignedProjects(), loadUserAdminAccess()])
      .then(async ([remoteProjects, adminAccess]) => {
        if (!active) return;
        if (remoteProjects === null) return;
        let hasAdminAccess = adminAccess;
        // On a fresh deployment the first authenticated person should land in
        // setup, not in an empty contributor surface. The Edge Function remains
        // the authority: it only succeeds for the configured bootstrap email or
        // for the first empty database when no guard is set.
        if (!hasAdminAccess && remoteProjects.length === 0) {
          try {
            await bootstrapWorkspace(defaultOrganizationName);
            hasAdminAccess = true;
          } catch {
            // A contributor on an existing deployment may have no assignment.
            // Keep them in the contributor surface; the server has denied setup.
          }
        }
        if (!active) return;
        setCanAdmin(hasAdminAccess);
        if (remoteProjects.length)
          setState((current) => ({
            ...current,
            projects: remoteProjects,
            project:
              remoteProjects.find(
                (candidate) => candidate.id === current.project.id,
              ) ?? remoteProjects[0],
          }));
        else
          setState((current) => ({
            ...current,
            projects: [],
            mode: hasAdminAccess ? "admin" : current.mode,
            view: hasAdminAccess ? "admin" : current.view,
          }));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (dbError || !hydrated) return;
    if (
      !(
        previewUnlocked ||
        session ||
        (isSupabaseConfigured && localCacheAvailable)
      )
    )
      return;
    const markReady = () => {
      const readyIds = (
        state.projects?.length ? state.projects : [state.project]
      ).map((candidate) => candidate.id);
      setState((current) => {
        const offlineReady = {
          ...(current.offlineReady ?? {}),
          ...Object.fromEntries(readyIds.map((id) => [id, true])),
        };
        if (
          JSON.stringify(offlineReady) ===
          JSON.stringify(current.offlineReady ?? {})
        )
          return current;
        return { ...current, offlineReady };
      });
    };
    const persist = () => {
      void saveAppState(state, localBackendKey)
        .then(markReady)
        .catch((error) =>
          setStorageError(
            error instanceof Error && /quota|space|storage/i.test(error.message)
              ? "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted."
              : "Local storage needs attention. Your last confirmed receipt remains available.",
          ),
        );
    };
    // Debounced draft autosave: keystrokes never trigger a full-state write;
    // the latest change commits shortly after typing stops, and a page-hide
    // flush guarantees nothing is lost when the app disappears.
    const timer = window.setTimeout(persist, 400);
    const flush = () => {
      window.clearTimeout(timer);
      persist();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("visibilitychange", flush);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("visibilitychange", flush);
    };
  }, [hydrated, localCacheAvailable, previewUnlocked, session, state, dbError]);

  useEffect(() => {
    void requestStoragePersistence(setState, setStorageError);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const pendingCount = useMemo(
    () =>
      state.observations.filter((item) => isSubmissionPending(item.status))
        .length,
    [state.observations],
  );
  const selectedObservations = useMemo(
    () =>
      state.observations.filter(
        (item) => !item.projectId || item.projectId === state.project.id,
      ),
    [state.observations, state.project.id],
  );
  const hasDraft = useMemo(
    () =>
      Object.entries(state.draft).some(
        ([key, value]) =>
          key !== "observed_date" && value !== "" && value !== undefined,
      ),
    [state.draft],
  );

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    // Time-boxing is a heuristic fallback only: the message is visible long
    // enough to be read, and an explicit dismiss button remains available.
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  };

  const requestConfirmation = (request: ConfirmationRequest) =>
    new Promise<boolean>((resolve) => {
      confirmationResolverRef.current = resolve;
      setConfirmation(request);
    });

  const resolveConfirmation = (confirmed: boolean) => {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmation(null);
  };

  const navigate = (view: View) =>
    setState((current) => ({ ...current, view }));

  const selectProject = (
    project: AppState["project"],
    view: View = "project",
  ) => setState((current) => ({ ...current, project, view }));

  const changeMode = (mode: AppMode) => {
    if (mode === "admin" && !canAdmin) return;
    setState((current) => ({
      ...current,
      mode,
      view: mode === "admin" ? "admin" : "home",
    }));
    setSyncSheetOpen(false);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    await setExplicitSignOut(true).catch(() => undefined);
    setSession(null);
    setExplicitSignOutState(true);
    setPreviewUnlocked(false);
    setSyncSheetOpen(false);
  };

  const updateDraft = (key: string, value: unknown) => {
    setState((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
      lastSavedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  };

  const submitObservation = async (
    values: Record<string, unknown>,
    mediaAssets: MediaAsset[],
  ) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const { observation } = await commitLocalObservation({
        project: state.project,
        values,
        mediaAssets,
        appVersion: APP_VERSION,
      });
      setState((current) => ({
        ...current,
        observations: [...current.observations, observation],
        fieldworkComplete: {
          ...(current.fieldworkComplete ?? {}),
          [state.project.id]: false,
        },
        draft: { observed_date: new Date().toISOString().slice(0, 10) },
        lastSavedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        view: "project",
      }));
      setStorageError(null);
      showToast("Observation saved on this device");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStorageError(
        /quota|space|storage/i.test(message)
          ? "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted."
          : "This observation could not be committed locally. Keep the form open and try again.",
      );
      showToast("Could not complete the local save");
    } finally {
      setIsSaving(false);
    }
  };

  const syncNow = () =>
    runSync({
      state,
      session,
      configured: isSupabaseConfigured,
      appVersion: APP_VERSION,
      pendingCount,
      isSyncing,
      syncOwner: syncOwnerRef.current,
      setState,
      setIsSyncing,
      setSyncProgress,
      showToast,
    });

  useSyncLifecycle({
    configured: isSupabaseConfigured,
    session,
    hydrated,
    pendingCount,
    state,
    isSyncing,
    appVersion: APP_VERSION,
    syncNow,
  });

  const exportRecoveryPackage = () =>
    downloadRecoveryPackage({
      project: state.project,
      observations: state.observations,
      onComplete: () => showToast("Recovery package downloaded"),
    });

  const publishProject = async (
    input: Parameters<typeof createRemoteProject>[0],
  ) => {
    if (isSupabaseConfigured && session) {
      const remoteProject = await createRemoteProject(input);
      setState((current) => ({
        ...current,
        project: remoteProject,
        projects: [
          ...(current.projects ?? []).filter(
            (candidate) => candidate.id !== remoteProject.id,
          ),
          remoteProject,
        ],
      }));
      showToast("Project published and invitations sent");
    } else {
      showToast("Project published in local demo mode");
    }
    navigate("admin");
  };

  const exportCheckpoint = async () => {
    if (!isSupabaseConfigured || !session) {
      showToast("Checkpoint export is available after connecting Supabase");
      return;
    }
    try {
      const result = await createCheckpoint(state.project.id);
      if (result.downloadUrl)
        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      showToast("Checkpoint package is ready");
    } catch {
      showToast("Checkpoint could not be prepared");
    }
  };

  const toggleProjectStatus = async () => {
    const nextStatus = state.project.status === "active" ? "closed" : "active";
    if (nextStatus === "closed") {
      const confirmed = await requestConfirmation({
        title: "Close collection?",
        message:
          "New observations will be blocked. Existing offline fieldwork can still synchronize.",
        confirmLabel: "Close collection",
        cancelLabel: "Keep open",
      });
      if (!confirmed) return;
    }
    if (isSupabaseConfigured && session) {
      try {
        await updateProjectStatus(state.project.id, nextStatus);
      } catch {
        showToast("Project status could not be updated");
        return;
      }
    }
    setState((current) => {
      const project = {
        ...current.project,
        status: nextStatus as "active" | "closed",
      };
      return {
        ...current,
        project,
        projects: (current.projects ?? []).map((candidate) =>
          candidate.id === project.id ? project : candidate,
        ),
      };
    });
    showToast(
      nextStatus === "closed" ? "Collection closed" : "Collection reopened",
    );
  };

  const finishFieldwork = async () => {
    if (hasDraft) {
      const discardDraft = await requestConfirmation({
        title: "Discard unfinished observation?",
        message:
          "This draft has not been submitted. Discarding it removes only the unfinished draft from this device.",
        confirmLabel: "Discard draft",
        cancelLabel: "Keep editing",
        destructive: true,
      });
      if (!discardDraft) {
        navigate("collector");
        return;
      }
      setState((current) => ({
        ...current,
        draft: { observed_date: new Date().toISOString().slice(0, 10) },
      }));
    }
    const currentProjectPending = selectedObservations.filter(
      (item) => item.status !== "SYNCED",
    ).length;
    if (currentProjectPending) {
      const synced = await syncNow();
      if (!synced) {
        setSyncSheetOpen(true);
        return;
      }
    }
    const saved = await loadAppState();
    const remaining = (saved?.observations ?? state.observations).filter(
      (item) =>
        (item.projectId ?? state.project.id) === state.project.id &&
        isSubmissionPending(item.status),
    );
    if (remaining.length) {
      setSyncSheetOpen(true);
      showToast("Fieldwork is still waiting for synchronization");
      return;
    }
    if (isSupabaseConfigured) {
      if (!session) {
        showToast(
          "Reconnect and sign in before confirming fieldwork completion",
        );
        return;
      }
      try {
        const deviceId = await getOrCreateDeviceId();
        await reportDeviceStatus({
          device_id: deviceId,
          project_id: state.project.id,
          pending_submissions: 0,
          pending_media: 0,
          app_version: APP_VERSION,
          schema_versions_cached: [state.project.schemaVersion],
          fieldwork_complete: true,
        });
        setState((current) => ({
          ...current,
          fieldworkComplete: {
            ...(current.fieldworkComplete ?? {}),
            [current.project.id]: true,
          },
        }));
      } catch {
        showToast("The server could not confirm completion yet");
        return;
      }
    }
    showToast("All fieldwork synced");
  };

  const requiresAuthentication = isSupabaseConfigured
    ? !session && (!localCacheAvailable || explicitSignOut)
    : !previewUnlocked;

  const makeProjectAvailableOffline = async (project: AppState["project"]) => {
    try {
      await saveAppState(
        { ...state, project, view: state.view, mode: state.mode },
        localBackendKey,
      );
      setState((current) => ({
        ...current,
        offlineReady: { ...(current.offlineReady ?? {}), [project.id]: true },
      }));
      showToast("Ready to work offline");
    } catch {
      showToast("This device could not store the project yet");
    }
  };

  const beginContributorPreview = () => {
    setCollectorPreview(true);
    setState((current) => ({
      ...current,
      mode: "contributor",
      view: "collector",
    }));
  };

  const completeContributorPreview = () => {
    setCollectorPreview(false);
    setState((current) => ({
      ...current,
      mode: "admin",
      view: "admin-project",
    }));
    showToast("Preview complete");
  };

  const cancelContributorPreview = () => {
    setCollectorPreview(false);
    setState((current) => ({
      ...current,
      mode: "admin",
      view: "admin-project",
    }));
  };

  const applySchemaPublished = (project: AppState["project"]) => {
    setState((current) => ({
      ...current,
      project,
      projects: (current.projects ?? []).map((candidate) =>
        candidate.id === project.id ? project : candidate,
      ),
    }));
  };

  const unlockPreview = () => setPreviewUnlocked(true);
  const dismissStorageError = () => setStorageError(null);
  const dismissToast = () => setToast(null);
  const openSyncSheet = () => setSyncSheetOpen(true);
  const closeSyncSheet = () => setSyncSheetOpen(false);

  return {
    state,
    surface,
    configured: isSupabaseConfigured,
    hydrated,
    authLoading,
    requiresAuthentication,
    session,
    canAdmin,
    previewUnlocked,
    syncSheetOpen,
    isSyncing,
    syncProgress,
    isSaving,
    storageError,
    dbError,
    toast,
    collectorPreview,
    pendingCount,
    selectedObservations,
    hasDraft,
    actions: {
      showToast,
      requestConfirmation,
      resolveConfirmation,
      navigate,
      selectProject,
      changeMode,
      signOut,
      updateDraft,
      submitObservation,
      openSyncSheet,
      closeSyncSheet,
      syncNow,
      exportRecoveryPackage,
      publishProject,
      exportCheckpoint,
      toggleProjectStatus,
      finishFieldwork,
      makeProjectAvailableOffline,
      beginContributorPreview,
      completeContributorPreview,
      cancelContributorPreview,
      applySchemaPublished,
      unlockPreview,
      dismissStorageError,
      dismissToast,
    },
    confirmation,
  };
}
