const SHELL_CACHE = 'svysy-shell-v1';
const STATIC_CACHE = 'svysy-static-v1';
const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/favicon.svg', '/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('svysy-') && key !== SHELL_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname.includes('/api/');
}

function isHashedAsset(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  if (isHashedAsset(url) || url.pathname === '/favicon.svg' || url.pathname === '/logo.svg') {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
  }
});
