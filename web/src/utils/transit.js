import { format, differenceInMinutes, isBefore, isAfter } from 'date-fns';
import { AGH_BUILDING_DETAILS } from './aghCampus.js';

// ── PRESET LOCATIONS ──────────────────────────────────────────────────────────
export const MOGILSKA_HOME = {
  id: 'home',
  name: 'Dom: ul. Mogilska 23, Kraków (5. piętro)',
  shortName: '🏠 Dom (Mogilska 23)',
  address: 'ul. Mogilska 23, Kraków',
  coords: { lat: 50.0665, lng: 19.9660 },
  floorBufferMinutes: 2, // 5. piętro: ~2 minuty na windę / klatkę schodową
  icon: '🏠',
  desc: 'Mogilska 23 (+2 min na 5. piętro)',
};

export const PRESET_ORIGINS = {
  home: MOGILSKA_HOME,
  girlfriend: {
    id: 'girlfriend',
    name: 'U dziewczyny: ul. Głowackiego (Bronowice)',
    shortName: '❤️ U dziewczyny (Głowackiego)',
    address: 'Przystanek Głowackiego, Kraków',
    transitStop: 'Głowackiego',
    coords: { lat: 50.0768, lng: 19.9015 }, // Przystanek tramwajowy MPK Głowackiego
    defaultCommuteMinutes: 20, // tramwaj do Biprostalu + przesiadka w autobus na Chopina/Czarnowiejską
    floorBufferMinutes: 0,
    icon: '❤️',
    desc: 'Start: Przystanek Głowackiego → Biprostal → Chopina / Czarnowiejska (~18-22 min)',
  },
  gps: {
    id: 'gps',
    name: 'Moja lokalizacja GPS',
    shortName: '📍 Pozycja GPS',
    address: 'Aktualna pozycja w przeglądarce',
    coords: null,
    icon: '📍',
    desc: 'Wykrywana automatycznie przez GPS / sieć',
  },
  miasteczko: {
    id: 'miasteczko',
    name: 'Miasteczko Studenckie AGH',
    shortName: '🏢 Miasteczko AGH',
    address: 'ul. Józefa Rostafińskiego 7, Kraków',
    coords: { lat: 50.0684, lng: 19.9075 },
    icon: '🏢',
    desc: 'Akademiki AGH (Rostafińskiego / Reymonta)',
  },
};

// Default AGH central coordinates if building has no exact point
export const AGH_CAMPUS_CENTER = {
  lat: 50.0647,
  lng: 19.9234,
  name: 'Główny Kampus AGH (al. Mickiewicza 30)',
};

// ── HAVERSINE DISTANCE (KM) ──────────────────────────────────────────────────
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.round(dist * 10) / 10;
}

// ── ESTIMATE TRAVEL DURATION (MINUTES) ───────────────────────────────────────
export function estimateTravelMinutes(distanceKm, mode = 'transit') {
  if (distanceKm == null) return null;

  // 1. Walking: average speed 4.8 km/h + 2 min street crossings buffer
  const walkMinutes = Math.max(3, Math.round((distanceKm / 4.8) * 60 + 2));

  // 2. Cycling / Scooter: average speed 15 km/h + 2 min unlock/lock buffer
  const bikeMinutes = Math.max(3, Math.round((distanceKm / 15) * 60 + 2));

  // 3. Public Transit (MPK Kraków: tram / bus):
  // If under 0.8 km, walking is faster and recommended directly
  let transitMinutes;
  if (distanceKm < 0.8) {
    transitMinutes = walkMinutes;
  } else {
    // ~5 min average wait + walk to stop, average city bus/tram speed ~16 km/h
    transitMinutes = Math.max(8, Math.round(5 + (distanceKm / 16) * 60));
  }

  // 4. Car / Taxi: ~22 km/h city average + 3 min parking
  const carMinutes = Math.max(5, Math.round(3 + (distanceKm / 22) * 60));

  return {
    walk: walkMinutes,
    bike: bikeMinutes,
    transit: transitMinutes,
    car: carMinutes,
    recommended: distanceKm < 1.0 ? 'walk' : 'transit',
  };
}

