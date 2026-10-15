// Frontend Notification Service (PWA Web Push + Local Notifications)
import { getMessagingInstance, db } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const PUSH_STORAGE_KEY = 'study_notifications_enabled';
export const SENT_NOTIFICATIONS_KEY = 'study_sent_notifications_log';

/**
 * Checks whether Notification API & Service Workers are available in this browser
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Gets current browser notification permission ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Registers the background Service Worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Requests permission and subscribes device to FCM and local notifications
 */
export async function enableNotifications(uid = null) {
  if (!isNotificationSupported()) {
    throw new Error('Powiadomienia nie są wspierane na tym urządzeniu/przeglądarce.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    localStorage.setItem(PUSH_STORAGE_KEY, 'false');
    throw new Error('Nie wyrażono zgody na powiadomienia w przeglądarce.');
  }

  localStorage.setItem(PUSH_STORAGE_KEY, 'true');

  const swRegistration = await registerServiceWorker();

  // Attempt to acquire FCM token if VAPID key is configured
  let fcmToken = null;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  try {
    const messaging = await getMessagingInstance();
    if (messaging && swRegistration && vapidKey) {
      fcmToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (fcmToken && uid) {
        // Store device token in user profile
        const safeTokenId = fcmToken.slice(-24).replace(/[^a-zA-Z0-9]/g, '_');
        await setDoc(
          doc(db, 'users', uid, 'devices', safeTokenId),
          {
            fcmToken,
            userAgent: navigator.userAgent,
            platform: navigator.platform || 'mobile',
            updatedAt: serverTimestamp(),
            enabled: true,
          },
          { merge: true }
        );
      }
    }
  } catch (fcmErr) {
    // Graceful fallback: local notifications still work completely even without remote FCM
    console.info('FCM Token setup note (Local notifications remain active):', fcmErr.message);
  }

  return {
    permission,
    fcmToken,
    swRegistration,
  };
}

/**
 * Shows an immediate notification on the device (screen banner / notification tray)
 */
export async function showDeviceNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: options.tag || `study-notification-${Date.now()}`,
    renotify: true,
    ...options,
  };

  try {
    // Prefer service worker registration on mobile (required for Android & iOS PWA)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }

    // Fallback to classic desktop Notification constructor
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Could not display device notification:', err);
    return false;
  }
}

/**
 * Logs that a notification for a given session has been sent to prevent duplicates
 */
export function markNotificationAsSent(notificationKey) {
  try {
    const raw = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    const log = raw ? JSON.parse(raw) : {};
    log[notificationKey] = Date.now();

    // Clean entries older than 24h
    const now = Date.now();
    for (const k in log) {
      if (now - log[k] > 24 * 60 * 60 * 1000) {
        delete log[k];
      }
    }

    localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(log));
  } catch {}
}

/**
 * Checks whether this notification was already issued
 */
export function wasNotificationSent(notificationKey) {
  try {
    const raw = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
    if (!raw) return false;
    const log = JSON.parse(raw);
    return !!log[notificationKey];
  } catch {
    return false;
  }
}

/**
 * Listens for incoming FCM messages while app is in foreground
 */
export function setupForegroundMessageListener(onReceive) {
  let unsubscribe = null;
  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        if (onReceive) onReceive(payload);
        // Also show local system notification
        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        if (title) {
          showDeviceNotification(title, {
            body,
            data: payload.data,
          });
        }
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}
