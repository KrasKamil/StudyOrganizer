// Service Worker for Push Notifications (PWA & FCM Background Messaging)
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push / FCM notifications in background
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
    icon: notification.icon || '/favicon.svg',
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

// Handle clicks on the notification or its action buttons
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
