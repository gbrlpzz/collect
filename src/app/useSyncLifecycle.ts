import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState } from "../types";
import { getOrCreateDeviceId, getOutboxOperations } from "../lib/localStore";
import { probeRemoteHealth, reportDeviceStatus } from "../lib/remoteBackend";

interface SyncLifecycleInput {
  configured: boolean;
  session: Session | null;
  hydrated: boolean;
  pendingCount: number;
  state: AppState;
  isSyncing: boolean;
  appVersion: string;
  syncNow: () => Promise<boolean>;
}

export function useSyncLifecycle({
  configured,
  session,
  hydrated,
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
    if (!configured || !session || !pendingCount) return;

    const attempt = () => {
      void probeRemoteHealth().then((available) => {
        if (available) void syncNowRef.current();
      });
    };

    window.addEventListener("online", attempt);
    window.addEventListener("visibilitychange", attempt);
    attempt();

    return () => {
      window.removeEventListener("online", attempt);
      window.removeEventListener("visibilitychange", attempt);
    };
  }, [configured, pendingCount, session]);

  useEffect(() => {
    if (!configured || !session || !hydrated) return;

    const check = () => {
      if (isSyncingRef.current) return;
      void getOutboxOperations()
        .then((operations) => {
          const due = operations.some(
            (operation) =>
              (operation.state === "QUEUED" ||
                operation.state === "RETRYABLE_ERROR") &&
              new Date(operation.nextAttemptAt).getTime() <= Date.now(),
          );
          if (due) {
            void probeRemoteHealth().then((available) => {
              if (available) void syncNowRef.current();
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
  }, [configured, hydrated, session]);

  useEffect(() => {
    if (!configured || !session || !hydrated || !state.projects?.length) return;
    let active = true;

    const report = async () => {
      const deviceId = await getOrCreateDeviceId().catch(() => null);
      if (!deviceId || !active) return;

      await Promise.all(
        state.projects!.map((project) => {
          const projectObservations = state.observations.filter(
            (observation) =>
              (observation.projectId ?? state.project.id) === project.id,
          );
          return reportDeviceStatus({
            device_id: deviceId,
            project_id: project.id,
            pending_submissions: projectObservations.filter(
              (observation) => observation.status !== "SYNCED",
            ).length,
            pending_media: projectObservations
              .filter((observation) => observation.status !== "SYNCED")
              .reduce(
                (total, observation) =>
                  total + (observation.media?.length ?? 0),
                0,
              ),
            app_version: appVersion,
            schema_versions_cached: [project.schemaVersion],
            fieldwork_complete: state.fieldworkComplete?.[project.id] ?? false,
          }).catch(() => undefined);
        }),
      );
    };

    const attempt = () => {
      void report();
    };
    attempt();
    window.addEventListener("online", attempt);
    window.addEventListener("visibilitychange", attempt);

    return () => {
      active = false;
      window.removeEventListener("online", attempt);
      window.removeEventListener("visibilitychange", attempt);
    };
  }, [appVersion, configured, hydrated, pendingCount, session, state]);
}