// ── CALCULATE WHEN TO LEAVE ("KIEDY WYJŚĆ BY ZDĄŻYĆ") ────────────────────────
export function calculateDeparturePlan({
  sessionStart,
  travelMinutes = 15,
  bufferMinutes = 5,
  extraMinutes = 0,
  now = new Date(),
}) {
  if (!sessionStart) return null;

  const startDate = sessionStart?.toDate?.() || new Date(sessionStart);
  if (isNaN(startDate.getTime())) return null;

  // Safe travel duration and hall/room finding buffer + floor buffer
  const safeTravel = Math.max(3, travelMinutes || 15);
  const safeBuffer = Math.max(0, bufferMinutes ?? 5);
  const safeExtra = Math.max(0, extraMinutes || 0);
  const totalLeadTimeMinutes = safeTravel + safeBuffer + safeExtra;

  // The latest moment to leave origin
  const departureDate = new Date(startDate.getTime() - totalLeadTimeMinutes * 60 * 1000);
  const arrivalDate = new Date(startDate.getTime() - safeBuffer * 60 * 1000);

  const minutesUntilDeparture = differenceInMinutes(departureDate, now);
  const minutesUntilSession = differenceInMinutes(startDate, now);

  let status = 'plenty';
  let statusText = '';
  let badgeColor = '';

  if (minutesUntilSession <= 0) {
    status = 'in_progress';
    statusText = 'Zajęcia już trwają';
    badgeColor = 'bg-red-950/70 text-red-300 border-red-700';
  } else if (minutesUntilDeparture < 0) {
    status = 'late';
    const lateBy = Math.abs(minutesUntilDeparture);
    statusText = `Spóźnienie o ${lateBy} min! Pośpiesz się`;
    badgeColor = 'bg-red-500/20 text-red-300 border-red-500/50';
  } else if (minutesUntilDeparture <= 5) {
    status = 'leave_now';
    statusText = minutesUntilDeparture === 0 ? 'CZAS WYJŚĆ TERAZ!' : `Wyjdź za ${minutesUntilDeparture} min!`;
    badgeColor = 'bg-amber-500/25 text-amber-300 border-amber-500/60 animate-pulse';
  } else if (minutesUntilDeparture <= 20) {
    status = 'soon';
    statusText = `Wyjdź za ${minutesUntilDeparture} min`;
    badgeColor = 'bg-amber-500/15 text-amber-200 border-amber-500/40';
  } else {
    status = 'plenty';
    const hours = Math.floor(minutesUntilDeparture / 60);
    const mins = minutesUntilDeparture % 60;
    statusText = hours > 0 ? `Wyjdź za ${hours}h ${mins}m` : `Wyjdź za ${mins} min`;
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  }

  return {
    startDate,
    departureDate,
    arrivalDate,
    departureTimeFormatted: format(departureDate, 'HH:mm'),
    targetArrivalTimeFormatted: format(arrivalDate, 'HH:mm'),
    sessionTimeFormatted: format(startDate, 'HH:mm'),
    totalLeadTimeMinutes,
    travelMinutes: safeTravel,
    bufferMinutes: safeBuffer,
    extraMinutes: safeExtra,
    minutesUntilDeparture,
    minutesUntilSession,
    status,
    statusText,
    badgeColor,
  };
}

