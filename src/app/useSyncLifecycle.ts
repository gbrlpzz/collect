import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState } from "../types";
import {
  getOrCreateDeviceId,
  getOutboxOperations,
  getPendingOutboxCounts,
} from "../lib/localStore";
import { probeRemoteHealth, reportDeviceStatus } from "../lib/remoteBackend";

interface SyncLifecycleInput {
  configured: boolean;
  session: Session | null;
  hydrated: boolean;
  /** Only the contributor surface reports device status/readiness. */
  enabled: boolean;
  pendingCount: number;
  state: AppState;
  isSyncing: boolean;
  appVersion: string;
  syncNow: (options?: { silent?: boolean }) => Promise<boolean>;
}

const HEARTBEAT_DEBOUNCE_MS = 10_000;

export function useSyncLifecycle({
  configured,
  session,
  hydrated,
  enabled,
  pendingCount,
  state,
  isSyncing,
  appVersion,
  syncNow,
}: SyncLifecycleInput): void {
  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;
  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;

  useEffect(() => {
    if (!enabled || !configured || !session || !pendingCount) return;

    const visible = () => document.visibilityState !== "hidden";
    const attempt = () => {
      if (!visible()) return;
      void probeRemoteHealth().then((available) => {
        if (available) void syncNowRef.current({ silent: true });
      });
    };

    window.addEventListener("online", attempt);
    window.addEventListener("visibilitychange", attempt);
    attempt();

    return () => {
      window.removeEventListener("online", attempt);
      window.removeEventListener("visibilitychange", attempt);
    };
  }, [configured, enabled, pendingCount, session]);

  useEffect(() => {
    if (!enabled || !configured || !session || !hydrated) return;

    const check = () => {
      if (isSyncingRef.current) return;
      void getOutboxOperations()
        .then((operations) => {
          const due = operations.some(
            (operation) =>
              (operation.state === "QUEUED" ||
                operation.state === "RETRYABLE_ERROR" ||
                // IN_PROGRESS rows left by a killed tab are rescued here once
                // the lease has expired (the launch effect covers the same
                // case for a fresh boot).
                operation.state === "IN_PROGRESS") &&
              new Date(operation.nextAttemptAt).getTime() <= Date.now(),
          );
          if (due) {
            void probeRemoteHealth().then((available) => {
              if (available) void syncNowRef.current({ silent: true });
            });
          }
        })
        .catch(() => undefined);
    };

    const timer = window.setInterval(check, 30_000);
    window.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, [configured, enabled, hydrated, session]);

  // Device status heartbeat. Coalesced so keystroke-level state churn cannot
  // spam the network; derived from the durable outbox so acknowledged media
  // and finalized submissions never reappear as pending.
  useEffect(() => {
    if (
      !enabled ||
      !configured ||
      !session ||
      !hydrated ||
      !state.projects?.length
    )
      return;
    let active = true;
    let timer: number | undefined;

    const report = async () => {
      const deviceId = await getOrCreateDeviceId().catch(() => null);
      if (!deviceId || !active) return;

      const draftDirty = Object.entries(state.draft).some(
        ([key, value]) =>
          key !== "observed_date" && value !== "" && value !== undefined,
      );
      await Promise.all(
        state.projects!.map(async (project) => {
          const counts = await getPendingOutboxCounts(project.id);
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
    };

    const schedule = () => {
      if (!active) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        void report();
      }, HEARTBEAT_DEBOUNCE_MS);
    };

    schedule();
    window.addEventListener("online", schedule);
    window.addEventListener("visibilitychange", schedule);

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("online", schedule);
      window.removeEventListener("visibilitychange", schedule);
    };
  }, [appVersion, configured, enabled, hydrated, pendingCount, session, state]);
}
