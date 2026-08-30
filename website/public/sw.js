// Bumped from v2: the previous version served every cached asset unconditionally and
// forever, so any visitor who had loaded /chat kept receiving that deployment's
// styles.css and script.js on the landing page — old CSS against new HTML. The
// activate handler below deletes older cache names, which unsticks those clients.
const CACHE_NAME = 'lexino-assets-v3';

// All of these are unhashed filenames, so their contents change between deployments.
// They are cached only as an offline fallback, never served ahead of the network.
const ASSETS_TO_CACHE = [
  '/style.css',
  '/api.js',
  '/script.js',
  '/lexino-logo.png',
  '/lexino-website/styles.css',
  '/lexino-website/script.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for same-origin assets we actually track.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!ASSETS_TO_CACHE.includes(url.pathname)) return;

  // Network-first: the HTTP layer already sends these with must-revalidate, so a
  // fresh check is usually a cheap 304. The cache is the offline fallback only,
  // which keeps the assets in step with the HTML that references them.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
