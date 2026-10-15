// Service for location tracking, commute calculation, and intelligent "Time-to-Leave" notification planning
import {
  parseAghLocation,
  isSessionOnline,
  isUserAtCampus,
  isUserAtBuilding,
  calculateDistanceMeters,
  AGH_CAMPUS_CENTER,
  AGH_BUILDING_DETAILS,
} from '../utils/aghCampus';

export const COMMUTE_STORAGE_KEY = 'study_commute_settings';
export const LAST_LOCATION_KEY = 'study_last_known_location';

export const DEFAULT_COMMUTE_SETTINGS = {
  // Typical commute duration from Mogilska 23 to AGH (~25 minutes MPK)
  defaultCommuteMinutes: 25,
  // Walking & elevator buffer: 5 min campus/room + 2 min 5. piętro
  bufferMinutes: 7,
  // How many minutes in advance of departure to send the "Time to leave" alert
  notifyBeforeMinutes: 10,
  // Preferred mode of travel: 'transit' (MPK Kraków), 'driving', 'bicycling', 'walking'
  transportMode: 'transit',
  // Home anchor fallback if GPS is inactive or restricted
  homeAddress: 'ul. Mogilska 23, Kraków (5. piętro)',
  homeCoords: { lat: 50.0665, lng: 19.9660 },
  // Enable context-aware location checks
  locationAware: true,
};

/**
 * Loads commute & travel settings from localStorage
 */
export function getCommuteSettings() {
  try {
    const raw = localStorage.getItem(COMMUTE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_COMMUTE_SETTINGS };
    return { ...DEFAULT_COMMUTE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_COMMUTE_SETTINGS };
  }
}

/**
 * Saves commute settings to localStorage
 */
export function saveCommuteSettings(newSettings) {
  try {
    const current = getCommuteSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(COMMUTE_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Failed to save commute settings:', err);
    return newSettings;
  }
}

/**
 * Retrieves the last cached user location from localStorage
 */
export function getLastKnownLocation() {
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY) || localStorage.getItem('transit_last_known_gps');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Saves the latest GPS coordinates into cache with timestamp
 */
export function saveLastKnownLocation(coords) {
  if (!coords || coords.lat == null || coords.lng == null) return;
  try {
    const payload = {
      lat: coords.lat,
      lng: coords.lng,
      accuracy: coords.accuracy || null,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(payload));
    localStorage.setItem('transit_last_known_gps', JSON.stringify(coords));
  } catch {}
}

/**
 * Gets real-time browser GPS coordinates (Promise wrapper)
 */
export async function getCurrentCoordinates(options = { timeout: 8000, enableHighAccuracy: true }) {
  if (!navigator?.geolocation) {
    throw new Error('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        saveLastKnownLocation(coords);
        resolve(coords);
      },
      (err) => reject(err),
      options
    );
  });
}

/**
 * Smart travel time estimator for Kraków
 * Combines straight-line distance, road winding factor, peak-hour traffic multipliers,
 * and user baseline defaults.
 */
