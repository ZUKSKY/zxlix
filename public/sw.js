const CACHE = 'zxlix-static-v1';
const PRECACHE = ['/', '/search', '/bookmarks', '/discover/trending', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/_next/') || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|js)$/)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    })));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ZXLIX_BADGE') {
    const count = Number(event.data.count || 0);
    if ('setAppBadge' in navigator) navigator.setAppBadge(count).catch(() => {});
    if (!count && 'clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
  }
});