// ── JAKDOJADE URL GENERATOR ─────────────────────────────────────────────────
export function buildJakdojadeUrl({
  session,
  destinationCoords,
  destinationName,
  transitStop,
  walkFromStopMinutes = 0,
  insideMinutes = 0,
  originCoords,
  originName,
  city = 'krakow',
  aghLoc = null,
}) {
  const start = session?.start?.toDate?.() || (session?.start ? new Date(session.start) : new Date());

  // 1. Resolve destination transit stop and walking/stairs buffer
  const stop = transitStop || aghLoc?.transitStop || destinationName || 'AGH / UR';
  const walkMinutes = walkFromStopMinutes || aghLoc?.walkFromStopMinutes || 2;
  const stairsMinutes = insideMinutes || aghLoc?.insideMinutes || 1;
  const totalLeadToSeat = walkMinutes + stairsMinutes;

  // 2. Adjust target arrival time AT THE STOP:
  // We want the MPK tram/bus to arrive at the stop early enough to allow walking to the building and climbing stairs!
  const targetStopArrivalDate = new Date(start.getTime() - totalLeadToSeat * 60 * 1000);
  const dateFormatted = format(targetStopArrivalDate, 'dd.MM.yy');
  const timeFormatted = format(targetStopArrivalDate, 'HH:mm');

  // 3. Destination coordinates
  const destCoords = destinationCoords || aghLoc?.coords || AGH_CAMPUS_CENTER;
  const destLat = destCoords?.lat || AGH_CAMPUS_CENTER.lat;
  const destLng = destCoords?.lng || AGH_CAMPUS_CENTER.lng;

  // 4. Origin point (fallback to stored transit preferences if not passed)
  let finalOriginCoords = originCoords;
  let finalOriginName = originName;
  if (!finalOriginCoords || !finalOriginName) {
    try {
      const prefs = getStoredTransitPreferences();
      if (prefs.originType === 'girlfriend' || prefs.originType === 'gps') {
        finalOriginCoords = prefs.lastGps;
        finalOriginName = 'Bieżąca lokalizacja';
      } else if (prefs.originType === 'miasteczko') {
        finalOriginCoords = PRESET_ORIGINS.miasteczko.coords;
        finalOriginName = PRESET_ORIGINS.miasteczko.address;
      } else if (prefs.originType === 'custom') {
        finalOriginCoords = prefs.customCoords || MOGILSKA_HOME.coords;
        finalOriginName = prefs.customAddress || MOGILSKA_HOME.address;
      } else {
        // Default: 'home' (Mogilska 23)
        finalOriginCoords = MOGILSKA_HOME.coords;
        finalOriginName = MOGILSKA_HOME.address;
      }
    } catch {
      // In non-browser environments
    }
  }

  let originParam = '';
  if (finalOriginCoords?.lat && finalOriginCoords?.lng) {
    originParam += `&fc=${finalOriginCoords.lat}:${finalOriginCoords.lng}`;
  }
  if (finalOriginName) {
    originParam += `&fn=${encodeURIComponent(finalOriginName)}`;
  }

  // Jakdojade official query parameters:
  // tc: destination coords (lat:lng)
  // tn: destination stop name (e.g. "Czarnowiejska", "AGH / UR", "Kawiory", "Miasteczko Studenckie AGH")
  // fc: origin coords
  // fn: origin name
  // d: dd.MM.yy
  // h: HH:mm (target arrival time at stop!)
  // ia: true (arrive by)
  // t: 0 (optimal route)
  return `https://jakdojade.pl/${city}/trasa?tc=${destLat}:${destLng}&tn=${encodeURIComponent(stop)}${originParam}&d=${dateFormatted}&h=${timeFormatted}&ia=true&t=0`;
}