export function estimateCommuteTimeMinutes(originCoords, destCoords, mode = 'transit', fallbackMinutes = 40) {
  // If no coordinates available, return user's configured default baseline
  if (!originCoords?.lat || !originCoords?.lng || !destCoords?.lat || !destCoords?.lng) {
    return fallbackMinutes;
  }

  const distanceMeters = calculateDistanceMeters(
    originCoords.lat,
    originCoords.lng,
    destCoords.lat,
    destCoords.lng
  );

  if (distanceMeters == null) return fallbackMinutes;

  // If already at destination (< 350 meters)
  if (distanceMeters <= 350) {
    return Math.max(3, Math.round(distanceMeters / 70)); // walking inside campus
  }

  // Winding factor: Kraków streets / transit network winding factor vs straight line ~ 1.35
  const roadDistanceKm = (distanceMeters * 1.35) / 1000;

  // Check Kraków rush hours (7:30 - 9:00 and 15:30 - 17:30)
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isRushHour =
    (currentHour >= 7.5 && currentHour <= 9.0) ||
    (currentHour >= 15.5 && currentHour <= 17.5);

  let speedKmH = 19; // Kraków MPK Tram/Bus average commercial speed
  let initialWaitMinutes = 6; // average headway & transfer wait

  switch (mode) {
    case 'driving':
      speedKmH = isRushHour ? 18 : 32;
      initialWaitMinutes = 3; // parking & walk
      break;
    case 'bicycling':
      speedKmH = 16;
      initialWaitMinutes = 2;
      break;
    case 'walking':
      speedKmH = 4.8;
      initialWaitMinutes = 0;
      break;
    case 'transit':
    default:
      speedKmH = isRushHour ? 15 : 20;
      initialWaitMinutes = isRushHour ? 8 : 6;
      break;
  }

  const travelMinutes = Math.round((roadDistanceKm / speedKmH) * 60 + initialWaitMinutes);

  // Smooth with user's baseline if distance is consistent with a standard commute
  if (fallbackMinutes && travelMinutes > 15) {
    // Weighted combination: 60% calculated estimate + 40% personal baseline
    return Math.round(travelMinutes * 0.65 + fallbackMinutes * 0.35);
  }

  return Math.max(5, travelMinutes);
}

/**
 * Evaluates a single class session and determines when and what notification to issue.
 */
