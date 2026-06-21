/* Mesa — service worker. Caches all assets so the game works fully offline. */
const CACHE = 'mesa-v2';

/* Same-origin assets that make up the app shell. */
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* Pre-cache the shell on install. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

/* Drop old caches on activate. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Cache-first, with runtime caching for everything else (e.g. Google Fonts).
   This makes the app fully offline after the first online load. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache successful basic/cors responses (and opaque font responses).
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback: serve the app shell for navigations.
          if (req.mode === 'navigate') return caches.match('./index.html');
        });
    })
  );
});
