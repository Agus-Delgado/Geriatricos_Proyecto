/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: any = null;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Hogares', body: event.data.text() };
  }

  const title = payload?.title ?? 'Hogares';
  const body = payload?.body ?? '';
  const url = payload?.url ?? '/activity';
  const tag = payload?.tag ?? 'activity';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      badge: '/pwa-192.png',
      icon: '/pwa-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification as any)?.data?.url || '/activity';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          const c = client as WindowClient;
          try {
            await c.navigate(url);
          } catch {
            // ignore
          }
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