export function evaluateSessionNotification(session, currentCoords = null, settings = null) {
  if (!session) return null;

  const cfg = settings || getCommuteSettings();
  const userLoc = currentCoords || getLastKnownLocation() || cfg.homeCoords;

  const aghLoc = parseAghLocation(session.location, session.description, session.title);
  const isOnline = isSessionOnline(session, aghLoc);

  const startTime = session.start?.toDate
    ? session.start.toDate()
    : new Date(session.start);

  if (isNaN(startTime.getTime())) return null;

  const now = new Date();
  const minutesUntilClass = Math.round((startTime.getTime() - now.getTime()) / (60 * 1000));

  // If class is already finished, skip
  if (minutesUntilClass < -30) return null;

  // ── 1. ONLINE SESSIONS (Teams / UPeL / Zoom) ──
  if (isOnline) {
    const notifyBefore = 10; // 10 minutes prior to online lecture
    const targetNotifyTime = new Date(startTime.getTime() - notifyBefore * 60 * 1000);
    const shouldNotifyNow =
      minutesUntilClass <= notifyBefore && minutesUntilClass > -10;

    return {
      type: 'online',
      isOnline: true,
      isAtCampus: false,
      session,
      aghLoc,
      startTime,
      minutesUntilClass,
      commuteMinutes: 0,
      targetNotifyTime,
      shouldNotifyNow,
      title: `Za ${minutesUntilClass > 0 ? minutesUntilClass : 0} min: ${session.title}`,
      body: `Zajęcia zdalne na Teams / UPeL. Kliknij, aby dołączyć do spotkania.`,
      actionUrl: session.teamsLink || '/today',
      actionLabel: 'Dołącz do Teams',
      badge: 'Zdalnie',
    };
  }

  // ── 2. ONSITE SESSIONS (AGH Campus) ──
  const buildingCode = aghLoc?.building;
  const buildingDetails = aghLoc?.buildingDetails || (buildingCode ? AGH_BUILDING_DETAILS[buildingCode] : null);
  const destCoords = buildingDetails?.coords || AGH_CAMPUS_CENTER;

  // Check if user is already on campus
  const isAtCampus = userLoc?.lat != null && userLoc?.lng != null
    ? isUserAtCampus(userLoc.lat, userLoc.lng)
    : false;

  const isAtSpecificBuilding = userLoc?.lat != null && userLoc?.lng != null && buildingCode
    ? isUserAtBuilding(userLoc.lat, userLoc.lng, buildingCode)
    : false;

  // Case 2A: Student is already at AGH Campus
  if (isAtCampus || isAtSpecificBuilding) {
    const notifyBefore = 15; // 15 minutes prior for room change / alert
    const targetNotifyTime = new Date(startTime.getTime() - notifyBefore * 60 * 1000);
    const shouldNotifyNow =
      minutesUntilClass <= notifyBefore && minutesUntilClass > -10;

    const roomText = aghLoc?.room ? `sala ${aghLoc.room}` : 'sprawdź salę';
    const buildingText = buildingCode ? `bud. ${buildingCode}` : 'Kampus AGH';

    return {
      type: 'onsite_at_campus',
      isOnline: false,
      isAtCampus: true,
      session,
      aghLoc,
      startTime,
      minutesUntilClass,
      commuteMinutes: 0,
      targetNotifyTime,
      shouldNotifyNow,
      title: `Za ${minutesUntilClass > 0 ? minutesUntilClass : 0} min: ${session.title}`,
      body: `Jesteś na kampusie. Zajęcia w: ${buildingText}, ${roomText}.`,
      actionUrl: aghLoc?.navigateUrl || '/today',
      actionLabel: 'Pokaż szczegóły',
      badge: 'Na miejscu',
    };
  }

  // Case 2B: Student is NOT on campus (Time-to-Leave calculation)
  const commuteMinutes = estimateCommuteTimeMinutes(
    userLoc,
    destCoords,
    cfg.transportMode,
    cfg.defaultCommuteMinutes || 40
  );

  const totalPrepAndTravelMinutes = commuteMinutes + (cfg.bufferMinutes || 5);
  // Departure timestamp
  const leaveTime = new Date(startTime.getTime() - totalPrepAndTravelMinutes * 60 * 1000);
  // Notification trigger timestamp (e.g. 10 minutes prior to departure)
  const targetNotifyTime = new Date(
    leaveTime.getTime() - (cfg.notifyBeforeMinutes || 10) * 60 * 1000
  );

  const minutesUntilDeparture = Math.round((leaveTime.getTime() - now.getTime()) / (60 * 1000));
  const shouldNotifyNow =
    minutesUntilDeparture <= (cfg.notifyBeforeMinutes || 10) &&
    minutesUntilDeparture > -15;

  const formatTime = (d) =>
    d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  const buildingDisplay = buildingCode ? `Bud. ${buildingCode}` : 'AGH';
  const roomDisplay = aghLoc?.room ? `, s. ${aghLoc.room}` : '';

  let title = '';
  let body = '';

  if (minutesUntilDeparture > 0) {
    title = `Czas wyjść na zajęcia za ${minutesUntilDeparture} min! (${formatTime(leaveTime)})`;
    body = `${session.title} o ${formatTime(startTime)} (${buildingDisplay}${roomDisplay}). Dojazd zajmie dziś ok. ${commuteMinutes} min.`;
  } else if (minutesUntilDeparture >= -5) {
    title = `Wychodź teraz! Czas na zajęcia (${buildingDisplay})`;
    body = `${session.title} zaczyna się o ${formatTime(startTime)}. Dojazd: ok. ${commuteMinutes} min.`;
  } else {
    title = `Uwaga: zajęcia za ${minutesUntilClass} min! (${buildingDisplay})`;
    body = `Czas dojazdu szacowany na ${commuteMinutes} min. Pośpiesz się!`;
  }

  return {
    type: 'time_to_leave',
    isOnline: false,
    isAtCampus: false,
    session,
    aghLoc,
    startTime,
    minutesUntilClass,
    commuteMinutes,
    leaveTime,
    targetNotifyTime,
    minutesUntilDeparture,
    shouldNotifyNow,
    title,
    body,
    actionUrl: aghLoc?.navigateUrl || '/today',
    actionLabel: 'Wskazówki dojazdu (Mapy)',
    badge: `Dojazd ~${commuteMinutes}m`,
  };
}
