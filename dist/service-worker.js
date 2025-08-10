const REPO_BASE_PATH = '/Sun4sure';
const CACHE_NAME = 'sun4sure-cache-v2';

// Install: cache all build files dynamically
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(`${REPO_BASE_PATH}/manifest.json`)
        .then(response => response.json())
        .then(manifest => {
          const urlsToCache = [
            `${REPO_BASE_PATH}/`,
            `${REPO_BASE_PATH}/index.html`,
            `${REPO_BASE_PATH}/manifest.json`,
            `${REPO_BASE_PATH}/icons/icon-192x192.png`,
            `${REPO_BASE_PATH}/icons/icon-512x512.png`,
          ];
          if (manifest && manifest.files) {
            // Adjust manifest file paths similarly or ensure they are relative
            const manifestFiles = Object.values(manifest.files).map(file => `${REPO_BASE_PATH}${file}`);
            urlsToCache.push(...manifestFiles);
          }
          return cache.addAll(urlsToCache);
        })
        .catch(() => {
          return cache.addAll([
            `${REPO_BASE_PATH}/`,
            `${REPO_BASE_PATH}/index.html`,
            `${REPO_BASE_PATH}/manifest.json`,
            `${REPO_BASE_PATH}/icons/icon-192x192.png`,
            `${REPO_BASE_PATH}/icons/icon-512x512.png`,
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

