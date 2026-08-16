import { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  isRecord,
  isSubmissionPending,
  type AppMode,
  type AppState,
  type FormValue,
  type MediaAsset,
  type Project,
  type SubmissionValues,
  type SyncProgressEntry,
  type View,
} from "../types";
import { emptyProject, initialState } from "../data/demoState";
import {
  acceptConsent,
  getCurrentConsent,
  getMyProfile,
  isConsentGranted,
  type ConsentVersion,
} from "../lib/consent";
import { setPassword, wasInviteCallback } from "../lib/supabaseClient";
import {
  deleteDraftMedia,
  getExplicitSignOut,
  getStoredBackendKey,
  loadAppState,
  migrateLegacyDatabase,
  probeLocalDatabase,
  saveAppState,
  saveDraftMedia,
  setExplicitSignOut,
  setLocalScope,
} from "../lib/localStore";
import { nextLocalScope } from "../lib/auth/scopePolicy";
import {
  authSession,
  consumePendingAuthRole,
  isSupabaseConfigured,
  localBackendKey,
  supabase,
} from "../lib/supabaseClient";
import { claimInvites } from "../lib/remoteBackend";
import {
  bootstrapWorkspace,
  createCheckpoint,
  createRemoteProject,
  defaultOrganizationName,
  loadAssignedProjects,
  loadUserAdminAccess,
  loadUserOrganizationName,
  updateProjectStatus,
} from "../lib/adminBackend";
import { downloadUrl } from "../lib/download";
import { exportClientCheckpoint } from "../lib/checkpointExport";
import { isMobileDevice } from "../lib/platform";
import { syncNow as runSync } from "./syncController";
import { exportRecoveryPackage as downloadRecoveryPackage } from "./recovery";
import { requestStoragePersistence } from "./storage";
import { commitLocalObservation } from "./submission";
import { useSyncLifecycle } from "./useSyncLifecycle";
import { useTransientMessage } from "./useTransientMessage";
import { useConfirmation } from "./useConfirmation";
import { APP_VERSION } from "../lib/appMeta";

const entryRole = (() => {
  if (!globalThis.window) return null;
  const paramRole = new URLSearchParams(window.location.search).get("role");
  if (paramRole === "admin" || paramRole === "contributor") return paramRole;
  const pendingRole = consumePendingAuthRole();
  if (pendingRole === "admin" || pendingRole === "contributor") {
    // Preserve the role in the address bar so reloads and bookmarks stay on the
    // intended surface after OAuth returns.
    if (
      pendingRole === "admin" &&
      window.history?.replaceState &&
      !window.location.search.includes("role=")
    ) {
      const url = new URL(window.location.href);
      url.searchParams.set("role", "admin");
      window.history.replaceState(
        window.history.state,
        document.title,
        `${url.pathname}${url.search}`,
      );
    }
    return pendingRole;
  }
  return null;
})();

