/**
 * Local database scope policy for auth transitions.
 *
 * Every account reads and writes its own IndexedDB database
 * (collect-local-v1-<userId>). The scope must follow the signed-in account —
 * but a transient null session (an offline token-refresh failure) must never
 * flip a live app into the anonymous "default" database: autosave would
 * silently write into the wrong store and the account's real data would seem
 * to vanish. Only an explicit sign-out returns to the anonymous scope.
 */

export interface ScopeTransition {
  /** The scope to apply, or null when nothing should change. */
  scope: string | null;
  /** A different person signed in: in-memory state must reset and reload. */
  reloadForAccountSwitch: boolean;
}

export function nextLocalScope(
  lastUserId: string | null,
  nextUserId: string | null,
  event: string,
): ScopeTransition {
  if (nextUserId !== null) {
    if (lastUserId !== null && nextUserId !== lastUserId) {
      return { scope: nextUserId, reloadForAccountSwitch: true };
    }
    // First assignment on a fresh boot (or returning to the same account):
    // adopt the account scope; re-applying the current one is a no-op.
    return { scope: nextUserId, reloadForAccountSwitch: false };
  }
  // No session: only an explicit sign-out leaves the account scope. A token
  // refresh failure fires other events and must keep the account's database.
  if (event === "SIGNED_OUT") {
    return { scope: "default", reloadForAccountSwitch: false };
  }
  return { scope: null, reloadForAccountSwitch: false };
}
