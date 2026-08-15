import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSubmissionRetryable } from "../types";
import type { AppState, SyncProgressEntry } from "../types";
import {
  ActionRequiredError,
  isActionRequiredFailure,
} from "../lib/syncErrors";
import {
  acquireSyncLease,
  getOrCreateDeviceId,
  getOutboxOperations,
  getPendingOutboxCountsByProject,
  hasLocalReceipt,
  markLocalSubmissionsSynced,
  recordOutboxFailure,
  releaseSyncLease,
} from "../lib/localStore";
import { reportDeviceStatus, syncRemoteObservation } from "../lib/remoteBackend";

interface SyncControllerArgs {
  state: AppState;
  session: Session | null;
  configured: boolean;
  appVersion: string;
  pendingCount: number;
  isSyncing: boolean;
  syncOwner: string;
  setState: Dispatch<SetStateAction<AppState>>;
  setIsSyncing: Dispatch<SetStateAction<boolean>>;
  setSyncProgress: Dispatch<SetStateAction<Record<string, SyncProgressEntry>>>;
  showToast: (message: string) => void;
  /** Background (lifecycle) runs stay quiet; manual taps keep feedback. */
  silent?: boolean;
  /** Injectable for tests; production always runs the real remote sync. */
  remoteSync?: typeof syncRemoteObservation;
}

// Process-level single flight: a lifecycle trigger and a manual tap in the
// same tick share one run instead of racing for the lease.
let inFlightSync: Promise<boolean> | null = null;

/**
 * Background runs (silent) honor the outbox backoff schedule so a failing
 * observation is not re-attempted on every tab focus; a manual tap is an
 * explicit user instruction and retries immediately.
 */
async function dueForBackoff(
  observations: AppState["observations"],
): Promise<AppState["observations"]> {
  try {
    const operations = await getOutboxOperations();
    const nextAttemptById = new Map(
      operations
        .filter((operation) => operation.state !== "ACKNOWLEDGED")
        .map((operation) => {
          const at = new Date(operation.nextAttemptAt).getTime();
          return [operation.id, Number.isFinite(at) ? at : 0] as const;
        }),
    );
    const now = Date.now();
    return observations.filter((observation) => {
      const operationIds = [
        `submission:${observation.id}`,
        `finalize:${observation.id}`,
        ...(observation.media ?? []).map((asset) => `media:${asset.id}`),
      ];
      return operationIds.every((operationId) => {
        const nextAttempt = nextAttemptById.get(operationId);
        return nextAttempt === undefined || nextAttempt <= now;
      });
    });
  } catch {
    // The outbox is unreadable (storage busy); behave like the old path and
    // attempt the work rather than silently dropping it.
    return observations;
  }
}

