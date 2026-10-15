import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Bus,
  Footprints,
  Bike,
  ExternalLink,
  AlertTriangle,
  Compass,
  Crosshair,
  Settings2,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
} from 'lucide-react';
import {
  PRESET_ORIGINS,
  MOGILSKA_HOME,
  AGH_CAMPUS_CENTER,
  calculateDistanceKm,
  estimateTravelMinutes,
  calculateDeparturePlan,
  buildJakdojadeUrl,
  buildGoogleMapsUrl,
  requestCurrentGpsPosition,
  getStoredTransitPreferences,
  saveStoredTransitPreferences,
} from '../utils/transit';
import { parseAghLocation } from '../utils/aghCampus';

export default function TransitAssistant({ session, compact = false, showHeader = true }) {
  // 1. Initial State from localStorage / defaults
  const [prefs, setPrefs] = useState(() => getStoredTransitPreferences());
  const [selectedOrigin, setSelectedOrigin] = useState(() => prefs.originType || 'home');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(() => prefs.lastGps || null);
  const [showConfig, setShowConfig] = useState(false);
  const [bufferMinutes, setBufferMinutes] = useState(() => prefs.bufferMinutes ?? 5);
  const [customAddress, setCustomAddress] = useState(() => prefs.customAddress || MOGILSKA_HOME.address);
  const [chosenStopName, setChosenStopName] = useState(null);
  const [now, setNow] = useState(new Date());

  // Keep clock updated every 15s for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // 2. Resolve destination coordinates from session
  const aghLoc = useMemo(() => {
    if (!session) return null;
    return parseAghLocation(session.location, session.description, session.title);
  }, [session]);

  const destination = useMemo(() => {
    if (!session) return null;
    const coords = aghLoc?.coords || AGH_CAMPUS_CENTER;
    const name = aghLoc?.building
      ? `AGH Budynek ${aghLoc.building}`
      : session.location || 'Kampus Główny AGH';
    const address = aghLoc?.buildingDetails?.address || 'al. Adama Mickiewicza 30, Kraków';
    const transitStop = aghLoc?.buildingDetails?.transitStop || null;
    const entryTip = aghLoc?.buildingDetails?.entryTip || null;

    return { coords, name, address, transitStop, entryTip };
  }, [session, aghLoc]);

  // 3. Resolve active origin coordinates
  const activeOrigin = useMemo(() => {
    if (selectedOrigin === 'girlfriend') {
      return {
        id: 'girlfriend',
        name: PRESET_ORIGINS.girlfriend.name,
        coords: PRESET_ORIGINS.girlfriend.coords || gpsCoords,
        label: PRESET_ORIGINS.girlfriend.shortName,
      };
    }
    if (selectedOrigin === 'gps') {
      return {
        id: 'gps',
        name: 'Moja lokalizacja GPS',
        coords: gpsCoords,
        label: gpsCoords
          ? `GPS (${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)})`
          : 'GPS (Pobieram...)',
      };
    }
    if (selectedOrigin === 'miasteczko') {
      return {
        id: 'miasteczko',
        name: PRESET_ORIGINS.miasteczko.name,
        coords: PRESET_ORIGINS.miasteczko.coords,
        label: PRESET_ORIGINS.miasteczko.shortName,
      };
    }
    if (selectedOrigin === 'custom') {
      return {
        id: 'custom',
        name: customAddress ? customAddress : MOGILSKA_HOME.name,
        coords: prefs.customCoords || MOGILSKA_HOME.coords,
        label: customAddress || MOGILSKA_HOME.shortName,
      };
    }
    // Default: 'home' (Mogilska 23, 5. piętro)
    return {
      id: 'home',
      name: MOGILSKA_HOME.name,
      coords: MOGILSKA_HOME.coords,
      label: MOGILSKA_HOME.shortName,
      extraMinutes: MOGILSKA_HOME.floorBufferMinutes,
    };
  }, [selectedOrigin, gpsCoords, customAddress, prefs.customCoords]);

  // 4. Distance & Travel estimates
  const distanceKm = useMemo(() => {
    if (!activeOrigin.coords || !destination?.coords) return null;
    return calculateDistanceKm(
      activeOrigin.coords.lat,
      activeOrigin.coords.lng,
      destination.coords.lat,
      destination.coords.lng
    );
  }, [activeOrigin.coords, destination?.coords]);

  const travelEstimates = useMemo(() => {
    // 1. Girlfriend origin: ul. Głowackiego (tramwaj do Biprostalu + przesiadka w autobus na Chopina/Czarnowiejską)
    if (selectedOrigin === 'girlfriend') {
      const commuteBaseline = 20;
      if (distanceKm != null) {
        const calculated = estimateTravelMinutes(distanceKm);
        return {
          ...calculated,
          transit: Math.max(commuteBaseline, calculated.transit),
          recommended: 'transit',
        };
      }
      return { walk: 35, bike: 12, transit: commuteBaseline, car: 12, recommended: 'transit' };
    }

    // 2. Mogilska 23 (Dom) or fallback
    if (distanceKm == null) {
      return { walk: 40, bike: 15, transit: 20, car: 18, recommended: 'transit' };
    }
    return estimateTravelMinutes(distanceKm);
  }, [distanceKm, selectedOrigin]);

  // Active travel mode (transit by default, walk if under 0.9km and not at girlfriend's)
  const chosenTravelMinutes = travelEstimates
    ? (selectedOrigin === 'girlfriend'
        ? travelEstimates.transit // ~20 min z Głowackiego
        : (distanceKm != null && distanceKm < 0.9 ? travelEstimates.walk : travelEstimates.transit))
    : (selectedOrigin === 'girlfriend' ? 20 : 20);

  // Extra floor descent buffer (+2 min for 5th floor at Mogilska 23)
  const floorExtraMinutes = selectedOrigin === 'home' ? (MOGILSKA_HOME.floorBufferMinutes || 2) : 0;

  // Active chosen stop (e.g. Czarnowiejska vs Chopina for B-9)
  const effectiveStopName = chosenStopName || destination?.transitStop || 'Czarnowiejska';
  const effectiveAltStop = aghLoc?.alternativeStops?.find((s) => s.name === effectiveStopName);
  const effectiveWalkFromStop = effectiveAltStop
    ? effectiveAltStop.stopWalkMinutes
    : (aghLoc?.walkFromStopMinutes || 2);

  // Extra time needed from bus/tram stop to classroom desk:
  const destinationWalkAndStairsMinutes = effectiveWalkFromStop + (aghLoc?.insideMinutes || 1);
  const isTransitTravel = !distanceKm || distanceKm >= 0.9;
  const totalExtraLeadMinutes = floorExtraMinutes + (isTransitTravel ? destinationWalkAndStairsMinutes : 0);

  // 5. Departure Plan ("Kiedy wyjść, by zdążyć")
  const departurePlan = useMemo(() => {
    if (!session?.start) return null;
    return calculateDeparturePlan({
      sessionStart: session.start,
      travelMinutes: chosenTravelMinutes,
      bufferMinutes,
      extraMinutes: totalExtraLeadMinutes,
      now,
    });
  }, [session?.start, chosenTravelMinutes, bufferMinutes, totalExtraLeadMinutes, now]);

  // 6. Request live GPS on click or origin switch
  const handleFetchGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const pos = await requestCurrentGpsPosition();
      setGpsCoords(pos);
      saveStoredTransitPreferences({ originType: selectedOrigin === 'girlfriend' ? 'girlfriend' : 'gps' });
    } catch (err) {
      setGpsError(err.message || 'Nie udało się pobrać lokalizacji.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSelectOrigin = (type) => {
    setSelectedOrigin(type);
    saveStoredTransitPreferences({ originType: type });
    if (type === 'gps') {
      handleFetchGps();
    }
  };

  const handleSaveBuffer = (newBuffer) => {
    setBufferMinutes(newBuffer);
    saveStoredTransitPreferences({ bufferMinutes: newBuffer });
  };

  const handleSaveCustomAddress = () => {
    saveStoredTransitPreferences({
      customAddress: customAddress.trim(),
      originType: 'custom',
    });
    setPrefs((prev) => ({ ...prev, customAddress: customAddress.trim() }));
  };

  if (!session || !destination) return null;

  // 7. Dynamic URLs for Jakdojade & Google Maps
  const jakdojadeUrl = buildJakdojadeUrl({
    session,
    aghLoc,
    destinationCoords: destination.coords,
    destinationName: effectiveStopName || destination.name,
    transitStop: effectiveStopName,
    walkFromStopMinutes: effectiveWalkFromStop,
    insideMinutes: aghLoc?.insideMinutes,
    originCoords: activeOrigin.coords,
    originName: activeOrigin.name,
  });

  const googleMapsTransitUrl = buildGoogleMapsUrl({
    session,
    destinationCoords: destination.coords,
    destinationName: destination.name,
    originCoords: activeOrigin.coords,
    travelMode: distanceKm != null && distanceKm < 0.9 ? 'walking' : 'transit',
  });

  return (
    <div className="rounded-2xl border border-gray-750/80 bg-gray-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      {/* ── CARD HEADER: WHEN TO LEAVE BANNER ─────────────────── */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-850 via-gray-900 to-gray-850 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Departure countdown badge & title */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                <Compass size={13} className="text-blue-400" />
                DOJAZD & WSKAZÓWKI
              </span>

              {departurePlan && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border shadow-sm ${departurePlan.badgeColor}`}
                >
                  <Clock size={12} />
                  <span>{departurePlan.statusText}</span>
                </span>
              )}
            </div>

            <h4 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate mt-1">
              <span>Wyjdź najpóźniej o:</span>
              <span className="text-emerald-400 text-lg sm:text-xl font-extrabold font-mono tracking-tight underline decoration-emerald-500/40 decoration-2">
                {departurePlan?.departureTimeFormatted || '--:--'}
              </span>
            </h4>

            <p className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
              <span>
                Planowany przyjazd pod salę: <strong className="text-gray-200">{departurePlan?.targetArrivalTimeFormatted}</strong>
              </span>
              <span>•</span>
              <span>Zajęcia: <strong className="text-gray-200">{departurePlan?.sessionTimeFormatted}</strong></span>
              {distanceKm != null && (
                <>
                  <span>•</span>
                  <span className="text-emerald-300/90 font-medium">Dystans: ~{distanceKm} km</span>
                </>
              )}
            </p>
          </div>

          {/* Settings button */}
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-xs font-medium text-gray-300 hover:text-white border border-gray-700/70 transition-colors"
            title="Dostosuj punkt startowy lub zapas czasu"
          >
            <Settings2 size={13} className="text-gray-400" />
            <span>Opcje trasy</span>
            {showConfig ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* ── SUBTLE ORIGIN INDICATOR & DISCREET SWITCH (UKRYTY / NIENARZUCAJĄCY SIĘ) ── */}
        <div className="mt-2.5 pt-2.5 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400 gap-2">
          {selectedOrigin === 'home' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-gray-300 font-medium truncate flex items-center gap-1">
                <span>🏠</span>
                <span>Start: <strong className="text-white font-semibold">ul. Mogilska 23</strong> <span className="text-gray-400 text-[11px]">(5. piętro, +2 min winda)</span></span>
              </span>
            </div>
          ) : selectedOrigin === 'girlfriend' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-pink-300 font-medium truncate flex items-center gap-1">
                <span>❤️</span>
                <span>Start: <strong className="text-white font-semibold">U dziewczyny (Głowackiego)</strong> <span className="text-pink-300/80 text-[11px]">(tramwaj ➔ Biprostal ➔ Chopina/Czarnowiejska)</span></span>
              </span>
            </div>
          ) : selectedOrigin === 'gps' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-pink-300 font-medium truncate flex items-center gap-1">
                <span>📍</span>
                <span>Start: <strong className="text-white font-semibold">Lokalizacja GPS</strong></span>
              </span>
              {gpsLoading && <Crosshair size={11} className="animate-spin text-pink-400 flex-shrink-0" />}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-emerald-300 font-medium truncate flex items-center gap-1">
                <span>🏢</span>
                <span>Start: <strong className="text-white font-semibold">Miasteczko AGH</strong></span>
              </span>
            </div>
          )}

          {/* Discreet toggle link: lets user toggle without bulky buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedOrigin === 'home' ? (
              <button
                type="button"
                onClick={() => handleSelectOrigin('girlfriend')}
                className="text-[11px] text-gray-400 hover:text-pink-300 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-gray-800/70 border border-transparent hover:border-gray-700/60"
                title="Wychodzisz od dziewczyny z ul. Głowackiego? Przełącz na Głowackiego"
              >
                <span>❤️</span>
                <span className="hidden sm:inline">U dziewczyny (Głowackiego)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelectOrigin('home')}
                className="text-[11px] text-gray-400 hover:text-blue-300 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-gray-800/70 border border-transparent hover:border-gray-700/60"
                title="Wróć do: ul. Mogilska 23"
              >
                <span>🏠</span>
                <span className="hidden sm:inline">Mogilska 23</span>
              </button>
            )}
          </div>
        </div>

        {/* ── EXPANDABLE OPTIONS: ORIGIN & BUFFER CONFIG ───────── */}
        {showConfig && (
          <div className="mt-3.5 pt-3.5 border-t border-gray-800/80 space-y-3.5 text-xs animate-in fade-in duration-200">
            {/* Origin selector */}
            <div>
              <label className="block text-gray-400 font-semibold mb-1.5">
                Punkt startowy:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Mogilska 23 (Dom) */}
                <button
                  type="button"
                  onClick={() => handleSelectOrigin('home')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selectedOrigin === 'home'
                      ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-300'
                  }`}
                >
                  <span className="text-base">🏠</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">Dom (Mogilska 23)</p>
                    <p className="text-[10px] text-gray-400 truncate">5. piętro (+2 min na windę)</p>
                  </div>
                  {selectedOrigin === 'home' && <Check size={13} className="text-white flex-shrink-0" />}
                </button>

                {/* 2. U dziewczyny (GPS) */}
                <button
                  type="button"
                  onClick={() => handleSelectOrigin('girlfriend')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selectedOrigin === 'girlfriend'
                      ? 'bg-pink-600/25 border-pink-500 text-white shadow-sm ring-1 ring-pink-500/50'
                      : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-300'
                  }`}
                >
                  <span className="text-base">❤️</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">U dziewczyny (Głowackiego)</p>
                    <p className="text-[10px] text-pink-300/80 truncate">
                      Głowackiego ➔ Biprostal (~20 min)
                    </p>
                  </div>
                  {selectedOrigin === 'girlfriend' && <Check size={13} className="text-pink-400 flex-shrink-0" />}
                </button>

                {/* 3. Miasteczko Studenckie AGH */}
                <button
                  type="button"
                  onClick={() => handleSelectOrigin('miasteczko')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selectedOrigin === 'miasteczko'
                      ? 'bg-emerald-600/25 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50'
                      : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-300'
                  }`}
                >
                  <span className="text-base">🏢</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">Miasteczko AGH</p>
                    <p className="text-[10px] text-gray-400 truncate">Rostafińskiego / Reymonta</p>
                  </div>
                  {selectedOrigin === 'miasteczko' && <Check size={13} className="text-emerald-400 flex-shrink-0" />}
                </button>
              </div>

              {gpsError && (
                <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  <span>{gpsError}</span>
                </p>
              )}

              {/* Custom address edit input */}
              {selectedOrigin === 'custom' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    placeholder="np. ul. Juliusza Lea 20, Kraków"
                    className="flex-1 bg-gray-950/80 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomAddress}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs shadow-sm"
                  >
                    Zapisz
                  </button>
                </div>
              )}
            </div>

            {/* Time Buffer selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-400 font-semibold">
                  Zapas czasu przed zajęciami (na wejście do budynku / znalezienie sali):
                </label>
                <span className="text-emerald-400 font-bold font-mono">+{bufferMinutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                {[0, 5, 10, 15].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSaveBuffer(val)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      bufferMinutes === val
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white'
                    }`}
                  >
                    {val === 0 ? 'Bez zapasu' : `+${val} min`}
                    {val === 5 && ' (Zalecane)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── CARD BODY: ACTION BUTTONS & LOCATION DETAILS ─────────── */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Travel Mode Times Overview */}
        {travelEstimates && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-850/60 border border-gray-800">
              <Bus size={15} className="text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">MPK Kraków</p>
                <p className="text-xs font-extrabold text-white">ok. {travelEstimates.transit} min</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-850/60 border border-gray-800">
              <Footprints size={15} className="text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pieszo</p>
                <p className="text-xs font-extrabold text-white">ok. {travelEstimates.walk} min</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 p-2.5 rounded-xl bg-gray-850/60 border border-gray-800">
              <Bike size={15} className="text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Rower / Hulajnoga</p>
                <p className="text-xs font-extrabold text-white">ok. {travelEstimates.bike} min</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 🚀 BIG DIRECT ACTION BUTTONS: JAKDOJADE & GOOGLE MAPS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* JAKDOJADE BUTTON */}
          <a
            href={jakdojadeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg shadow-emerald-950/30 transition-all border border-emerald-400/30 group"
            title="Otwórz Jakdojadę z zaplanowanym przyjazdem na godzinę zajęć"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 flex items-center justify-center border border-emerald-400/40 text-emerald-300 flex-shrink-0">
                <Bus size={17} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs sm:text-sm font-extrabold leading-tight">
                  Jakdojadę
                </p>
                <p className="text-[10px] text-emerald-200/90 font-medium truncate">
                  Rozkład MPK na godz. {departurePlan?.sessionTimeFormatted}
                </p>
              </div>
            </div>
            <ExternalLink size={14} className="text-emerald-200 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
          </a>

          {/* GOOGLE MAPS BUTTON */}
          <a
            href={googleMapsTransitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white font-bold shadow-lg shadow-blue-950/30 transition-all border border-blue-400/30 group"
            title="Otwórz nawigację zakręt po zakręcie w Google Maps"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-950/60 flex items-center justify-center border border-blue-400/40 text-blue-300 flex-shrink-0">
                <Navigation size={17} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs sm:text-sm font-extrabold leading-tight">
                  Google Maps
                </p>
                <p className="text-[10px] text-blue-200/90 font-medium truncate">
                  Nawigacja krok po kroku
                </p>
              </div>
            </div>
            <ExternalLink size={14} className="text-blue-200 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
          </a>
        </div>

        {/* ── AGH BUILDING DETAILS & ENTRY HINTS ───────────────── */}
        <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <MapPin size={15} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-white">
                  {destination.name} {aghLoc?.room ? `• Sala ${aghLoc.room}` : ''}
                </p>
                {aghLoc?.floorLabel && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                    {aghLoc.floorLabel}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-[11px] truncate mt-0.5">{destination.address}</p>
            </div>
          </div>

          {destination.transitStop && (
            <div className="space-y-1.5 pl-6 pt-0.5">
              <div className="flex items-center gap-2 text-gray-300 text-[11px] flex-wrap">
                <Bus size={12} className="text-sky-400 flex-shrink-0" />
                <span>
                  Przystanek docelowy MPK: <strong className="text-white font-semibold">{effectiveStopName}</strong>
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-sky-300">
                  spacer pod budynek: <strong>~{effectiveWalkFromStop} min</strong>
                </span>
                {aghLoc?.insideMinutes ? (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-emerald-300">
                      schody / wejście na {aghLoc.floorLabel || 'salę'}: <strong>~{aghLoc.insideMinutes} min</strong>
                    </span>
                  </>
                ) : null}
              </div>

              {/* Stop switcher pills (e.g. Czarnowiejska vs Chopina for B-9) */}
              {aghLoc?.alternativeStops && aghLoc.alternativeStops.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-gray-400 font-medium">Wybierz przystanek:</span>
                  <button
                    type="button"
                    onClick={() => setChosenStopName(destination.transitStop)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                      effectiveStopName === destination.transitStop
                        ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                        : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
                    }`}
                  >
                    🚏 {destination.transitStop} (~{aghLoc?.walkFromStopMinutes || 2}m)
                  </button>
                  {aghLoc.alternativeStops.map((alt) => (
                    <button
                      key={alt.name}
                      type="button"
                      onClick={() => setChosenStopName(alt.name)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                        effectiveStopName === alt.name
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
                      }`}
                      title={alt.tip || alt.name}
                    >
                      🚏 {alt.name} (~{alt.stopWalkMinutes}m)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Route Hint when coming from girlfriend's place */}
          {selectedOrigin === 'girlfriend' && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-pink-950/40 border border-pink-700/50 flex items-start gap-2 text-[11px] text-pink-200">
              <span className="text-base leading-none">💡</span>
              <div>
                <span className="font-semibold text-white">Dojazd od dziewczyny:</span> wsiądź w tramwaj na przystanku <strong>Głowackiego</strong> ➔ na <strong>Biprostalu</strong> przesiądź się w autobus do przystanku <strong>{effectiveStopName}</strong>{effectiveStopName === 'Czarnowiejska' && aghLoc?.building === 'B-9' ? ' (lub Chopina)' : ''}{aghLoc?.building === 'C-7' ? ' (lub podejdź ~5 min pieszo z Biprostalu)' : ''}.
              </div>
            </div>
          )}

          {destination.entryTip && (
            <div className="flex items-start gap-2 text-emerald-300/90 pl-6 text-[11px]">
              <Info size={12} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Wskazówka: {destination.entryTip}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
