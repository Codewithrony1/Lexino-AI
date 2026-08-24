// Bumping this name is what retires the previous cache: `activate` deletes every
// key that is not the current one. The old worker fetches this file on navigation,
// sees changed bytes, and installs - so clients running the previous cache-first
// version self-heal without any user action.
const CACHE_NAME = 'lexino-assets-v2';

// Mutable, unversioned application code. These filenames never change between
// deployments, so a cached copy cannot be distinguished from a fresh one by URL.
// They are served network-first for exactly that reason.
const APP_SHELL = [
  '/style.css',
  '/api.js',
  '/script.js',
  '/lexino-website/styles.css',
  '/lexino-website/script.js'
];

const IMMUTABLE_PREFIXES = ['/_next/static/'];

function isImmutable(pathname) {
  // Only content-hashed URLs qualify. The images, video and audio under
  // /lexino-website/ keep their filenames across deployments, so caching them
  // under a service-worker key we control would mean a replaced asset could only
  // be evicted by bumping CACHE_NAME. They are left to the HTTP layer, which
  // already applies a long-lived policy to them via next.config.mjs.
  return IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Individual failures must not abort the whole install, which would leave
      // the previous worker in control.
      .then((cache) => Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never store responses that are scoped to a signed-in user. A shared cache
  // entry here would let one account read another's data.
  if (url.pathname.startsWith('/api/')) return;
  if (request.headers.has('authorization')) return;
  if (request.credentials === 'include') return;

  // Navigations stay on the network so a new deployment's HTML is always used.
  if (request.mode === 'navigate') return;

  if (isImmutable(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  if (!APP_SHELL.includes(url.pathname)) return;

  // Network-first: the freshest code wins whenever the network answers, and the
  // cache is only a fallback for offline / failed requests.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
