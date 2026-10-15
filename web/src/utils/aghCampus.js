// Utility for parsing AGH University campus buildings, rooms and locations
// Examples of inputs from USOS / Google Calendar:
// "Sala: 012\nB-9"
// "B-9, Sala: 012"
// "Budynek: B-9, Sala: 012"
// "<b>Sala:</b> 012<br><b>Budynek:</b> B-9"
// "bud. D-17, s. 1.19"
// "D-17, sala 2.14"
// "budynek C-2 sala 429"
// "B-1 s. 101"
// "Centrum Informatyki D-17, s. 1.38"
// "A0" -> Online
// "A-0" -> Online

export const AGH_BUILDING_DETAILS = {
  'D-17': {
    name: 'Centrum Informatyki AGH',
    faculty: 'Wydział Informatyki / WIEiT',
    address: 'ul. Kawiory 21, Kraków',
    transitStop: 'Kawiory / Czarnowiejska',
    entryTip: 'Główne wejście od strony ul. Kawiory, łącznik z D-10',
    coords: { lat: 50.0673, lng: 19.9130 },
  },
  'C-2': {
    name: 'Pawilon C-2',
    faculty: 'Wydział Informatyki, Elektroniki i Telekomunikacji (WIEiT)',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR (al. Mickiewicza) lub Czarnowiejska',
    entryTip: 'Skrzydło C, wejście z dziedzińca głównego AGH',
    coords: { lat: 50.0655, lng: 19.9197 },
  },
  'C-3': {
    name: 'Pawilon C-3',
    faculty: 'Wydział Informatyki, Elektroniki i Telekomunikacji',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Kompleks budynków C przy miasteczku/ul. Czarnowiejskiej',
    coords: { lat: 50.0658, lng: 19.9186 },
  },
  'C-1': {
    name: 'Pawilon C-1',
    faculty: 'Wydział WIEiT / EAIiIB',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Skrzydło C przy al. Mickiewicza',
    coords: { lat: 50.0651, lng: 19.9208 },
  },
  'C-4': {
    name: 'Pawilon C-4',
    faculty: 'Wydział WIEiT',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Kompleks C w głębi kampusu',
    coords: { lat: 50.0660, lng: 19.9178 },
  },
  'B-1': {
    name: 'Pawilon B-1',
    faculty: 'Wydział Elektrotechniki, Automatyki, Informatyki i Inżynierii Biomedycznej (EAIiIB)',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Główny dziedziniec AGH przy A-0',
    coords: { lat: 50.0652, lng: 19.9221 },
  },
  'B-2': {
    name: 'Pawilon B-2',
    faculty: 'Wydział EAIiIB',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Obok Pawilonu B-1',
    coords: { lat: 50.0656, lng: 19.9213 },
  },
  'B-3': {
    name: 'Pawilon B-3',
    faculty: 'Wydział EAIiIB',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Kompleks budynków B',
    coords: { lat: 50.0659, lng: 19.9205 },
  },
  'B-4': {
    name: 'Pawilon B-4',
    faculty: 'Wydział EAIiIB / WIMiR',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR lub Czarnowiejska',
    entryTip: 'Wzdłuż głównej alei kampusu',
    coords: { lat: 50.0661, lng: 19.9198 },
  },
  'B-5': {
    name: 'Pawilon B-5',
    faculty: 'Wydział Inżynierii Mechanicznej i Robotyki (WIMiR)',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR lub Czarnowiejska',
    entryTip: 'Wejście od alejki łączącej kampus z ul. Reymonta',
    coords: { lat: 50.0664, lng: 19.9192 },
  },
  'B-6': {
    name: 'Pawilon B-6',
    faculty: 'Wydział WIMiR',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Kompleks B przy ul. Czarnowiejskiej',
    coords: { lat: 50.0666, lng: 19.9186 },
  },
  'B-7': {
    name: 'Pawilon B-7',
    faculty: 'Wydział WIMiIP',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Pomiędzy B-6 a B-8',
    coords: { lat: 50.0668, lng: 19.9182 },
  },
  'B-8': {
    name: 'Pawilon B-8',
    faculty: 'Wydział Inżynierii Metali i Informatyki Przemysłowej (WIMiIP)',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'Czarnowiejska / Kawiory',
    entryTip: 'Kompleks B przy ul. Czarnowiejskiej',
    coords: { lat: 50.0669, lng: 19.9180 },
  },
  'B-9': {
    name: 'Pawilon B-9',
    faculty: 'Wydział Inżynierii Metali i Informatyki Przemysłowej (WIMiIP)',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Blisko Biblioteki Głównej AGH i ul. Czarnowiejskiej',
    coords: { lat: 50.0671, lng: 19.9172 },
  },
  'U-2': {
    name: 'Centrum Dydaktyki AGH (U-2)',
    faculty: 'Centrum Dydaktyczne',
    address: 'ul. Reymonta 7, Kraków',
    transitStop: 'Miasteczko Studenckie AGH / Reymana',
    entryTip: 'Nowoczesny przeszklony budynek dydaktyczny przy Miasteczku AGH',
    coords: { lat: 50.0669, lng: 19.9142 },
  },
  'C-5': {
    name: 'Centrum Energetyki AGH (C-5)',
    faculty: 'Centrum Energetyki',
    address: 'ul. Czarnowiejska 36, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Kompleks Centrum Energetyki, wejście od ul. Czarnowiejskiej',
    coords: { lat: 50.0663, lng: 19.9210 },
  },
  'C-6': {
    name: 'Centrum Energetyki AGH (C-6)',
    faculty: 'Centrum Energetyki',
    address: 'ul. Czarnowiejska 36, Kraków',
    transitStop: 'Czarnowiejska',
    entryTip: 'Kompleks Centrum Energetyki',
    coords: { lat: 50.0665, lng: 19.9212 },
  },
  'A-0': {
    name: 'Gmach Główny AGH (A-0)',
    faculty: 'Rektorat i Aule Główne',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Główne monumentalne wejście z kolumnadą od al. Mickiewicza',
    coords: { lat: 50.0647, lng: 19.9234 },
  },
  'A-1': {
    name: 'Pawilon A-1',
    faculty: 'Wydział Geodezji Górniczej i Inżynierii Środowiska',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Skrzydło po lewej stronie od wejścia A-0',
    coords: { lat: 50.0642, lng: 19.9229 },
  },
  'A-2': {
    name: 'Pawilon A-2',
    faculty: 'Wydział Górnictwa i Geoinżynierii',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Skrzydło kompleksu A',
    coords: { lat: 50.0652, lng: 19.9240 },
  },
  'A-3': {
    name: 'Pawilon A-3',
    faculty: 'Wydział Geologii, Geofizyki i Ochrony Środowiska',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Skrzydło kompleksu A od strony ul. Reymonta',
    coords: { lat: 50.0638, lng: 19.9224 },
  },
  'A-4': {
    name: 'Pawilon A-4',
    faculty: 'Wydział Geodezji Górniczej',
    address: 'al. Adama Mickiewicza 30, Kraków',
    transitStop: 'AGH / UR',
    entryTip: 'Skrzydło A przy ul. Czarnowiejskiej',
    coords: { lat: 50.0648, lng: 19.9245 },
  },
  'D-1': {
    name: 'Pawilon D-1',
    faculty: 'Wydział Fizyki i Informatyki Stosowanej',
    address: 'ul. Reymonta 13, Kraków',
    transitStop: 'Kawiory / Czarnowiejska',
    entryTip: 'Kompleks D przy ul. Reymonta',
    coords: { lat: 50.0678, lng: 19.9148 },
  },
  'D-2': {
    name: 'Pawilon D-2',
    faculty: 'Wydział Fizyki i Informatyki Stosowanej',
    address: 'ul. Reymonta 15, Kraków',
    transitStop: 'Kawiory',
    entryTip: 'Obok Pawilonu D-1',
    coords: { lat: 50.0681, lng: 19.9142 },
  },
  'D-5': {
    name: 'Pawilon D-5',
    faculty: 'Wydział Zarządzania AGH',
    address: 'ul. Gramatyka 10, Kraków',
    transitStop: 'Kawiory / Biprostal',
    entryTip: 'W rejonie ul. Gramatyka',
    coords: { lat: 50.0684, lng: 19.9125 },
  },
  'D-10': {
    name: 'Pawilon D-10',
    faculty: 'Kampus Kawiory',
    address: 'ul. Kawiory 26a, Kraków',
    transitStop: 'Kawiory',
    entryTip: 'W rejonie ul. Kawiory i Gramatyka',
    coords: { lat: 50.0678, lng: 19.9118 },
  },
  'H-1': {
    name: 'Pawilon H-1 (Hala Sportowa)',
    faculty: 'Studium Wychowania Fizycznego i Sportu AGH',
    address: 'ul. Piastowska 26a, Kraków',
    transitStop: 'Cichy Kącik / Miasteczko AGH',
    entryTip: 'Hala i basen AGH przy Miasteczku Studenckim',
    coords: { lat: 50.0638, lng: 19.9215 },
  },
};

