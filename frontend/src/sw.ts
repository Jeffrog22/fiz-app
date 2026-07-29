/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache' }),
);

registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'document',
  new CacheFirst({ cacheName: 'static-assets' }),
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'images' }),
);

self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; icon?: string; data?: { url?: string } } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Fiz! App', body: 'Hora de registrar a chamada!' };
  }

  const options: NotificationOptions = {
    body: data.body || 'Hora de registrar a chamada!',
    icon: data.icon || '/icons/iconFiz!.png',
    badge: '/icons/iconFiz!.png',
    data: { url: data.data?.url || '/chamadas' },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Fiz! App', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as any)?.url || '/chamadas';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      const existing = windowClients.find((c: any) => c.url.includes(url));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow(url);
      }
    }),
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});