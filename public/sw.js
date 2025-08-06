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
// Add to your existing app.js PWA section
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then((registration) => {
      console.log("Service Worker registered successfully");

      // Listen for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New content is available
            if (confirm("New version available! Reload to update?")) {
              window.location.reload();
            }
          }
        });
      });
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

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
