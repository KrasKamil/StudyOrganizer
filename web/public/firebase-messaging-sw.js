// Service Worker for StudyOrganizer AGH
// Features: Offline App Shell Caching (PWA) + FCM / Web Push Background Messaging
/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'study-organizer-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

// List of domains/paths to bypass caching (live APIs, Auth, Cloud Functions)
const BYPASS_URL_PATTERNS = [
  'apis.google.com',
  'googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'fcm.googleapis.com',
  'discord.com',
  'login.microsoftonline.com',
  'graph.microsoft.com',
  '/api/',
];

// 1. Install Event: Precache static core shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('PWA Precache failed for some assets:', err);
      });
    })
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if URL should bypass cache
function shouldBypassCache(url) {
  return BYPASS_URL_PATTERNS.some((pattern) => url.href.includes(pattern));
}

// 3. Fetch Event: Network-First for Navigation, Stale-While-Revalidate for Static Assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests and http/https schemes
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass third-party APIs and Auth
  if (shouldBypassCache(url)) {
    return;
  }

  // Strategy A: Navigation requests (HTML pages) -> Network First, Fallback to /index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(req);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Strategy B: Static assets (JS, CSS, images, fonts, icons) -> Stale-While-Revalidate
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico|json)$/) ||
      url.pathname.startsWith('/assets/'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy C: Default network with cache fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

// 4. Push Event: Handle incoming Web Push / FCM notifications in background
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      notification: {
        title: 'StudyOrganizer AGH',
        body: event.data.text(),
      },
    };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || 'StudyOrganizer: Nadchodzące zajęcia';
  const options = {
    body: notification.body || data.body || 'Sprawdź szczegóły w planie zajęć.',
    icon: notification.icon || '/pwa-192x192.png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || data.link || '/',
      actionUrl: data.actionUrl || null,
      type: data.type || 'class_alert',
    },
    actions: [],
  };

  // Add contextual action buttons if available
  if (data.actionLabel && data.actionUrl) {
    options.actions.push({
      action: 'primary_action',
      title: data.actionLabel,
    });
  }

  options.actions.push({
    action: 'open_plan',
    title: 'Otwórz plan',
  });

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click: Open or focus application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/today';

  if (event.action === 'primary_action' && data.actionUrl) {
    targetUrl = data.actionUrl;
  } else if (data.url) {
    targetUrl = data.url;
  }

  // Focus existing open window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If external URL (like Google Maps or Teams), open new window directly
      if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        if (!targetUrl.includes(self.location.host)) {
          return self.clients.openWindow(targetUrl);
        }
      }

      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