// ── GOOGLE MAPS DIRECTIONS URL GENERATOR ────────────────────────────────────
export function buildGoogleMapsUrl({
  session,
  destinationCoords,
  destinationName,
  originCoords,
  travelMode = 'transit',
}) {
  const destCoordStr = destinationCoords
    ? `${destinationCoords.lat},${destinationCoords.lng}`
    : (destinationName ? encodeURIComponent(destinationName + ' AGH Kraków') : `${AGH_CAMPUS_CENTER.lat},${AGH_CAMPUS_CENTER.lng}`);

  let finalOriginCoords = originCoords;
  if (!finalOriginCoords) {
    try {
      const prefs = getStoredTransitPreferences();
      if (prefs.originType === 'girlfriend' || prefs.originType === 'gps') {
        finalOriginCoords = prefs.lastGps;
      } else if (prefs.originType === 'miasteczko') {
        finalOriginCoords = PRESET_ORIGINS.miasteczko.coords;
      } else if (prefs.originType === 'custom') {
        finalOriginCoords = prefs.customCoords || MOGILSKA_HOME.coords;
      } else {
        finalOriginCoords = MOGILSKA_HOME.coords;
      }
    } catch {
      // Non-browser fallback
    }
  }

  let originCoordStr = '';
  if (finalOriginCoords?.lat && finalOriginCoords?.lng) {
    originCoordStr = `&origin=${finalOriginCoords.lat},${finalOriginCoords.lng}`;
  }

  // Standard Google Maps Turn-by-Turn directions URL
  return `https://www.google.com/maps/dir/?api=1${originCoordStr}&destination=${destCoordStr}&travelmode=${travelMode}`;
}

// ── GEOLOCATION API HELPER (BROWSER GPS) ────────────────────────────────────
export function requestCurrentGpsPosition() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      reject(new Error('Geolokalizacja nie jest wspierana przez Twoją przeglądarkę.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: Date.now(),
        };
        try {
          localStorage.setItem('transit_last_known_gps', JSON.stringify(coords));
        } catch {
          // Ignore localStorage errors
        }
        resolve(coords);
      },
      (err) => {
        let errorMsg = 'Nie udało się pobrać lokalizacji GPS.';
        if (err.code === 1) errorMsg = 'Dostęp do lokalizacji został odrzucony.';
        if (err.code === 2) errorMsg = 'Pozycja jest niedostępna.';
        if (err.code === 3) errorMsg = 'Przekroczono limit czasu oczekiwania na GPS.';
        reject(new Error(errorMsg));
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}

// ── PREFERENCES STORAGE ─────────────────────────────────────────────────────
export function getStoredTransitPreferences() {
  if (typeof window === 'undefined') {
    return {
      originType: 'home',
      bufferMinutes: 5,
      preferredMode: 'transit',
      customAddress: MOGILSKA_HOME.address,
      customCoords: MOGILSKA_HOME.coords,
      lastGps: null,
    };
  }

  let customCoords = MOGILSKA_HOME.coords;
  try {
    const raw = localStorage.getItem('transit_custom_coords');
    if (raw) customCoords = JSON.parse(raw);
  } catch {
    customCoords = MOGILSKA_HOME.coords;
  }

  let lastGps = null;
  try {
    const raw = localStorage.getItem('transit_last_known_gps');
    if (raw) lastGps = JSON.parse(raw);
  } catch {
    lastGps = null;
  }

  return {
    originType: localStorage.getItem('transit_origin_type') || 'home',
    bufferMinutes: parseInt(localStorage.getItem('transit_buffer_minutes') || '5', 10),
    preferredMode: localStorage.getItem('transit_preferred_mode') || 'transit',
    customAddress: localStorage.getItem('transit_custom_address') || MOGILSKA_HOME.address,
    customCoords,
    lastGps,
  };
}

export function saveStoredTransitPreferences(prefs) {
  if (typeof window === 'undefined') return;
  if (prefs.originType) localStorage.setItem('transit_origin_type', prefs.originType);
  if (prefs.bufferMinutes != null) localStorage.setItem('transit_buffer_minutes', String(prefs.bufferMinutes));
  if (prefs.preferredMode) localStorage.setItem('transit_preferred_mode', prefs.preferredMode);
  if (prefs.customAddress != null) localStorage.setItem('transit_custom_address', prefs.customAddress);
  if (prefs.customCoords) {
    localStorage.setItem('transit_custom_coords', JSON.stringify(prefs.customCoords));
  }
}
