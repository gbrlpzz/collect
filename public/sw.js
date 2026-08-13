// collect service worker: precached app shell + runtime cache-first assets.
// The hashed asset list is emitted by the Vite build (precache-manifest.json)
// so an installed app loads offline from the first launch.
const CACHE = "collect-shell-v4";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/manifest-admin.webmanifest",
  "/icon.svg",
  "/icon-admin.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-admin-192.png",
  "/icon-admin-512.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-admin.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        // Precaches are best-effort: a missing entry must not fail install.
        const entries = [...CORE];
        try {
          const response = await fetch("/precache-manifest.json", {
            cache: "no-store",
          });
          if (response.ok) {
            const list = await response.json();
            if (Array.isArray(list))
              entries.push(...list.map((url) => String(url)));
          }
        } catch {
          // Offline first install: shell core still precaches.
        }
        await Promise.allSettled(
          entries.map((url) => cache.add(url).catch(() => undefined)),
        );
        return self.skipWaiting();
      })
      .catch(() => undefined),
  );
});

// Background Sync: when the browser wakes the worker for a pending sync,
// nudge every open collect window; the app decides whether work is due.
self.addEventListener("sync", (event) => {
  if (event.tag !== "collect-sync") return;
  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true })
      .then((clients) =>
        clients.forEach((client) =>
          client.postMessage({ type: "collect-sync" }),
        ),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "collect-sync-ok") return;
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches
              .open(CACHE)
              .then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Assets are never answered with the HTML shell; only navigations
          // fall back to the cached index.
          return Response.error();
        });
    }),
  );
});
