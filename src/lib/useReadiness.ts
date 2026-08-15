import { useCallback, useEffect, useRef, useState } from "react";
import type { ContributorReadiness } from "./adminBackend";
import { loadProjectReadiness } from "./adminBackend";
import { isSupabaseConfigured } from "./supabaseClient";

const REFRESH_MS = 30_000;

/**
 * Auto-refreshing contributor readiness: polls while the admin surface is
 * visible and refreshes immediately on focus/visibility, so no manual
 * refresh is ever needed.
 */
export interface ReadinessHookResult {
  readiness: ContributorReadiness[] | null;
  error: boolean;
  refresh: () => void;
}

/**
 * Auto-refreshing contributor readiness: polls while the admin surface is
 * visible and refreshes immediately on focus/visibility, so no manual
 * refresh is ever needed.
 */
export function useReadiness(projectId: string | null): ReadinessHookResult {
  const [readiness, setReadiness] = useState<ContributorReadiness[] | null>(
    null,
  );
  const [error, setError] = useState(false);
  const intervalRef = useRef<number | undefined>(undefined);
  const loadingRef = useRef(false);

  const refresh = useCallback(() => {
    if (!projectId || !isSupabaseConfigured) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setError(false);
    void loadProjectReadiness(projectId)
      .then(setReadiness)
      // Keep the last known roster if a background refresh fails. An empty
      // array means "no contributors", never "the network failed".
      .catch(() => setError(true))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured) {
      setReadiness(null);
      setError(false);
      return;
    }
    setReadiness(null);
    setError(false);
    refresh();
    intervalRef.current = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      if (intervalRef.current !== undefined)
        window.clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [projectId, refresh]);

  return { readiness, error, refresh };
}
