// static cache key changes when you edit assets
const STATIC_CACHE = "static-v1";
const API_CACHE = "api-v1";
const STATIC_FILES = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // cache-first for same-origin static files
  if (STATIC_FILES.includes(url.pathname)) {
    e.respondWith(caches.match(request).then((res) => res || fetch(request)));
    return;
  }

  // network-first for API GETs
  if (url.pathname.startsWith("/api/") && request.method === "GET") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(API_CACHE).then((c) => c.put(request, resClone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
});
