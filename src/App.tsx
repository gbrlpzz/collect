import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { strToU8, zipSync } from "fflate";
import type { Session } from "@supabase/supabase-js";
import { isSubmissionPending, isSubmissionRetryable } from "./types";
import type { AppMode, AppState, View } from "./types";
import type { MediaAsset } from "./types";
import { emptyProject, initialState } from "./data";
import { acquireSyncLease, commitLocalSubmission, estimateLocalStorage, getExplicitSignOut, getOrCreateDeviceId, getOutboxOperations, getStoredBackendKey, loadAppState, markLocalSubmissionsSynced, mediaFromAssets, migrateLegacyDatabase, probeLocalDatabase, readStoredRecoveryData, recordOutboxFailure, releaseSyncLease, saveAppState, setExplicitSignOut, setLocalScope } from "./lib/localStore";
import { AdminDashboard, AdminProject } from "./components/AdminDashboard";
import { AuthScreen } from "./components/AuthScreen";
import { Collector } from "./components/Collector";
import { ContributorHome } from "./components/ContributorHome";
import { Button, ConfirmationDialog, Eyebrow, type ConfirmationDialogProps } from "./components/Primitives";
import { Icon } from "./components/Icon";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { ProjectOverview } from "./components/ProjectOverview";
import { SyncSheet, type SyncProgressEntry } from "./components/SyncSheet";
import { TopBar } from "./components/TopBar";
import { authSession, isSupabaseConfigured, localBackendKey, supabase } from "./lib/supabaseClient";
import { claimInvites, probeRemoteHealth, reportDeviceStatus, syncRemoteObservation } from "./lib/remoteBackend";
import { collectEnvironment } from "./lib/deviceInfo";
import { bootstrapWorkspace, createCheckpoint, createRemoteProject, defaultOrganizationName, loadAssignedProjects, loadUserAdminAccess, updateProjectStatus } from "./lib/adminBackend";

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "0.1.2";
type ConfirmationRequest = Pick<ConfirmationDialogProps, "title" | "message" | "confirmLabel" | "cancelLabel" | "destructive">;

const entryRole = (() => {
  if (typeof window === "undefined") return null;
  const role = new URLSearchParams(window.location.search).get("role");
  return role === "admin" || role === "contributor" ? role : null;
})();

