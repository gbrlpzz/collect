import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { strToU8, zipSync } from "fflate";
import type { Session } from "@supabase/supabase-js";
import { isSubmissionPending, isSubmissionRetryable } from "./types";
import type { AppMode, AppState, View } from "./types";
import type { MediaAsset } from "./types";
import { emptyProject, initialState } from "./data";
import { acquireSyncLease, commitLocalSubmission, estimateLocalStorage, getOrCreateDeviceId, getStoredBackendKey, loadAppState, markLocalSubmissionsSynced, mediaFromAssets, recordOutboxFailure, releaseSyncLease, saveAppState } from "./lib/localStore";
import { AdminDashboard, AdminProject } from "./components/AdminDashboard";
import { AuthScreen } from "./components/AuthScreen";
import { Collector } from "./components/Collector";
import { ContributorHome } from "./components/ContributorHome";
import { Icon } from "./components/Icon";
import { NewProjectWizard } from "./components/NewProjectWizard";
import { ProjectOverview } from "./components/ProjectOverview";
import { SyncSheet } from "./components/SyncSheet";
import { TopBar } from "./components/TopBar";
import { authSession, isSupabaseConfigured, localBackendKey, supabase } from "./lib/supabaseClient";
import { claimInvites, probeRemoteHealth, reportDeviceStatus, syncRemoteObservation } from "./lib/remoteBackend";
import { cloneSchemaDraft, createCheckpoint, createRemoteProject, loadAssignedProject, updateProjectStatus } from "./lib/adminBackend";

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "0.1.0";

