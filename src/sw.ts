/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

// La app abre sin internet (en altamar)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

// Fotos de la ropa: una vez vistas quedan guardadas
registerRoute(({ url }) => url.pathname.startsWith('/api/img/'), new CacheFirst({
  cacheName: 'fotos',
  plugins: [new ExpirationPlugin({ maxEntries: 1500 })],
}));

// Modelo para quitar el fondo de las fotos (se descarga una sola vez)
registerRoute(({ url }) => url.hostname.endsWith('staticimgly.com'), new CacheFirst({ cacheName: 'modelo-fondo' }));

// Clima
registerRoute(({ url }) => url.hostname.endsWith('open-meteo.com'), new NetworkFirst({ cacheName: 'clima', networkTimeoutSeconds: 5 }));

self.addEventListener('push', (event) => {
  let data: any = {};
  try { data = event.data?.json() ?? {}; } catch { data = { title: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Mi Crucero', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await (c as WindowClient).navigate(url).catch(() => {}); return (c as WindowClient).focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
