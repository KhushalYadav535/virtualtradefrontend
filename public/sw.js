const CACHE_NAME = 'vtrade-v2';
const OFFLINE_URL = '/offline.html';

const offlineFallback = () =>
  new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });

async function matchOrOffline(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const offline = await caches.match(OFFLINE_URL);
  return offline || offlineFallback();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) return;
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => matchOrOffline(event.request))
    );
    return;
  }

  if (url.pathname.startsWith('/_next')) return;

  event.respondWith(
    fetch(event.request).catch(() => matchOrOffline(event.request))
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'Notification from VirtualTrade',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'default',
      data: data.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: false,
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'VirtualTrade', options)
    );
  } catch (err) {
    console.error('Push notification error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});