export default function App() {
  const [state, setState] = useState<AppState>(() => isSupabaseConfigured ? {
    ...initialState,
    observations: [],
    project: emptyProject,
  } : initialState);
  const [hydrated, setHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [previewUnlocked, setPreviewUnlocked] = useState(false);
  const [localCacheAvailable, setLocalCacheAvailable] = useState(false);
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const syncOwnerRef = useRef(`sync-worker-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    let active = true;
    void authSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
        if (data.session) void claimInvites().catch(() => undefined);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void claimInvites().catch(() => undefined);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadAppState(), getStoredBackendKey()]).then(([saved, storedBackendKey]) => {
      if (!active) return;
      const belongsToCurrentBackend = !isSupabaseConfigured || storedBackendKey === localBackendKey;
      setLocalCacheAvailable(Boolean(saved && belongsToCurrentBackend));
      if (saved && belongsToCurrentBackend) {
        setState((current) => ({
          ...current,
          ...saved,
          project: { ...current.project, ...(saved.project ?? {}) },
        }));
      }
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    void loadAssignedProject().then((remoteProject) => {
      if (!active || !remoteProject) return;
      setState((current) => ({ ...current, project: remoteProject }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (hydrated && (previewUnlocked || session || (isSupabaseConfigured && localCacheAvailable))) {
      void saveAppState(state, localBackendKey).catch((error) => setStorageError(error instanceof Error && /quota|space|storage/i.test(error.message) ? "Device storage is becoming full. Sync collected data soon; unsynced records will not be deleted." : "Local storage needs attention. Your last confirmed receipt remains available."));
    }
  }, [hydrated, localCacheAvailable, previewUnlocked, session, state]);

  useEffect(() => {
    void requestStoragePersistence(setState, setStorageError);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const pendingCount = useMemo(() => state.observations.filter((item) => isSubmissionPending(item.status)).length, [state.observations]);
  const hasDraft = useMemo(() => Object.entries(state.draft).some(([key, value]) => key !== "observed_date" && value !== "" && value !== undefined), [state.draft]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  };

  const navigate = (view: View) => setState((current) => ({ ...current, view }));

  const changeMode = (mode: AppMode) => {
    setState((current) => ({ ...current, mode, view: mode === "admin" ? "admin" : "home" }));
    setSyncSheetOpen(false);
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    setSession(null);
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
      const observation = {
        id,
        createdAt: "Just now",
        clientCreatedAt: createdAt,
        schemaVersion: state.project.schemaVersion,
        status: "SAVED_LOCAL" as const,
        deviceId,
        values,
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
          payload: values,
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
            const receipt = isSupabaseConfigured
              ? await syncRemoteObservation({ observation, project: state.project, deviceId, appVersion: APP_VERSION })
              : null;
            await markLocalSubmissionsSynced([observation.id], {
              receivedAt: new Date().toISOString(),
              finalizedAt: receipt?.finalized_at ?? null,
              serverStatus: receipt?.status ?? "COMPLETE",
              demo: !isSupabaseConfigured,
            });
              setState((current) => ({
                ...current,
                observations: current.observations.map((item) => item.id === observation.id ? { ...item, status: "SYNCED" as const, deviceId } : item),
                lastSyncAt: new Date().toISOString(),
              }));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Synchronization could not be completed";
            const actionRequired = /unknown schema|revoked|forbidden|not authorized|permission|conflict|corrupt/i.test(message);
            await recordOutboxFailure(observation.id, message, actionRequired);
            setState((current) => ({
              ...current,
              observations: current.observations.map((item) => item.id === observation.id ? { ...item, status: actionRequired ? "ACTION_REQUIRED" as const : "RETRYABLE_ERROR" as const } : item),
            }));
            throw error;
          }
        }
        if (isSupabaseConfigured) {
          void reportDeviceStatus({
            device_id: deviceId,
            project_id: state.project.id,
            pending_submissions: 0,
            pending_media: 0,
            app_version: APP_VERSION,
            schema_versions_cached: [state.project.schemaVersion],
            fieldwork_complete: false,
          }).catch(() => undefined);
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
      void releaseSyncLease(syncOwnerRef.current).catch(() => undefined);
    }
    return completed;
  };

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

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
      setState((current) => ({ ...current, project: remoteProject }));
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

  const draftSchema = async () => {
    if (!isSupabaseConfigured || !session) {
      showToast("A new local schema draft is ready to edit");
      return;
    }
    try {
      await cloneSchemaDraft(state.project);
      showToast(`Schema v${state.project.schemaVersion + 1} draft created`);
    } catch {
      showToast("The schema draft could not be created");
    }
  };

  const toggleProjectStatus = async () => {
    const nextStatus = state.project.status === "active" ? "closed" : "active";
    if (nextStatus === "closed" && !window.confirm("Close collection for new observations? Existing offline fieldwork can still synchronize.")) return;
    if (isSupabaseConfigured && session) {
      try {
        await updateProjectStatus(state.project.id, nextStatus);
      } catch {
        showToast("Project status could not be updated");
        return;
      }
    }
    setState((current) => ({ ...current, project: { ...current.project, status: nextStatus } }));
    showToast(nextStatus === "closed" ? "Collection closed" : "Collection reopened");
  };

  const finishFieldwork = async () => {
    if (hasDraft) {
      const discardDraft = window.confirm("You have an unfinished observation. Finish fieldwork without saving that draft?");
      if (!discardDraft) {
        navigate("collector");
        return;
      }
      setState((current) => ({ ...current, draft: { observed_date: new Date().toISOString().slice(0, 10) } }));
    }
    if (pendingCount) {
      const synced = await syncNow();
      if (!synced) {
        setSyncSheetOpen(true);
        return;
      }
    }
    const saved = await loadAppState();
    const remaining = saved?.observations?.filter((item) => isSubmissionPending(item.status)) ?? state.observations.filter((item) => isSubmissionPending(item.status));
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
      } catch {
        showToast("The server could not confirm completion yet");
        return;
      }
    }
    showToast("All fieldwork synced");
  };

  const requiresAuthentication = isSupabaseConfigured
    ? !session && !localCacheAvailable
    : !previewUnlocked;

  return (
    (!hydrated || authLoading || requiresAuthentication) ? <AuthScreen configured={isSupabaseConfigured} onPreview={!isSupabaseConfigured ? () => setPreviewUnlocked(true) : undefined} /> :
    <div className="app-shell">
      <TopBar mode={state.mode} view={state.view} onModeChange={changeMode} onNavigate={navigate} userEmail={session?.user.email} isPreview={!isSupabaseConfigured} onSignOut={() => void signOut()} />
      <div className="main-shell">
        {state.mode === "contributor" && state.view === "home" && <ContributorHome project={state.project} observations={state.observations} hasDraft={hasDraft} onNavigate={navigate} />}
        {state.mode === "contributor" && state.view === "project" && <ProjectOverview project={state.project} observations={state.observations} onNavigate={navigate} onOpenSync={() => setSyncSheetOpen(true)} onFinishFieldwork={() => void finishFieldwork()} />}
        {state.mode === "contributor" && state.view === "collector" && <Collector project={state.project} draft={state.draft} lastSavedAt={state.lastSavedAt} onDraftChange={updateDraft} onSubmit={submitObservation} onBack={() => navigate("project")} isSaving={isSaving} />}
        {state.mode === "admin" && state.view === "admin" && <AdminDashboard project={state.project} observations={state.observations} onNavigate={navigate} />}
        {state.mode === "admin" && state.view === "admin-project" && <AdminProject project={state.project} observations={state.observations} onBack={() => navigate("admin")} onToast={showToast} onExport={() => void exportCheckpoint()} onDraftSchema={() => void draftSchema()} onToggleStatus={() => void toggleProjectStatus()} />}
        {state.mode === "admin" && state.view === "new-project" && <NewProjectWizard onBack={() => navigate("admin")} onPublish={publishProject} />}
      </div>

      {state.mode === "contributor" && state.view !== "collector" && (
        <nav className="mobile-tabbar" aria-label="Fieldwork navigation">
          <button className={state.view === "home" ? "mobile-tab-active" : ""} onClick={() => navigate("home")}><Icon name="folder" size={19} /><span>Projects</span></button>
          <button className={state.view === "project" ? "mobile-tab-active" : ""} onClick={() => navigate("project")}><Icon name="file" size={19} /><span>Current project</span></button>
          <button onClick={() => setSyncSheetOpen(true)}><Icon name="refresh" size={19} /><span>{pendingCount ? `${pendingCount} waiting` : "Sync"}</span></button>
        </nav>
      )}

      {syncSheetOpen && <SyncSheet observations={state.observations} lastSyncAt={state.lastSyncAt} isSyncing={isSyncing} onClose={() => setSyncSheetOpen(false)} onSync={syncNow} onRecoveryExport={exportRecoveryPackage} />}
      {storageError && <div className="storage-alert" role="alert"><Icon name="info" size={16} /><span>{storageError}</span><button onClick={() => setStorageError(null)} aria-label="Dismiss local storage alert"><Icon name="x" size={15} /></button></div>}
      {toast && <div className="toast" role="status"><Icon name="check" size={16} /><span>{toast}</span></div>}
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
