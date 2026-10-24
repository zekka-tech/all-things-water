// Bump CACHE_NAME whenever this file's caching strategy changes.
const CACHE_NAME = "atw-v3";
const APP_SHELL = ["/"];
const MAX_ASSET_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

/** Keep the cache bounded: drop the oldest entries beyond the limit. */
async function trimCache(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSET_ENTRIES))) {
    await cache.delete(key);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network first, fall back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  // Vite's /assets/* filenames are content-hashed, so they never change:
  // cache-first is safe. Everything else (manifest, sitemap, icons) goes to
  // the network so deploys are never masked by a stale copy.
  if (!url.pathname.startsWith("/assets/")) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
      await trimCache(cache);
    }
    return response;
  })());
});