export default function App() {
  const [state, setState] = useState<AppState>(() => ({
    ...(isSupabaseConfigured ? {
      ...initialState,
      observations: [],
      project: emptyProject,
      projects: [],
    } : initialState),
    // A dedicated install (?role=admin or ?role=contributor) starts directly
    // in its surface; the general URL keeps the previous behavior.
    ...(entryRole === "admin" ? { mode: "admin" as const, view: "admin" as const } : entryRole === "contributor" ? { mode: "contributor" as const } : {}),
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
  const [syncProgress, setSyncProgress] = useState<Record<string, SyncProgressEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [collectorPreview, setCollectorPreview] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null);
  const confirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const syncOwnerRef = useRef(`sync-worker-${crypto.randomUUID()}`);

  const surface = state.mode === "admin" ? "admin" : "contributor";

  useEffect(() => {
    document.documentElement.dataset.collectSurface = surface;
    document.documentElement.style.colorScheme = surface === "admin" ? "dark" : "light";
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
          setState((current) => ({ ...current, observations: [], project: emptyProject, projects: [], draft: { observed_date: new Date().toISOString().slice(0, 10) }, fieldworkComplete: {} }));
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => applySession(nextSession));
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
    void probeLocalDatabase().then((probe) => {
      if (!active) return;
      if (!probe.ok) {
        // Recovery mode: never boot a blank state over an unreadable database,
        // and never let the autosave effect overwrite it (see autosave guard).
        setDbError(probe.error);
        setHydrated(true);
        return;
      }
      return Promise.all([loadAppState(), getStoredBackendKey(), getExplicitSignOut()]).then(([saved, storedBackendKey, storedExplicitSignOut]) => {
        if (!active) return;
        setExplicitSignOutState(storedExplicitSignOut);
        const belongsToCurrentBackend = !isSupabaseConfigured || storedBackendKey === localBackendKey;
        setLocalCacheAvailable(Boolean(saved && belongsToCurrentBackend));
        if (saved && belongsToCurrentBackend) {
          setCanAdmin(!isSupabaseConfigured || saved.mode === "admin");
          setState((current) => ({
            ...current,
            ...saved,
            project: { ...current.project, ...(saved.project ?? {}) },
            projects: saved.projects ?? (saved.project ? [saved.project] : current.projects),
          }));
        }
        setHydrated(true);
      });
    }).catch(() => {
      if (active) {
        setDbError("The local database could not be opened");
        setHydrated(true);
      }
    });
    return () => { active = false; };
  }, [authLoading, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    void Promise.all([loadAssignedProjects(), loadUserAdminAccess()]).then(async ([remoteProjects, adminAccess]) => {
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
      if (remoteProjects.length) setState((current) => ({ ...current, projects: remoteProjects, project: remoteProjects.find((candidate) => candidate.id === current.project.id) ?? remoteProjects[0] }));
      else setState((current) => ({
        ...current,
        projects: [],
        mode: hasAdminAccess ? "admin" : current.mode,
        view: hasAdminAccess ? "admin" : current.view,
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (dbError || !hydrated) return;
    if (!(previewUnlocked || session || (isSupabaseConfigured && localCacheAvailable))) return;
    const markReady = () => {
      const readyIds = (state.projects?.length ? state.projects : [state.project]).map((candidate) => candidate.id);
      setState((current) => {
        const offlineReady = { ...(current.offlineReady ?? {}), ...Object.fromEntries(readyIds.map((id) => [id, true])) };
        if (JSON.stringify(offlineReady) === JSON.stringify(current.offlineReady ?? {})) return current;
        return { ...current, offlineReady };
      });
    };
    const persist = () => {
      void saveAppState(state, localBackendKey).then(markReady).catch((error) => setStorageError(error instanceof Error && /quota|space|storage/i.test(error.message) ? "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted." : "Local storage needs attention. Your last confirmed receipt remains available."));
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

  const pendingCount = useMemo(() => state.observations.filter((item) => isSubmissionPending(item.status)).length, [state.observations]);
  const selectedObservations = useMemo(() => state.observations.filter((item) => !item.projectId || item.projectId === state.project.id), [state.observations, state.project.id]);
  const hasDraft = useMemo(() => Object.entries(state.draft).some(([key, value]) => key !== "observed_date" && value !== "" && value !== undefined), [state.draft]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    // Time-boxing is a heuristic fallback only: the message is visible long
    // enough to be read, and an explicit dismiss button remains available.
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  };

  const requestConfirmation = (request: ConfirmationRequest) => new Promise<boolean>((resolve) => {
    confirmationResolverRef.current = resolve;
    setConfirmation(request);
  });

  const resolveConfirmation = (confirmed: boolean) => {
    confirmationResolverRef.current?.(confirmed);
    confirmationResolverRef.current = null;
    setConfirmation(null);
  };

  const navigate = (view: View) => setState((current) => ({ ...current, view }));

  const selectProject = (project: AppState["project"], view: View = "project") => setState((current) => ({ ...current, project, view }));

  const changeMode = (mode: AppMode) => {
    if (mode === "admin" && !canAdmin) return;
    setState((current) => ({ ...current, mode, view: mode === "admin" ? "admin" : "home" }));
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
      lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));
  };

  const submitObservation = async (values: Record<string, unknown>, mediaAssets: MediaAsset[]) => {
    if (isSaving) return;
    setIsSaving(true);
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    try {
      const deviceId = await getOrCreateDeviceId();
      // Location is recorded automatically whenever the device permits it:
      // the scientist consented once; a fresh fix at submit is the provenance.
      let submittedValues = values;
      if ("geolocation" in navigator) {
        const freshLocation = await new Promise<Record<string, unknown> | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              autoCaptured: true,
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 5000 },
          );
        });
        if (freshLocation) submittedValues = { ...values, location: freshLocation };
      }
      const environment = await collectEnvironment();
      const observation = {
        id,
        projectId: state.project.id,
        createdAt: "Just now",
        clientCreatedAt: createdAt,
        schemaVersion: state.project.schemaVersion,
        status: "SAVED_LOCAL" as const,
        deviceId,
        values: submittedValues,
        media: mediaAssets,
      };
      const media = mediaFromAssets(mediaAssets, id, "field-site-photos");
      await commitLocalSubmission({
        observation,
        media,
        submission: {
          id,
          projectId: state.project.id,
          schemaVersionId: `${state.project.id}-v${state.project.schemaVersion}`,
          payload: submittedValues,
          environment: environment as unknown as Record<string, unknown>,
          payloadHash: null,
          clientCreatedAt: createdAt,
          deviceId,
          appVersion: APP_VERSION,
          status: "SAVED_LOCAL",
        },
      });
      setState((current) => ({
        ...current,
        observations: [...current.observations, observation],
        fieldworkComplete: { ...(current.fieldworkComplete ?? {}), [state.project.id]: false },
        draft: { observed_date: new Date().toISOString().slice(0, 10) },
        lastSavedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        view: "project",
      }));
      setStorageError(null);
      showToast("Observation saved on this device");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setStorageError(/quota|space|storage/i.test(message) ? "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted." : "This observation could not be committed locally. Keep the form open and try again.");
      showToast("Could not complete the local save");
    } finally {
      setIsSaving(false);
    }
  };

  const syncNow = async (): Promise<boolean> => {
    const retryableCount = state.observations.filter((item) => isSubmissionRetryable(item.status)).length;
    if (!retryableCount || isSyncing) {
      if (pendingCount && !retryableCount) showToast("A saved observation needs attention before it can sync");
      return false;
    }
    setIsSyncing(true);
    showToast(isSupabaseConfigured ? "Sync started · local records remain available" : "Sync started · local demo adapter");
    await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
    let leaseAcquired = false;
    try {
      leaseAcquired = await acquireSyncLease(syncOwnerRef.current);
    } catch {
      setIsSyncing(false);
      showToast("Sync is unavailable while local storage is busy");
      return false;
    }
    if (!leaseAcquired) {
      setIsSyncing(false);
      showToast("Another collect window is already syncing this project");
      return false;
    }
    const leaseRefreshTimer = window.setInterval(() => { void acquireSyncLease(syncOwnerRef.current).catch(() => undefined); }, 10_000);
    const pending = state.observations.filter((item) => isSubmissionRetryable(item.status));
    let completed = false;
    try {
      try {
        if (isSupabaseConfigured && !session) throw new Error("Authentication is required before synchronization can continue");
        const deviceId = isSupabaseConfigured ? await getOrCreateDeviceId() : "demo-device";
        for (const observation of pending) {
          try {
            const project = state.projects?.find((candidate) => candidate.id === observation.projectId) ?? state.project;
            const receipt = isSupabaseConfigured
              ? await syncRemoteObservation({ observation, project, deviceId, appVersion: APP_VERSION }, {
                  onPhase: (submissionId, phase) => setSyncProgress((current) => ({ ...current, [submissionId]: { phase, media: current[submissionId]?.media ?? {} } })),
                  onMediaProgress: (submissionId, mediaId, percent) => setSyncProgress((current) => ({ ...current, [submissionId]: { phase: current[submissionId]?.phase ?? "SYNCING_MEDIA", media: { ...(current[submissionId]?.media ?? {}), [mediaId]: percent } } })),
                })
              : null;
            const receiptAt = new Date().toISOString();
            await markLocalSubmissionsSynced([observation.id], {
              receivedAt: receiptAt,
              finalizedAt: receipt?.finalized_at ?? null,
              serverStatus: receipt?.status ?? "COMPLETE",
              demo: !isSupabaseConfigured,
            });
              setState((current) => {
                const nextProjects = (current.projects ?? []).map((candidate) => candidate.id === project.id
                  ? { ...candidate, completeSubmissions: candidate.completeSubmissions + 1, lastReceived: "Just now" }
                  : candidate);
                const nextProject = current.project.id === project.id
                  ? { ...current.project, completeSubmissions: current.project.completeSubmissions + 1, lastReceived: "Just now" }
                  : current.project;
                return {
                  ...current,
                  project: nextProject,
                  projects: nextProjects,
                  observations: current.observations.map((item) => item.id === observation.id ? { ...item, status: "SYNCED" as const, deviceId } : item),
                  lastSyncAt: receiptAt,
                };
              });
            setSyncProgress((current) => {
              const next = { ...current };
              delete next[observation.id];
              return next;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Synchronization could not be completed";
            setSyncProgress((current) => {
              const next = { ...current };
              delete next[observation.id];
              return next;
            });
            const actionRequired = /unknown schema|revoked|forbidden|not authorized|permission|conflict|corrupt|assignment is not active|belongs to another|immutable|does not match the published schema|is not a published option|not configured as the first administrator/i.test(message);
            await recordOutboxFailure(observation.id, message, actionRequired);
            setState((current) => ({
              ...current,
              observations: current.observations.map((item) => item.id === observation.id ? { ...item, status: actionRequired ? "ACTION_REQUIRED" as const : "RETRYABLE_ERROR" as const } : item),
            }));
            throw error;
          }
        }
        if (isSupabaseConfigured) {
          const completedIds = new Set(pending.map((observation) => observation.id));
          await Promise.all((state.projects ?? [state.project]).map((project) => {
            const projectObservations = state.observations.filter((observation) => (observation.projectId ?? state.project.id) === project.id && !completedIds.has(observation.id));
            return reportDeviceStatus({
              device_id: deviceId,
              project_id: project.id,
              pending_submissions: projectObservations.filter((observation) => observation.status !== "SYNCED").length,
              pending_media: projectObservations.reduce((total, observation) => total + (observation.media?.length ?? 0), 0),
              app_version: APP_VERSION,
              schema_versions_cached: [project.schemaVersion],
              fieldwork_complete: state.fieldworkComplete?.[project.id] ?? false,
            }).catch(() => undefined);
          }));
        }
        completed = true;
        showToast(isSupabaseConfigured ? "All saved observations are synced" : "All saved observations are synced in demo mode");
      } catch (error) {
        if (error instanceof Error && /Authentication is required/.test(error.message)) showToast("Sign in again when you have a connection to sync this fieldwork");
        else showToast("Sync paused · your local records are still safe");
      }
    } finally {
      window.clearInterval(leaseRefreshTimer);
      setIsSyncing(false);
      if (completed) setSyncProgress({});
      void releaseSyncLease(syncOwnerRef.current).catch(() => undefined);
    }
    return completed;
  };

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;
  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  useEffect(() => {
    if (!isSupabaseConfigured || !session || !pendingCount) return;
    const attempt = () => {
      void probeRemoteHealth().then((available) => {
        if (available) syncNowRef.current();
      });
    };
    window.addEventListener("online", attempt);
    window.addEventListener("visibilitychange", attempt);
    attempt();
    return () => {
      window.removeEventListener("online", attempt);
      window.removeEventListener("visibilitychange", attempt);
    };
  }, [pendingCount, session]);

  // Durable backoff scheduler: retry operations whose nextAttemptAt has
  // elapsed, on a fixed cadence and when the app returns to the foreground.
  // Correctness never depends on this timer — the same queue is processed on
  // launch, online events, and manual Sync Now.
  useEffect(() => {
    if (!isSupabaseConfigured || !session || !hydrated) return;
    let timer: number | undefined;
    const check = () => {
      if (isSyncingRef.current) return;
      void getOutboxOperations().then((operations) => {
        const due = operations.some((operation) =>
          (operation.state === "QUEUED" || operation.state === "RETRYABLE_ERROR") &&
          new Date(operation.nextAttemptAt).getTime() <= Date.now());
        if (due) {
          void probeRemoteHealth().then((available) => {
            if (available) void syncNowRef.current();
          });
        }
      }).catch(() => undefined);
    };
    timer = window.setInterval(check, 30_000);
    window.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, [isSupabaseConfigured, session, hydrated]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session || !hydrated || !state.projects?.length) return;
    let active = true;
    const report = async () => {
      const deviceId = await getOrCreateDeviceId().catch(() => null);
      if (!deviceId || !active) return;
      await Promise.all(state.projects!.map((project) => {
        const projectObservations = state.observations.filter((observation) => (observation.projectId ?? state.project.id) === project.id);
        return reportDeviceStatus({
          device_id: deviceId,
          project_id: project.id,
          pending_submissions: projectObservations.filter((observation) => observation.status !== "SYNCED").length,
          pending_media: projectObservations.filter((observation) => observation.status !== "SYNCED").reduce((total, observation) => total + (observation.media?.length ?? 0), 0),
          app_version: APP_VERSION,
          schema_versions_cached: [project.schemaVersion],
          fieldwork_complete: state.fieldworkComplete?.[project.id] ?? false,
        }).catch(() => undefined);
      }));
    };
    const attempt = () => { void report(); };
    attempt();
    window.addEventListener("online", attempt);
    window.addEventListener("visibilitychange", attempt);
    return () => {
      active = false;
      window.removeEventListener("online", attempt);
      window.removeEventListener("visibilitychange", attempt);
    };
  }, [hydrated, pendingCount, session, state.fieldworkComplete, state.lastSyncAt, state.observations, state.project.id, state.projects]);

  const exportRecoveryPackage = async () => {
    const unsynced = state.observations.filter((item) => item.status !== "SYNCED");
    const entries: Record<string, Uint8Array> = {
      "manifest.json": strToU8(JSON.stringify({ format: "collect-recovery-v1", exported_at: new Date().toISOString(), project_id: state.project.id, schema_version: state.project.schemaVersion, observation_count: unsynced.length, note: "Local recovery package. Records remain on this device after export." }, null, 2)),
      [`schema/schema-v${state.project.schemaVersion}.json`]: strToU8(JSON.stringify(state.project.fields, null, 2)),
      "data/submissions.jsonl": strToU8(unsynced.map((observation) => JSON.stringify({ ...observation, media: observation.media?.map(({ blob, ...metadata }) => metadata) })).join("\n")),
    };
    for (const observation of unsynced) {
      for (const asset of observation.media ?? []) {
        if (asset.blob) entries[`media/${observation.id}/${asset.id}-${asset.name}`] = new Uint8Array(await asset.blob.arrayBuffer());
      }
    }
    const archive = zipSync(entries, { level: 0 });
    const blob = new Blob([archive], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collect-recovery-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Recovery package downloaded");
  };

  const publishProject = async (input: Parameters<typeof createRemoteProject>[0]) => {
    if (isSupabaseConfigured && session) {
      const remoteProject = await createRemoteProject(input);
      setState((current) => ({ ...current, project: remoteProject, projects: [...(current.projects ?? []).filter((candidate) => candidate.id !== remoteProject.id), remoteProject] }));
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
      if (result.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
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
        message: "New observations will be blocked. Existing offline fieldwork can still synchronize.",
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
      const project = { ...current.project, status: nextStatus as "active" | "closed" };
      return { ...current, project, projects: (current.projects ?? []).map((candidate) => candidate.id === project.id ? project : candidate) };
    });
    showToast(nextStatus === "closed" ? "Collection closed" : "Collection reopened");
  };

  const finishFieldwork = async () => {
    if (hasDraft) {
      const discardDraft = await requestConfirmation({
        title: "Discard unfinished observation?",
        message: "This draft has not been submitted. Discarding it removes only the unfinished draft from this device.",
        confirmLabel: "Discard draft",
        cancelLabel: "Keep editing",
        destructive: true,
      });
      if (!discardDraft) {
        navigate("collector");
        return;
      }
      setState((current) => ({ ...current, draft: { observed_date: new Date().toISOString().slice(0, 10) } }));
    }
    const currentProjectPending = selectedObservations.filter((item) => item.status !== "SYNCED").length;
    if (currentProjectPending) {
      const synced = await syncNow();
      if (!synced) {
        setSyncSheetOpen(true);
        return;
      }
    }
    const saved = await loadAppState();
    const remaining = (saved?.observations ?? state.observations).filter((item) => (item.projectId ?? state.project.id) === state.project.id && isSubmissionPending(item.status));
    if (remaining.length) {
      setSyncSheetOpen(true);
      showToast("Fieldwork is still waiting for synchronization");
      return;
    }
    if (isSupabaseConfigured) {
      if (!session) {
        showToast("Reconnect and sign in before confirming fieldwork completion");
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
        setState((current) => ({ ...current, fieldworkComplete: { ...(current.fieldworkComplete ?? {}), [current.project.id]: true } }));
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

  return (
    (!hydrated || authLoading || requiresAuthentication) ? <AuthScreen role={surface} configured={isSupabaseConfigured} onPreview={!isSupabaseConfigured ? () => setPreviewUnlocked(true) : undefined} /> :
    <div className="app-shell" data-mode={surface} data-surface={surface}>
      <TopBar mode={state.mode} view={state.view} onModeChange={changeMode} onNavigate={navigate} canAdmin={canAdmin} userEmail={session?.user.email} isPreview={!isSupabaseConfigured} onSignOut={() => void signOut()} />
      <div className="main-shell">
        {state.mode === "contributor" && state.view === "home" && <ContributorHome projects={state.projects?.length ? state.projects : state.project.id === "empty-project" ? [] : [state.project]} observations={state.observations} hasDraft={hasDraft} offlineReady={state.offlineReady ?? {}} onNavigate={navigate} onSelectProject={(project) => selectProject(project)} onMakeAvailableOffline={(project) => { void saveAppState({ ...state, project, view: state.view, mode: state.mode }, localBackendKey).then(() => { setState((current) => ({ ...current, offlineReady: { ...(current.offlineReady ?? {}), [project.id]: true } })); showToast("Ready to work offline"); }).catch(() => showToast("This device could not store the project yet")); }} />}
        {state.mode === "contributor" && state.view === "project" && <ProjectOverview project={state.project} observations={selectedObservations} onNavigate={navigate} onOpenSync={() => setSyncSheetOpen(true)} onFinishFieldwork={() => void finishFieldwork()} />}
        {state.mode === "contributor" && state.view === "collector" && <Collector project={state.project} draft={state.draft} lastSavedAt={state.lastSavedAt} onDraftChange={updateDraft} onSubmit={collectorPreview ? () => { setCollectorPreview(false); setState((current) => ({ ...current, mode: "admin" as const, view: "admin-project" as const })); showToast("Preview complete"); } : submitObservation} onBack={() => { if (collectorPreview) { setCollectorPreview(false); setState((current) => ({ ...current, mode: "admin" as const, view: "admin-project" as const })); } else { navigate("project"); } }} isSaving={isSaving} preview={collectorPreview} />}
        {state.mode === "admin" && state.view === "admin" && <AdminDashboard project={state.project} projects={state.projects} observations={state.observations} onNavigate={navigate} onSelectProject={(project) => selectProject(project, "admin-project")} />}
        {state.mode === "admin" && state.view === "admin-project" && <AdminProject project={state.project} observations={selectedObservations} onBack={() => navigate("admin")} onToast={showToast} onExport={() => void exportCheckpoint()} onSchemaPublished={(project) => setState((current) => ({ ...current, project, projects: (current.projects ?? []).map((candidate) => candidate.id === project.id ? project : candidate) }))} onToggleStatus={() => void toggleProjectStatus()} onPreviewContributor={() => { setCollectorPreview(true); setState((current) => ({ ...current, mode: "contributor" as const, view: "collector" as const })); }} />}
        {state.mode === "admin" && state.view === "new-project" && <NewProjectWizard onBack={() => navigate("admin")} onPublish={publishProject} />}
      </div>

      {state.mode === "contributor" && state.view !== "collector" && (
        <nav className="mobile-tabbar" aria-label="Fieldwork navigation">
          <button className={state.view === "home" ? "mobile-tab-active" : ""} aria-current={state.view === "home" ? "page" : undefined} onClick={() => navigate("home")}><Icon name="folder" size={19} filled={state.view === "home"} /><span>Projects</span></button>
          <button className={state.view === "project" ? "mobile-tab-active" : ""} aria-current={state.view === "project" ? "page" : undefined} onClick={() => navigate("project")}><Icon name="file" size={19} filled={state.view === "project"} /><span>Project</span></button>
        </nav>
      )}

      {syncSheetOpen && <SyncSheet observations={state.observations} lastSyncAt={state.lastSyncAt} isSyncing={isSyncing} progress={syncProgress} onClose={() => setSyncSheetOpen(false)} onSync={syncNow} onRecoveryExport={exportRecoveryPackage} />}
      {confirmation && <ConfirmationDialog {...confirmation} onConfirm={() => resolveConfirmation(true)} onCancel={() => resolveConfirmation(false)} />}
      {storageError && <div className="storage-alert" role="alert"><Icon name="info" size={16} /><span>{storageError}</span><button onClick={() => setStorageError(null)} aria-label="Dismiss local storage alert"><Icon name="x" size={15} /></button></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={16} /><span>{toast}</span><button onClick={() => setToast(null)} aria-label="Dismiss message"><Icon name="x" size={14} /></button></div>}
    </div>
  );
}

async function requestStoragePersistence(setState: Dispatch<SetStateAction<AppState>>, setStorageError: (message: string | null) => void) {
  if (!("storage" in navigator)) return;
  try {
    await navigator.storage.persist();
    const estimate = await estimateLocalStorage();
    setState((current) => ({ ...current, storagePersistence: estimate.persisted ? "granted" : "not-granted", storageUsage: estimate.usage }));
    if (estimate.usage && estimate.quota && estimate.usage / estimate.quota > 0.8) setStorageError("Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted.");
  } catch {
    setState((current) => ({ ...current, storagePersistence: "not-granted" }));
    setStorageError("Persistent storage could not be confirmed. Sync collected data when connectivity returns.");
  }
}
