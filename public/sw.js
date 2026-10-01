// Deliberately minimal: network-first for everything, so a deploy is never masked by stale code.
// The only thing cached is the last successful page navigation, served when the network is unreachable.
const CACHE = 'daymark-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put('shell', copy)); }
        return response;
      })
      .catch(() => caches.match('shell').then((cached) => cached ?? Response.error())),
  );
});