export function syncNow({
  state,
  session,
  configured,
  appVersion,
  pendingCount,
  isSyncing,
  syncOwner,
  setState,
  setIsSyncing,
  setSyncProgress,
  showToast,
  silent = false,
  remoteSync = syncRemoteObservation,
}: SyncControllerArgs): Promise<boolean> {
  if (inFlightSync) return inFlightSync;
  const retryableCount = state.observations.filter((item) =>
    isSubmissionRetryable(item.status),
  ).length;
  if (!retryableCount || isSyncing) {
    if (!silent && pendingCount && !retryableCount)
      showToast("A saved observation needs attention before it can sync");
    return Promise.resolve(false);
  }

  const run = (async () => {
    setIsSyncing(true);
    if (!silent)
      showToast(
        configured
          ? "Sync started · local records remain available"
          : "Sync started · local demo adapter",
      );
    let leaseAcquired = false;
    try {
      leaseAcquired = await acquireSyncLease(syncOwner);
    } catch {
      setIsSyncing(false);
      if (!silent) showToast("Sync is unavailable while local storage is busy");
      return false;
    }
    if (!leaseAcquired) {
      setIsSyncing(false);
      if (!silent)
        showToast("Another collect window is already syncing this project");
      return false;
    }
    const leaseRefreshTimer = window.setInterval(() => {
      void acquireSyncLease(syncOwner).catch(() => undefined);
    }, 10_000);
    let pending = state.observations.filter((item) =>
      isSubmissionRetryable(item.status),
    );
    if (silent && pending.length) {
      pending = await dueForBackoff(pending);
      if (!pending.length) {
        window.clearInterval(leaseRefreshTimer);
        setIsSyncing(false);
        void releaseSyncLease(syncOwner).catch(() => undefined);
        return false;
      }
    }
    const syncedIds = new Set<string>();
    let failedCount = 0;
    let completed = false;
    try {
      try {
        if (configured && !session)
          throw new Error(
            "Authentication is required before synchronization can continue",
          );
        const deviceId = configured
          ? await getOrCreateDeviceId()
          : "demo-device";
        for (const observation of pending) {
          try {
            const project =
              state.projects?.find(
                (candidate) => candidate.id === observation.projectId,
              ) ?? state.project;
            const receipt = configured
              ? await remoteSync(
                  {
                    observation,
                    project,
                    deviceId,
                    appVersion: appVersion,
                  },
                  {
                    onPhase: (submissionId, phase) =>
                      setSyncProgress((current) => ({
                        ...current,
                        [submissionId]: {
                          phase,
                          media: current[submissionId]?.media ?? {},
                        },
                      })),
                    onMediaProgress: (submissionId, mediaId, percent) =>
                      setSyncProgress((current) => ({
                        ...current,
                        [submissionId]: {
                          phase:
                            current[submissionId]?.phase ?? "SYNCING_MEDIA",
                          media: {
                            ...current[submissionId]?.media,
                            [mediaId]: percent,
                          },
                        },
                      })),
                  },
                )
              : null;
            // The receipt must name exactly this submission before the local
            // queue is cleared.
            if (
              configured &&
              receipt &&
              receipt.submission_id !== observation.id
            )
              throw new ActionRequiredError(
                "Server receipt does not match the submission identifier",
              );
            const alreadyCounted = configured
              ? await hasLocalReceipt(observation.id)
              : false;
            syncedIds.add(observation.id);
            const receiptAt = receipt?.received_at ?? new Date().toISOString();
            await markLocalSubmissionsSynced([observation.id], {
              receivedAt: receiptAt,
              finalizedAt: receipt?.finalized_at ?? null,
              serverStatus: receipt?.status ?? "COMPLETE",
              demo: !configured,
            });
            setState((current) => {
              const nextProjects = (current.projects ?? []).map((candidate) =>
                candidate.id === project.id
                  ? {
                      ...candidate,
                      completeSubmissions:
                        candidate.completeSubmissions +
                        (alreadyCounted ? 0 : 1),
                      lastReceived: "Just now",
                    }
                  : candidate,
              );
              const nextProject =
                current.project.id === project.id
                  ? {
                      ...current.project,
                      completeSubmissions:
                        current.project.completeSubmissions +
                        (alreadyCounted ? 0 : 1),
                      lastReceived: "Just now",
                    }
                  : current.project;
              return {
                ...current,
                project: nextProject,
                projects: nextProjects,
                observations: current.observations.map((item) =>
                  item.id === observation.id
                    ? { ...item, status: "SYNCED" as const, deviceId }
                    : item,
                ),
                lastSyncAt: receiptAt,
              };
            });
            setSyncProgress((current) => {
              const next = { ...current };
              delete next[observation.id];
              return next;
            });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Synchronization could not be completed";
            setSyncProgress((current) => {
              const next = { ...current };
              delete next[observation.id];
              return next;
            });
            failedCount += 1;
            // Errors the automation cannot resolve (schema mismatch, revoked
            // assignment, media integrity, conflicts) become ACTION_REQUIRED;
            // transient failures stay retryable. One failed observation never
            // blocks the rest of the queue.
            const actionRequired = isActionRequiredFailure(error);
            await recordOutboxFailure(observation.id, message, actionRequired);
            setState((current) => ({
              ...current,
              observations: current.observations.map((item) =>
                item.id === observation.id
                  ? {
                      ...item,
                      status: actionRequired
                        ? ("ACTION_REQUIRED" as const)
                        : ("RETRYABLE_ERROR" as const),
                    }
                  : item,
              ),
            }));
          }
        }
        if (configured) {
          const draftDirty = Object.entries(state.draft).some(
            ([key, value]) =>
              key !== "observed_date" && value !== "" && value !== undefined,
          );
          const countsByProject = await getPendingOutboxCountsByProject().catch(
            () => null,
          );
          if (countsByProject) {
            await Promise.all(
              (state.projects ?? [state.project]).map(async (project) => {
                const counts = countsByProject.get(project.id) ?? {
                  pendingSubmissions: 0,
                  pendingMedia: 0,
                };
                return reportDeviceStatus({
                  device_id: deviceId,
                  project_id: project.id,
                  pending_submissions: counts.pendingSubmissions,
                  pending_media: counts.pendingMedia,
                  app_version: appVersion,
                  schema_versions_cached: [project.schemaVersion],
                  fieldwork_complete:
                    counts.pendingSubmissions === 0 &&
                    counts.pendingMedia === 0 &&
                    !draftDirty,
                }).catch(() => undefined);
              }),
            );
          }
        }
        completed = syncedIds.size > 0 && failedCount === 0;
        if (!silent) {
          if (failedCount > 0 && syncedIds.size > 0)
            showToast("Some observations synced; the rest will keep retrying");
          else if (completed)
            showToast(
              configured
                ? "All saved observations are synced"
                : "All saved observations are synced in demo mode",
            );
        }
      } catch (error) {
        if (
          error instanceof Error &&
          /Authentication is required/.test(error.message)
        ) {
          if (!silent)
            showToast(
              "Sign in again when you have a connection to sync this fieldwork",
            );
        } else if (!silent)
          showToast("Sync paused · your local records are still safe");
      }
    } finally {
      window.clearInterval(leaseRefreshTimer);
      setIsSyncing(false);
      if (completed) setSyncProgress({});
      void releaseSyncLease(syncOwner).catch(() => undefined);
    }
    return completed;
  })();
  inFlightSync = run;
  void run.finally(() => {
    if (inFlightSync === run) inFlightSync = null;
  });
  return run;
}
