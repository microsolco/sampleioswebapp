'use strict';
const VERSION = 'v1';
const CACHE = 'pwa-lab-' + VERSION;
const META = 'pwa-lab-meta';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // iOS 27 / Safari 27: Service Worker Static Routing API
    let routing = 'non supportato';
    if (typeof event.addRoutes === 'function') {
      try {
        await event.addRoutes({
          condition: { urlPattern: { pathname: '*/__solo-rete__/*' } },
          source: 'network'
        });
        routing = 'registrata (addRoutes OK)';
      } catch (e) {
        routing = 'errore: ' + (e && e.message);
      }
    }
    const meta = await caches.open(META);
    await meta.put('routing', new Response(routing));
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== CACHE && k !== META) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(network); // aggiorna in background
      return cached;
    }
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'status' && event.ports && event.ports[0]) {
    event.waitUntil((async () => {
      const meta = await caches.open(META);
      const r = await meta.match('routing');
      event.ports[0].postMessage({
        version: VERSION,
        routing: r ? await r.text() : 'sconosciuto',
        hasAddRoutes: 'InstallEvent' in self && 'addRoutes' in InstallEvent.prototype
      });
    })());
  }
  if (data.type === 'notify') {
    event.waitUntil(self.registration.showNotification(data.title || 'PWA Lab', {
      body: data.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag || 'pwa-lab',
      data: { url: './' }
    }));
  }
});

self.addEventListener('push', (event) => {
  let payload = { title: 'PWA Lab', body: 'Nuovo messaggio push' };
  try { if (event.data) payload = Object.assign(payload, event.data.json()); }
  catch (_) { if (event.data) payload.body = event.data.text(); }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: payload.url || './' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) return c.focus();
    }
    return self.clients.openWindow(target);
  })());
});
