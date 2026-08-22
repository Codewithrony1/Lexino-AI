const CACHE_NAME = 'lexino-assets-v2';
const ASSETS_TO_CACHE = [
  '/style.css',
  '/api.js',
  '/script.js',
  '/lexino-logo.png',
  '/lexino-website/styles.css',
  '/lexino-website/script.js',
  '/lexino-website/Image22.png'
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
  // Only cache GET requests for local assets
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache new static assets dynamically
        if (response.status === 200 && ASSETS_TO_CACHE.includes(url.pathname)) {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback
      return caches.match('/public/index.html');
    })
  );
});
