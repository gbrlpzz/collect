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
export function useReadiness(projectId: string | null): {
  readiness: ContributorReadiness[] | null;
  refresh: () => void;
} {
  const [readiness, setReadiness] = useState<ContributorReadiness[] | null>(
    null,
  );
  const intervalRef = useRef<number | undefined>(undefined);
  const loadingRef = useRef(false);

  const refresh = useCallback(() => {
    if (!projectId || !isSupabaseConfigured) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    void loadProjectReadiness(projectId)
      .then(setReadiness)
      .catch(() => setReadiness([]))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !isSupabaseConfigured) {
      setReadiness(null);
      return;
    }
    setReadiness(null);
    refresh();
    intervalRef.current = window.setInterval(refresh, REFRESH_MS);
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

  return { readiness, refresh };
}