export function isSessionOnline(session, aghLoc) {
  if (!session) return false;
  if (session.mode === 'online') return true;
  if (session.mode === 'onsite') return false;
  if (aghLoc?.isRemote) return true;
  if (aghLoc?.building) return false;
  if (aghLoc?.isOnsite) return false;

  const loc = String(session.location || '').toLowerCase();
  const title = String(session.title || '').toLowerCase();
  const desc = String(session.description || '').toLowerCase();
  const combined = `${loc} ${title} ${desc}`;

  if (/\b(zdalnie|online|teams|zoom|meet|webex)\b/i.test(combined)) {
    return true;
  }

  // If no location at all was specified, and there's a meeting link explicitly set on this session
  if (!session.location && session.teamsLink) {
    return true;
  }

  return false;
}

export function parseAghLocation(location = '', description = '', title = '') {
  const locStr = String(location || '').trim();
  const descStr = String(description || '').trim();
  const titleStr = String(title || '').trim();
  const rawCombined = `${locStr} ${descStr} ${titleStr}`;

  // Clean HTML tags and normalize whitespace for reliable regex matching
  const cleanCombined = rawCombined
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Remote / Online check (A0 / A-0 is AGH's standard code for remote learning)
  const isA0 = /\b(a0|a-0|bud\.\s*a0|budynek\s*a0)\b/i.test(cleanCombined);
  if (isA0) {
    return {
      isRemote: true,
      building: 'A-0',
      room: null,
      displayText: 'Zdalnie (Budynek A-0)',
      fullCampusText: 'Zdalnie (Budynek A-0 / USOS)',
      mapUrl: null,
      navigateUrl: null,
      isOnsite: false,
      buildingDetails: null,
    };
  }

  // 2. Extract AGH Building
  // Recognized pavilions: A-0..A-4, B-1..B-9, C-1..C-7, D-1..D-17, U-1..U-2
  let building = null;

  // Filter out CEFR language levels (B1, B2, C1, C2, A1, A2) in language courses so they aren't misparsed as AGH pavilions
  const isLanguageSubject = /angielski|język|jezyk|lektorat|sjo/i.test(titleStr + ' ' + descStr);
  let buildingSearchText = cleanCombined;
  if (isLanguageSubject) {
    buildingSearchText = buildingSearchText
      .replace(/\b(?:poziom|level|gr|grupa)?\s*([ABC])[-–\s]?([12])(?:\.[12])?\b/gi, ' ')
      .replace(/\s+/g, ' ');
  }

  const buildingMatch = buildingSearchText.match(
    /(?:(?:bud(?:ynek|\.)?|pawilon)\s*[:=-]?\s*([ABCDUH])[-–\s]?(\d{1,2})|\b([ABCDUH])[-–](\d{1,2})\b)/i
  );
  if (buildingMatch) {
    const letter = (buildingMatch[1] || buildingMatch[3]).toUpperCase();
    const number = buildingMatch[2] || buildingMatch[4];
    const candidate = `${letter}-${number}`;

    // Validate against realistic AGH pavilion limits
    const num = parseInt(number, 10);
    const isValidAgh =
      (letter === 'A' && num <= 4) ||
      (letter === 'B' && num >= 1 && num <= 9) ||
      (letter === 'C' && num >= 1 && num <= 7) ||
      (letter === 'D' && num >= 1 && num <= 17) ||
      (letter === 'U' && num >= 1 && num <= 2) ||
      (letter === 'H' && num === 1);

    if (isValidAgh) {
      building = candidate;
    }
  }

  const buildingDetails = building ? AGH_BUILDING_DETAILS[building] : null;
  const buildingExtraName = buildingDetails?.name || null;

  // 3. Extract Room / Sala (supports Sala: 012, s.: 012, pokój: 112, s. 1.19, etc.)
  let room = null;
  const roomMatch = cleanCombined.match(
    /\b(?:sala|pok[oó]j|lab(?:\.|oratorium)?|s(?:\.|\b))\s*[:=-]?\s*([0-9a-zA-Z._/-]+)/i
  );
  if (roomMatch) {
    room = roomMatch[1].replace(/[,;)]+$/, '');
  } else if (building) {
    // Try matching pattern "B-9, 012" or "B-9 012" or "B-9/012"
    const escapedB = building.replace('-', '[-–\\s]?');
    const simpleRoomMatch = cleanCombined.match(
      new RegExp(`\\b${escapedB}[,/\\s]+(?:s\\.|sala\\s*[:=-]?)?([0-9]{1,3}(?:\\.[0-9a-zA-Z]+)?)\\b`, 'i')
    );
    if (simpleRoomMatch) {
      room = simpleRoomMatch[1];
    }
  }

  // 4. Construct clean display texts
  let displayText = locStr;
  if (building && room) {
    displayText = `Bud. ${building}, s. ${room}`;
  } else if (building) {
    displayText = `Budynek ${building}`;
  } else if (room) {
    displayText = `Sala ${room}`;
  }

  const isOnsite = !!building || (!isA0 && !!locStr && !/zdalnie|online|teams|meet/i.test(cleanCombined));

  // Map link directly to AGH building location
  const mapUrl = building
    ? `https://www.google.com/maps/search/?api=1&query=AGH+Budynek+${encodeURIComponent(building)}+Kraków`
    : null;

  // Direct turn-by-turn navigation / directions URL
  const navigateUrl = building
    ? `https://www.google.com/maps/dir/?api=1&destination=AGH+Budynek+${encodeURIComponent(building)}+Kraków`
    : (locStr && isOnsite ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locStr + ' AGH Kraków')}` : null);

  const fullCampusText = building
    ? `${displayText}${buildingExtraName ? ` (${buildingExtraName})` : ''} • Kampus AGH`
    : displayText || (isOnsite ? 'Kampus AGH' : null);

  const coords = buildingDetails?.coords || (isOnsite ? { lat: 50.0647, lng: 19.9234 } : null);

  return {
    isRemote: false,
    building,
    buildingExtraName,
    buildingDetails,
    coords,
    room,
    displayText: displayText || locStr || null,
    fullCampusText,
    mapUrl,
    navigateUrl,
    isOnsite,
  };
}

// ── CAMPUS GEOFENCING & DISTANCE CALCULATION ──

export const AGH_CAMPUS_CENTER = {
  lat: 50.0665,
  lng: 19.9160,
  radiusMeters: 650, // 650m covers the entire main campus from A-0 to D-17
};

/**
 * Calculates straight-line distance in meters between two lat/lng coordinates (Haversine formula).
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // Earth radius in meters
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
 * Checks whether user coordinates are currently on or immediately adjacent to the AGH Campus.
 */
export function isUserAtCampus(lat, lng, maxDistanceMeters = 650) {
  if (lat == null || lng == null) return false;
  const dist = calculateDistanceMeters(lat, lng, AGH_CAMPUS_CENTER.lat, AGH_CAMPUS_CENTER.lng);
  return dist !== null && dist <= maxDistanceMeters;
}

/**
 * Checks whether user coordinates are close to a specific building (e.g. within 150m).
 */
export function isUserAtBuilding(lat, lng, buildingCode, maxDistanceMeters = 150) {
  if (!buildingCode || lat == null || lng == null) return false;
  const details = AGH_BUILDING_DETAILS[buildingCode];
  if (!details?.coords) return false;
  const dist = calculateDistanceMeters(lat, lng, details.coords.lat, details.coords.lng);
  return dist !== null && dist <= maxDistanceMeters;
}

