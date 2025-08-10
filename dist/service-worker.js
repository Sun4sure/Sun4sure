const CACHE_NAME = "sun4sure-cache-v2";

// Install: cache all build files dynamically
self.addEventListener("install", event => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return fetch("/manifest.json")
        .then(response => response.json())
        .then(manifest => {
          const urlsToCache = [
            "/",
            "/index.html",
            "/manifest.json",
            "/icons/icon-192x192.png",
            "/icons/icon-512x512.png"
          ];
          // Automatically cache all build files from manifest (if present)
          if (manifest && manifest.files) {
            urlsToCache.push(...Object.values(manifest.files));
          }
          return cache.addAll(urlsToCache);
        })
        .catch(() => {
          // If manifest not found, just cache the core files
          return cache.addAll([
            "/",
            "/index.html",
            "/manifest.json",
            "/icons/icon-192x192.png",
            "/icons/icon-512x512.png"
          ]);
        });
    })
  );
});

// Activate: clean old caches
self.addEventListener("activate", event => {
  clients.claim();
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
});

// Fetch: cache-first strategy, fallback to network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        })
      );
    })
  );
});

