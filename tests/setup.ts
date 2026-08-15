// Shared vitest setup: fake IndexedDB everywhere, and a `window` shim for the
// node-environment ledger tests (localStore guards use `"indexedDB" in window`).
import "fake-indexeddb/auto";

if (!("window" in globalThis)) {
  // SAFETY: shim window on globalThis for node test environment.
  (globalThis as { window?: unknown }).window = globalThis;
}
if (!("navigator" in globalThis)) {
  // SAFETY: shim navigator on globalThis for node test environment.
  (globalThis as { navigator?: unknown }).navigator = {
    onLine: true,
  };
}

if (globalThis.Element && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
