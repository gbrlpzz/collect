// Shared vitest setup: fake IndexedDB everywhere, and a `window` shim for the
// node-environment ledger tests (localStore guards use `"indexedDB" in window`).
import "fake-indexeddb/auto";

if (typeof globalThis.window === "undefined") {
  (globalThis as Record<string, unknown>).window = globalThis;
}
if (typeof globalThis.navigator === "undefined") {
  (globalThis as Record<string, unknown>).navigator = { onLine: true } as Navigator;
}

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}
