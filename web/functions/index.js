/**
 * Firebase Cloud Functions: Background Scheduled Push Notifications for StudyOrganizer
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Coordinates for AGH Main Campus
const AGH_CAMPUS = { lat: 50.0665, lng: 19.916, radiusMeters: 650 };

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Runs every 5 minutes to inspect upcoming classes and dispatch Time-to-Leave / room push alerts.
 */
exports.checkUpcomingClasses = onSchedule('every 5 minutes', async () => {
  const now = new Date();
  console.log(`[checkUpcomingClasses] Running at ${now.toISOString()}`);

  try {
    // 1. Fetch all users who have registered mobile devices
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const devicesSnap = await db.collection(`users/${uid}/devices`).where('enabled', '==', true).get();

      if (devicesSnap.empty) continue;

      const fcmTokens = devicesSnap.docs
        .map((d) => d.data().fcmToken)
        .filter(Boolean);

      if (fcmTokens.length === 0) continue;

      // 2. Query user sessions happening between now and now + 2 hours
      const windowEnd = new Date(now.getTime() + 120 * 60 * 1000);
      const sessionsSnap = await db
        .collection('sessions')
        .where('uid', '==', uid)
        .get();

      if (sessionsSnap.empty) continue;

      // 3. User location & commute preferences
      const userLocation = userDoc.data()?.lastLocation || null;
      const userSettings = userDoc.data()?.commuteSettings || {
        defaultCommuteMinutes: 40,
        bufferMinutes: 5,
        notifyBeforeMinutes: 10,
        transportMode: 'transit',
      };

      const isOnCampus = userLocation
        ? (calculateDistanceMeters(userLocation.lat, userLocation.lng, AGH_CAMPUS.lat, AGH_CAMPUS.lng) || 9999) <= AGH_CAMPUS.radiusMeters
        : false;

      for (const sDoc of sessionsSnap.docs) {
        const session = sDoc.data();
        if (!session.start || session.isHidden) continue;

        const startTime = session.start.toDate ? session.start.toDate() : new Date(session.start);
        const diffMinutes = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

        // Skip past classes or classes > 120 min away
        if (diffMinutes < -10 || diffMinutes > 120) continue;

        const isOnline = session.mode === 'online' ||
          /\b(zdalnie|online|teams|zoom)\b/i.test(`${session.title} ${session.location || ''}`);

        let shouldSend = false;
        let notifType = '';
        let title = '';
        let body = '';
        let actionUrl = '/today';

        if (isOnline) {
          // Online: notify ~10 minutes prior
          if (diffMinutes <= 10 && diffMinutes > 5) {
            shouldSend = true;
            notifType = 'online_10m';
            title = `Za 10 min: ${session.title} (Zdalnie)`;
            body = 'Zajęcia online. Kliknij, aby dołączyć do spotkania na Teams.';
            actionUrl = session.teamsLink || '/today';
          }
        } else if (isOnCampus) {
          // On-site & Already on AGH Campus: notify 15 min prior about classroom
          if (diffMinutes <= 15 && diffMinutes > 10) {
            shouldSend = true;
            notifType = 'campus_room_15m';
            title = `Za 15 min: ${session.title}`;
            body = `Zajęcia w sali ${session.location || 'sprawdź salę'}. Jesteś już na kampusie.`;
            actionUrl = '/today';
          }
        } else {
          // On-site & NOT on campus: Time-to-leave calculation
          const commuteTime = userSettings.defaultCommuteMinutes || 40;
          const totalPrep = commuteTime + (userSettings.bufferMinutes || 5);
          const minutesUntilLeave = diffMinutes - totalPrep;

          // Notify 10 minutes prior to departure time
          const notifyHeadway = userSettings.notifyBeforeMinutes || 10;
          if (minutesUntilLeave <= notifyHeadway && minutesUntilLeave > notifyHeadway - 5) {
            shouldSend = true;
            notifType = 'time_to_leave';
            const leaveClock = new Date(now.getTime() + minutesUntilLeave * 60 * 1000);
            const timeStr = leaveClock.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
            title = `Czas wyjść na zajęcia za ${minutesUntilLeave} min! (${timeStr})`;
            body = `${session.title} (${session.location || 'Kampus AGH'}). Dojazd zajmie dziś ok. ${commuteTime} min.`;
            actionUrl = '/today';
          }
        }

        if (shouldSend) {
          // Idempotency check: ensure this alert is not sent twice
          const alertId = `push_${sDoc.id}_${notifType}_${startTime.getTime()}`;
          const alertRef = db.doc(`users/${uid}/sent_notifications/${alertId}`);
          const alertDoc = await alertRef.get();

          if (!alertDoc.exists) {
            console.log(`[checkUpcomingClasses] Sending push to ${uid}: ${title}`);
            const response = await admin.messaging().sendEachForMulticast({
              tokens: fcmTokens,
              notification: { title, body },
              data: {
                url: actionUrl,
                type: notifType,
                sessionId: sDoc.id,
              },
            });

            // Clean up invalid or stale tokens
            response.responses.forEach((resp, idx) => {
              if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                const staleToken = fcmTokens[idx];
                const safeTokenId = staleToken.slice(-24).replace(/[^a-zA-Z0-9]/g, '_');
                db.doc(`users/${uid}/devices/${safeTokenId}`).delete().catch(() => {});
              }
            });

            await alertRef.set({ sentAt: admin.firestore.FieldValue.serverTimestamp(), title, body });
          }
        }
      }
    }
  } catch (error) {
    console.error('[checkUpcomingClasses] Error processing notifications:', error);
  }
});
