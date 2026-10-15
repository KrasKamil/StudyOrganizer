// Global Notification & Commute Manager component
// Runs in background of the React app, performs location checks and triggers timely alerts
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  registerServiceWorker,
  showDeviceNotification,
  wasNotificationSent,
  markNotificationAsSent,
  setupForegroundMessageListener,
  PUSH_STORAGE_KEY,
} from '../services/notificationService';
import {
  evaluateSessionNotification,
  getCurrentCoordinates,
  getLastKnownLocation,
  getCommuteSettings,
} from '../services/commuteService';

export default function NotificationManager() {
  const { user } = useAuth();
  const { sessions } = useData();
  const lastLocationCheckRef = useRef(0);
  const activeCoordsRef = useRef(getLastKnownLocation());

  // 1. Initial service worker & foreground listener setup
  useEffect(() => {
    if (!isNotificationSupported()) return;

    registerServiceWorker();
    const unsub = setupForegroundMessageListener((payload) => {
      console.log('Received foreground FCM message:', payload);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. Periodically check upcoming classes and send "Time-to-Leave" or room alerts
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;

    const checkUpcomingClasses = async () => {
      const permission = getNotificationPermission();
      const isEnabled = localStorage.getItem(PUSH_STORAGE_KEY) === 'true';

      if (permission !== 'granted' || !isEnabled) {
        return;
      }

      const settings = getCommuteSettings();
      const now = Date.now();

      // Refresh GPS coordinates gently (at most once every 10 minutes)
      if (settings.locationAware && now - lastLocationCheckRef.current > 10 * 60 * 1000) {
        lastLocationCheckRef.current = now;
        try {
          const freshCoords = await getCurrentCoordinates({
            timeout: 6000,
            enableHighAccuracy: false,
          });
          activeCoordsRef.current = freshCoords;
        } catch {
          // If GPS fails/denied, fallback to last known or home coords smoothly
        }
      }

      const userCoords = activeCoordsRef.current || settings.homeCoords;

      // Filter sessions happening within the next 2.5 hours
      const upcoming = sessions.filter((s) => {
        const start = s.start?.toDate ? s.start.toDate() : new Date(s.start);
        const diffMinutes = (start.getTime() - now) / (60 * 1000);
        return diffMinutes > -10 && diffMinutes <= 150;
      });

      for (const session of upcoming) {
        const evalResult = evaluateSessionNotification(session, userCoords, settings);
        if (!evalResult) continue;

        const startTimestamp = evalResult.startTime.getTime();
        const notificationKey = `notif_${session.id || session.title}_${evalResult.type}_${startTimestamp}`;

        if (evalResult.shouldNotifyNow && !wasNotificationSent(notificationKey)) {
          console.log(`[NotificationManager] Dispatching alert: ${evalResult.title}`);
          const sent = await showDeviceNotification(evalResult.title, {
            body: evalResult.body,
            tag: notificationKey,
            data: {
              url: evalResult.actionUrl,
              actionUrl: evalResult.actionUrl,
              actionLabel: evalResult.actionLabel,
              type: evalResult.type,
            },
          });

          if (sent) {
            markNotificationAsSent(notificationKey);
          }
        }
      }
    };

    // Run immediately on load / sessions change
    checkUpcomingClasses();

    // Re-check every 60 seconds
    const interval = setInterval(checkUpcomingClasses, 60 * 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Headless background provider, renders nothing directly
  return null;
}