// The two installable apps have fixed entry roles. The contributor app is the
// default; the admin manifest starts with ?role=admin. A persisted state can
// restore data and drafts, but never changes which surface is allowed here.
const launchMode: AppMode = entryRole === "admin" ? "admin" : "contributor";
const launchView: View = launchMode === "admin" ? "admin" : "home";
type AdminAccessState = "checking" | "allowed" | "denied" | "unavailable";

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
    // The URL/installed app chooses the surface; local state cannot switch
    // an admin installation into fieldwork or vice versa.
    mode: launchMode,
    view: launchView,
  }));
  const [hydrated, setHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminAccessState>(
    isSupabaseConfigured ? "checking" : "allowed",
  );
  const [previewUnlocked, setPreviewUnlocked] = useState(false);
  const [localCacheAvailable, setLocalCacheAvailable] = useState(false);
  const [explicitSignOut, setExplicitSignOutState] = useState(false);
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<
    Record<string, SyncProgressEntry>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [collectorPreview, setCollectorPreview] = useState(false);
  const {
    message: toast,
    tone: toastTone,
    show: showToast,
    dismiss: dismissToast,
  } = useTransientMessage();
  const {
    confirmation,
    request: requestConfirmation,
    resolve: resolveConfirmation,
  } = useConfirmation();
  const syncOwnerRef = useRef(`sync-worker-${crypto.randomUUID()}`);
  const stateRef = useRef(state);
  stateRef.current = state;
  const syncNowRef = useRef<
    (options?: { silent?: boolean }) => Promise<boolean>
  >(() => Promise.resolve(false));

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
    const applySession = (event: string, nextSession: Session | null) => {
      if (!active) return;
      const userId = nextSession?.user.id ?? null;
      // Every account gets its own IndexedDB database. Switching accounts
      // (or signing out to an anonymous scope) must never reuse another
      // person's cached projects, drafts, media, or outbox — while a
      // transient null session (offline refresh failure) must never flip a
      // live app into the wrong database either.
      const transition = nextLocalScope(lastUserId, userId, event);
      if (transition.scope !== null) setLocalScope(transition.scope);
      if (transition.reloadForAccountSwitch) {
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
      setSession(nextSession);
      if (nextSession) {
        setExplicitSignOutState(false);
        void setExplicitSignOut(false).catch(() => undefined);
      }
      setAuthLoading(false);
      if (nextSession) void claimInvites().catch(() => undefined);
    };
    void authSession().then(({ data }) =>
      applySession("INITIAL_SESSION", data.session),
    );
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => applySession(event, nextSession),
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
    // account's scoped database BEFORE anything reads local state, so the
    // first boot can never hydrate a blank database and then overwrite the
    // legacy rows with an autosave.
    void (async () => {
      if (isSupabaseConfigured && session?.user.id) {
        await migrateLegacyDatabase(session.user.id).catch(() => undefined);
      }
      if (!active) return;
      try {
        const probe = await probeLocalDatabase();
        if (!active) return;
        if (!probe.ok) {
          // Recovery mode: never boot a blank state over an unreadable
          // database, and never let the autosave effect overwrite it.
          setDbError(probe.error);
          setHydrated(true);
          return;
        }
        const [saved, storedBackendKey, storedExplicitSignOut] =
          await Promise.all([
            loadAppState(),
            getStoredBackendKey(),
            getExplicitSignOut(),
          ]);
        if (!active) return;
        setExplicitSignOutState(storedExplicitSignOut);
        const belongsToCurrentBackend =
          !isSupabaseConfigured || storedBackendKey === localBackendKey;
        setLocalCacheAvailable(Boolean(saved && belongsToCurrentBackend));
        if (saved && belongsToCurrentBackend) {
          if (!isSupabaseConfigured || saved.mode === "admin") {
            setAdminAccess("allowed");
          }
          setState((current) => ({
            ...current,
            ...saved,
            // Cached data is portable between the two installs, but their
            // navigation surfaces are not interchangeable.
            mode: launchMode,
            view:
              saved.mode === launchMode &&
              saved.view &&
              // Legacy caches may hold the removed project-detail view;
              // restore it onto the single home surface.
              String(saved.view) !== "project"
                ? saved.view
                : launchView,
            project: { ...current.project, ...saved.project },
            projects:
              saved.projects ??
              (saved.project ? [saved.project] : current.projects),
          }));
        }
        setHydrated(true);
      } catch {
        if (active) {
          setDbError("The local database could not be opened");
          setHydrated(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    const applyRemoteProjects = async (
      remoteProjects: Project[],
      adminAccess: boolean,
    ) => {
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
      setAdminAccess(hasAdminAccess ? "allowed" : "denied");
      if (remoteProjects.length) {
        setState((current) => ({
          ...current,
          projects: remoteProjects,
          project:
            remoteProjects.find(
              (candidate) => candidate.id === current.project.id,
            ) ?? remoteProjects[0],
        }));
      } else {
        const userOrg = hasAdminAccess
          ? await loadUserOrganizationName().catch(() => null)
          : null;
        setState((current) => ({
          ...current,
          projects: [],
          // Confirmed empty assignment: hide the cached project so a
          // revoked contributor cannot keep collecting offline into
          // ACTION_REQUIRED records. Keep the organization name for clarity.
          project: {
            ...emptyProject,
            organization:
              userOrg ??
              current.project.organization ??
              defaultOrganizationName,
          },
          mode: current.mode,
          view: current.mode === "admin" ? "admin" : "home",
        }));
      }
    };
    // Invites are claimed before the project list loads: an already-registered
    // contributor receives membership only through claim-invites, and the list
    // must never read an empty roster ahead of that upsert.
    void claimInvites()
      .catch(() => undefined)
      .then(() => Promise.all([loadAssignedProjects(), loadUserAdminAccess()]))
      .then(async ([remoteProjects, adminAccess]) => {
        if (!active) return;
        if (remoteProjects === null) {
          // A failed roster read must never look like "no projects assigned".
          // Retry with backoff; keep whatever the device already knew.
          for (const delay of [2000, 4000, 8000]) {
            if (!active) return;
            await new Promise((resolve) => window.setTimeout(resolve, delay));
            if (!active) return;
            const retried = await loadAssignedProjects();
            if (!active) return;
            if (retried !== null) {
              const adminAccessRetry = await loadUserAdminAccess();
              if (!active) return;
              await applyRemoteProjects(retried, adminAccessRetry);
              return;
            }
          }
          if (active)
            showToast(
              "Could not load your projects. Check your connection and reopen the app.",
              "failure",
            );
          return;
        }
        await applyRemoteProjects(remoteProjects, adminAccess);
      })
      .catch(() => {
        setAdminAccess((current) =>
          current === "allowed" ? current : "unavailable",
        );
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (dbError || !hydrated || collectorPreview) return;
    if (!(
      previewUnlocked ||
      session ||
      (isSupabaseConfigured && localCacheAvailable)
    ))
      return;
    const markReady = () => {
      const readyIds = (
        state.projects?.length ? state.projects : [state.project]
      ).map((candidate) => candidate.id);
      setState((current) => {
        const offlineReady = {
          ...current.offlineReady,
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
        .then(() => {
          markReady();
          // The durable receipt moment: only now may the UI claim the draft
          // is saved on the device. Keystrokes alone say "Saving…".
          setState((current) => ({
            ...current,
            lastSavedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
          setDraftSaving(false);
        })
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
  // Background Sync: register whenever there is pending work; the service
  // worker wakes the app and the same silent sync path runs.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !pendingCount) return;
    let active = true;
    void navigator.serviceWorker.ready
      .then((registration) => {
        // SAFETY: Background Sync API attaches a non-standard sync property to ServiceWorkerRegistration.
        const syncReg = registration as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> };
        };
        return syncReg.sync?.register("collect-sync").catch(() => undefined);
      })
      .catch(() => undefined);
    const onMessage = (event: MessageEvent) => {
      if (!active || event.data?.type !== "collect-sync") return;
      syncNowRef.current({ silent: true });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [pendingCount]);

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

  const navigate = (view: View) =>
    setState((current) => ({ ...current, view }));

  const selectProject = (project: AppState["project"], view: View = "home") =>
    setState((current) => ({ ...current, project, view }));

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    await setExplicitSignOut(true).catch(() => undefined);
    setSession(null);
    setExplicitSignOutState(true);
    setPreviewUnlocked(false);
    setSyncSheetOpen(false);
  };

  const isAsset = (item: FormValue): item is MediaAsset =>
    isRecord(item) && "id" in item && "name" in item;

  const updateDraft = (key: string, value: FormValue) => {
    // Photos/audio persist to MEDIA_STORE immediately (before any debounced
    // autosave), so a force-kill cannot lose a selection. Removed assets are
    // dropped from the draft store in the same step. Admin previews never
    // touch the durable draft.
    if (!collectorPreview && Array.isArray(value)) {
      const assets = value.filter(isAsset);
      const previous = state.draft[key];
      const removedIds = Array.isArray(previous)
        ? previous
            .filter(isAsset)
            .filter((asset) => !assets.some((next) => next.id === asset.id))
            .map((asset) => asset.id)
        : [];
      void saveDraftMedia(assets).catch(() => undefined);
      if (removedIds.length)
        void deleteDraftMedia(removedIds).catch(() => undefined);
    }
    if (!collectorPreview) setDraftSaving(true);
    // lastSavedAt is only refreshed by the debounced save commit; a per
    // keystroke timestamp both churned the shell render and claimed
    // durability that had not happened yet.
    setState((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
    }));
  };

  const discardDraftAndStart = async (project: AppState["project"]) => {
    const confirmed = await requestConfirmation({
      title: "Discard this draft?",
      message:
        "All answers and media in this unfinished observation will be permanently removed. This cannot be undone.",
      confirmLabel: "Discard and start new",
      cancelLabel: "Keep draft",
      destructive: true,
    });
    if (!confirmed) return;

    // Confirmation may stay open while background synchronization updates the
    // controller. Read the latest state now, not the render that opened it.
    const currentState = stateRef.current;
    const isAsset = (item: FormValue): item is MediaAsset =>
      isRecord(item) && "id" in item && "name" in item;
    const mediaIds = Object.values(currentState.draft).flatMap((value) =>
      Array.isArray(value)
        ? value.filter(isAsset).map((asset) => asset.id)
        : [],
    );
    const nextState: AppState = {
      ...currentState,
      project,
      draft: { observed_date: new Date().toISOString().slice(0, 10) },
      lastSavedAt: null,
      view: "collector",
    };

    // Write the empty draft immediately instead of relying on the debounced
    // autosave. A force-quit after an explicit discard must not restore it.
    setState(nextState);
    try {
      await saveAppState(nextState, localBackendKey);
      if (mediaIds.length) await deleteDraftMedia(mediaIds);
      setStorageError(null);
      showToast("New observation started");
    } catch {
      // Preserve any receipt or readiness update that arrived during the
      // failed write; restore only the draft and route we attempted to replace.
      setState((latest) => ({
        ...latest,
        project: currentState.project,
        draft: currentState.draft,
        lastSavedAt: currentState.lastSavedAt,
        view: "home",
      }));
      setStorageError(
        "The draft could not be discarded safely. It remains available on this device.",
      );
    }
  };

  const submitInFlightRef = useRef(false);
  const submitObservation = async (
    values: SubmissionValues,
    mediaAssets: MediaAsset[],
  ) => {
    // Synchronous guard: two rapid taps before React re-renders must not
    // commit two observations.
    if (isSaving || submitInFlightRef.current) return;
    submitInFlightRef.current = true;
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
          ...current.fieldworkComplete,
          [state.project.id]: false,
        },
        draft: { observed_date: new Date().toISOString().slice(0, 10) },
        lastSavedAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        // Return to the capture-first surface so the next observation is one
        // tap away; project details remain secondary.
        view: "home",
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
      showToast("Could not complete the local save", "failure");
    } finally {
      submitInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const syncNow = (options?: { silent?: boolean }) =>
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
      silent: options?.silent,
    });

  syncNowRef.current = syncNow;

  useSyncLifecycle({
    configured: isSupabaseConfigured,
    session,
    hydrated,
    enabled: state.mode === "contributor",
    pendingCount,
    state,
    isSyncing,
    appVersion: APP_VERSION,
    syncNow,
  });

  const exportRecoveryPackage = async () => {
    const isMobile = isMobileDevice();
    const totalMediaBytes = (state.observations ?? []).reduce(
      (acc, obs) =>
        acc +
        (obs.media ?? []).reduce((mAcc, m) => mAcc + (m.byteSize || 0), 0),
      0,
    );
    const mediaCount = (state.observations ?? []).reduce(
      (acc, obs) => acc + (obs.media?.length ?? 0),
      0,
    );
    const isLarge =
      totalMediaBytes > 15_000_000 ||
      mediaCount >= 10 ||
      (state.observations?.length ?? 0) >= 50;

    if (isMobile && isLarge) {
      const confirmed = await requestConfirmation({
        title: "Large recovery package",
        message:
          "This recovery package contains a large volume of data. For faster downloads and easier archival, logging in from a desktop browser is recommended. Do you want to download on this device anyway?",
        confirmLabel: "Download anyway",
        cancelLabel: "Cancel",
      });
      if (!confirmed) return;
    }

    return downloadRecoveryPackage({
      project: state.project,
      observations: state.observations,
      onComplete: () => showToast("Recovery package downloaded"),
    }).catch(() =>
      showToast("The recovery package could not be created", "failure"),
    );
  };

  const publishProject = async (
    input: Parameters<typeof createRemoteProject>[0],
  ) => {
    if (isSupabaseConfigured && session) {
      const { project: remoteProject, failedInvites } =
        await createRemoteProject(input);
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
      if (failedInvites.length > 0) {
        showToast(
          failedInvites.length === 1
            ? `Project published · the invitation to ${failedInvites[0]} could not be sent — resend it from the roster`
            : `Project published · ${failedInvites.length} invitations could not be sent — resend them from the roster`,
          "failure",
        );
      } else {
        showToast("Project published and invitations sent");
      }
    } else {
      showToast("Project published in local demo mode");
    }
    navigate("admin");
  };

  const exportCheckpoint = async () => {
    const isMobile = isMobileDevice();
    const isLarge =
      (state.project.completeSubmissions ?? 0) >= 10 ||
      (state.observations?.length ?? 0) >= 10;

    if (isMobile && isLarge) {
      const confirmed = await requestConfirmation({
        title: "Large checkpoint archive",
        message:
          "This checkpoint contains a large dataset and media files. For faster downloads and easier archival, logging in from a desktop browser is recommended. Do you want to download on this device anyway?",
        confirmLabel: "Download anyway",
        cancelLabel: "Cancel",
      });
      if (!confirmed) return;
    }

    try {
      if (isSupabaseConfigured && session) {
        const result = await createCheckpoint(state.project.id);
        if (result.downloadUrl) {
          const safeSlug =
            (state.project.name || "project")
              .toLowerCase()
              .replace(/[^a-z0-9_-]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "") || "project";
          const filename = `${safeSlug}_checkpoint-${new Date().toISOString().slice(0, 10)}.zip`;
          downloadUrl(result.downloadUrl, filename);
          showToast("Checkpoint archive downloaded");
          return;
        }
      }
      // Demo / offline / unconfigured fallback: generate client-side checkpoint package
      await exportClientCheckpoint({
        project: state.project,
        observations: state.observations,
      });
      showToast("Checkpoint archive downloaded");
    } catch {
      showToast("Checkpoint could not be prepared", "failure");
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
        showToast("Project status could not be updated", "failure");
        return;
      }
    }
    setState((current) => {
      const project: Project = {
        ...current.project,
        status: nextStatus,
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

  const requiresAuthentication = isSupabaseConfigured
    ? !session &&
      (launchMode === "admin" || !localCacheAvailable || explicitSignOut)
    : !previewUnlocked;

  // The offline contributor keeps working past the auth gate, but once the
  // session has expired they cannot sync until they sign in again. Say so
  // persistently instead of relying on toasts from background sync runs.
  const pendingUnsyncedCount = state.observations.filter(
    (observation) => observation.status !== "SYNCED",
  ).length;
  const sessionExpiredWithPendingWork =
    isSupabaseConfigured &&
    session === null &&
    !authLoading &&
    hydrated &&
    !explicitSignOut &&
    !requiresAuthentication &&
    pendingUnsyncedCount > 0;

  // One-time collection consent: shown at first sign-in; the server refuses
  // submissions without it. Recorded on the contributor profile.
  const [consentState, setConsentState] = useState<
    "loading" | "required" | "granted"
  >("loading");
  const [consentVersion, setConsentVersion] = useState<ConsentVersion | null>(
    null,
  );

  // One-time password setup after a project invitation, so the contributor
  // can sign in on any device/container with email + password.
  const [requirePasswordSetup, setRequirePasswordSetup] = useState(false);
  const inviteConsumedRef = useRef(false);
  useEffect(() => {
    if (!isSupabaseConfigured || !session || inviteConsumedRef.current) return;
    if (wasInviteCallback()) {
      inviteConsumedRef.current = true;
      setRequirePasswordSetup(true);
    }
  }, [session]);

  const completePasswordSetup = async (password?: string): Promise<void> => {
    // The AuthScreen already performed the password update; this callback
    // only clears the gate (and never overwrites with an empty password).
    if (password) await setPassword(password);
    setRequirePasswordSetup(false);
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !session) {
      setConsentState("loading");
      return;
    }
    let active = true;
    void Promise.all([getMyProfile(), getCurrentConsent()])
      .then(([profile, consent]) => {
        if (!active) return;
        setConsentVersion(consent);
        setConsentState(isConsentGranted(profile) ? "granted" : "required");
      })
      .catch(() => {
        if (active) {
          // The profile is unreachable (offline). Do not block already-granted
          // consent holders; a new user will be asked again when reachable.
          setConsentState("granted");
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  const recordConsent = async (): Promise<void> => {
    if (!consentVersion)
      throw new Error("The consent statement is not available");
    await acceptConsent(consentVersion.version);
    setConsentState("granted");
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
      // Preview answers are disposable; never leave them as a real draft.
      draft: { observed_date: new Date().toISOString().slice(0, 10) },
    }));
    showToast("Preview complete");
  };

  const cancelContributorPreview = () => {
    setCollectorPreview(false);
    setState((current) => ({
      ...current,
      mode: "admin",
      view: "admin-project",
      draft: { observed_date: new Date().toISOString().slice(0, 10) },
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
  const openSyncSheetAndSync = () => {
    setSyncSheetOpen(true);
    void syncNow();
  };
  const closeSyncSheet = () => setSyncSheetOpen(false);

  return {
    state,
    surface,
    configured: isSupabaseConfigured,
    hydrated,
    authLoading,
    requiresAuthentication,
    sessionExpiredWithPendingWork,
    pendingUnsyncedCount,
    session,
    canAdmin: adminAccess === "allowed",
    adminAccess,
    previewUnlocked,
    syncSheetOpen,
    isSyncing,
    syncProgress,
    isSaving,
    draftSaving,
    storageError,
    dbError,
    toast,
    toastTone,
    collectorPreview,
    consentState,
    consentVersion,
    requirePasswordSetup,
    pendingCount,
    selectedObservations,
    hasDraft,
    actions: {
      showToast,
      requestConfirmation,
      resolveConfirmation,
      navigate,
      selectProject,
      signOut,
      updateDraft,
      discardDraftAndStart,
      submitObservation,
      openSyncSheetAndSync,
      closeSyncSheet,
      syncNow,
      exportRecoveryPackage,
      publishProject,
      exportCheckpoint,
      toggleProjectStatus,
      beginContributorPreview,
      completeContributorPreview,
      cancelContributorPreview,
      applySchemaPublished,
      unlockPreview,
      dismissStorageError,
      dismissToast,
      recordConsent,
      completePasswordSetup,
    },
    confirmation,
  };
}
