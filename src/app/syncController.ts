import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSubmissionRetryable } from "../types";
import type { AppState, SyncProgressEntry } from "../types";
import {
  acquireSyncLease,
  getOrCreateDeviceId,
  markLocalSubmissionsSynced,
  recordOutboxFailure,
  releaseSyncLease,
} from "../lib/localStore";
import {
  reportDeviceStatus,
  syncRemoteObservation,
} from "../lib/remoteBackend";

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
}

export async function syncNow({
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
}: SyncControllerArgs): Promise<boolean> {
  const retryableCount = state.observations.filter((item) =>
    isSubmissionRetryable(item.status),
  ).length;
  if (!retryableCount || isSyncing) {
    if (pendingCount && !retryableCount)
      showToast("A saved observation needs attention before it can sync");
    return false;
  }
  setIsSyncing(true);
  showToast(
    configured
      ? "Sync started · local records remain available"
      : "Sync started · local demo adapter",
  );
  await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
  let leaseAcquired = false;
  try {
    leaseAcquired = await acquireSyncLease(syncOwner);
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
  const leaseRefreshTimer = window.setInterval(() => {
    void acquireSyncLease(syncOwner).catch(() => undefined);
  }, 10_000);
  const pending = state.observations.filter((item) =>
    isSubmissionRetryable(item.status),
  );
  let completed = false;
  try {
    try {
      if (configured && !session)
        throw new Error(
          "Authentication is required before synchronization can continue",
        );
      const deviceId = configured ? await getOrCreateDeviceId() : "demo-device";
      for (const observation of pending) {
        try {
          const project =
            state.projects?.find(
              (candidate) => candidate.id === observation.projectId,
            ) ?? state.project;
          const receipt = configured
            ? await syncRemoteObservation(
                { observation, project, deviceId, appVersion: appVersion },
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
                        phase: current[submissionId]?.phase ?? "SYNCING_MEDIA",
                        media: {
                          ...(current[submissionId]?.media ?? {}),
                          [mediaId]: percent,
                        },
                      },
                    })),
                },
              )
            : null;
          const receiptAt = new Date().toISOString();
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
                    completeSubmissions: candidate.completeSubmissions + 1,
                    lastReceived: "Just now",
                  }
                : candidate,
            );
            const nextProject =
              current.project.id === project.id
                ? {
                    ...current.project,
                    completeSubmissions:
                      current.project.completeSubmissions + 1,
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
          const actionRequired =
            /unknown schema|revoked|forbidden|not authorized|permission|conflict|corrupt|assignment is not active|belongs to another|immutable|does not match the published schema|is not a published option|not configured as the first administrator/i.test(
              message,
            );
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
          throw error;
        }
      }
      if (configured) {
        const completedIds = new Set(
          pending.map((observation) => observation.id),
        );
        await Promise.all(
          (state.projects ?? [state.project]).map((project) => {
            const projectObservations = state.observations.filter(
              (observation) =>
                (observation.projectId ?? state.project.id) === project.id &&
                !completedIds.has(observation.id),
            );
            return reportDeviceStatus({
              device_id: deviceId,
              project_id: project.id,
              pending_submissions: projectObservations.filter(
                (observation) => observation.status !== "SYNCED",
              ).length,
              pending_media: projectObservations.reduce(
                (total, observation) =>
                  total + (observation.media?.length ?? 0),
                0,
              ),
              app_version: appVersion,
              schema_versions_cached: [project.schemaVersion],
              fieldwork_complete:
                state.fieldworkComplete?.[project.id] ?? false,
            }).catch(() => undefined);
          }),
        );
      }
      completed = true;
      showToast(
        configured
          ? "All saved observations are synced"
          : "All saved observations are synced in demo mode",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        /Authentication is required/.test(error.message)
      )
        showToast(
          "Sign in again when you have a connection to sync this fieldwork",
        );
      else showToast("Sync paused · your local records are still safe");
    }
  } finally {
    window.clearInterval(leaseRefreshTimer);
    setIsSyncing(false);
    if (completed) setSyncProgress({});
    void releaseSyncLease(syncOwner).catch(() => undefined);
  }
  return completed;
}
