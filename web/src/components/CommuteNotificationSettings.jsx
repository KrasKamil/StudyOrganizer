import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  isNotificationSupported,
  getNotificationPermission,
  enableNotifications,
  showDeviceNotification,
  PUSH_STORAGE_KEY,
} from '../services/notificationService';
import {
  getCommuteSettings,
  saveCommuteSettings,
  getCurrentCoordinates,
  getLastKnownLocation,
} from '../services/commuteService';
import {
  isUserAtCampus,
  calculateDistanceMeters,
  AGH_CAMPUS_CENTER,
} from '../utils/aghCampus';
import {
  Bell, BellRing, MapPin, Navigation, Compass,
  CheckCircle2, AlertCircle, RefreshCw, Send, Car, Bus, Bike, Footprints, ExternalLink, Check
} from 'lucide-react';
import {
  PRESET_ORIGINS,
  MOGILSKA_HOME,
  buildJakdojadeUrl,
  buildGoogleMapsUrl,
  getStoredTransitPreferences,
  saveStoredTransitPreferences,
} from '../utils/transit';

export default function CommuteNotificationSettings() {
  const { user } = useAuth();
  const [permission, setPermission] = useState('default');
  const [isPushActive, setIsPushActive] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Commute settings
  const [settings, setSettings] = useState(getCommuteSettings());
  const [checkingGps, setCheckingGps] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(getLastKnownLocation());
  const [gpsError, setGpsError] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Transit Origin Preferences
  const [transitPrefs, setTransitPrefs] = useState(() => getStoredTransitPreferences());
  const [originType, setOriginType] = useState(() => transitPrefs.originType || 'miasteczko');
  const [customAddress, setCustomAddress] = useState(() => transitPrefs.customAddress || settings.homeAddress || '');

  const handleOriginChange = (type) => {
    setOriginType(type);
    saveStoredTransitPreferences({ originType: type });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCustomAddressSave = () => {
    saveStoredTransitPreferences({ customAddress: customAddress.trim(), originType: 'custom' });
    handleSaveSettings({ homeAddress: customAddress.trim() });
  };

  useEffect(() => {
    setPermission(getNotificationPermission());
    setIsPushActive(
      getNotificationPermission() === 'granted' &&
      localStorage.getItem(PUSH_STORAGE_KEY) === 'true'
    );
  }, []);

  const handleEnableNotifications = async () => {
    setEnabling(true);
    try {
      await enableNotifications(user?.uid);
      setPermission(getNotificationPermission());
      setIsPushActive(true);
    } catch (err) {
      alert(err.message || 'Nie udało się włączyć powiadomień.');
    } finally {
      setEnabling(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    const success = await showDeviceNotification(
      '⏰ Czas wyjść na zajęcia za 10 min! (07:35)',
      {
        body: 'Podstawy Sieci Komputerowych o 08:30 (Bud. D-17, s. 1.19). Dojazd zajmie dziś ok. 40 min.',
        data: { url: '/today' },
        tag: 'test-notification',
      }
    );
    if (!success) {
      alert('Powiadomienie zablokowane. Sprawdź uprawnienia w pasku adresu przeglądarki.');
    }
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleCheckGps = async () => {
    setCheckingGps(true);
    setGpsError(null);
    try {
      const coords = await getCurrentCoordinates({
        timeout: 10000,
        enableHighAccuracy: true,
      });
      setGpsLocation(coords);
    } catch (err) {
      setGpsError(err.message || 'Nie udało się pobrać pozycji GPS.');
    } finally {
      setCheckingGps(false);
    }
  };

  const handleSaveSettings = (updates) => {
    const updated = saveCommuteSettings(updates);
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Determine distance from AGH Campus Center
  const distFromCampus = gpsLocation
    ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, AGH_CAMPUS_CENTER.lat, AGH_CAMPUS_CENTER.lng)
    : null;

  const isCurrentlyOnCampus = gpsLocation
    ? isUserAtCampus(gpsLocation.lat, gpsLocation.lng)
    : false;

  return (
    <div className="space-y-4">
      {/* ── CARD 1: PUSH NOTIFICATIONS TOGGLE & TEST ── */}
      <div className="p-4 rounded-xl bg-gray-850/80 border border-gray-750 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${isPushActive ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-700/50' : 'bg-gray-800 text-gray-400'}`}>
              {isPushActive ? <BellRing size={20} /> : <Bell size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Powiadomienia na telefonie</h3>
                {isPushActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/60">
                    <CheckCircle2 size={11} /> Aktywne
                  </span>
                ) : permission === 'denied' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700/60">
                    <AlertCircle size={11} /> Zablokowane w przeglądarce
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-400 font-medium bg-gray-800 px-2 py-0.5 rounded-full">
                    Wymaga włączenia
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Otrzymuj alerty o wyjściu z domu, salach zajęć oraz bezpośrednie linki do spotkań Teams.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isPushActive ? (
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={testSent}
                className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-indigo-300 hover:text-white text-xs font-semibold border border-gray-700 transition-all flex items-center gap-1.5"
                title="Wyślij testowe powiadomienie na ten telefon"
              >
                <Send size={13} className={testSent ? 'animate-bounce' : ''} />
                <span>{testSent ? 'Wysłano!' : 'Przetestuj'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={enabling || permission === 'denied'}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <BellRing size={14} />
                <span>{enabling ? 'Włączam...' : 'Włącz powiadomienia'}</span>
              </button>
            )}
          </div>
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-300">
            ⚠️ Powiadomienia zostały zablokowane w Twojej przeglądarce. Kliknij ikonę kłódki / ustawień strony obok adresu URL w telefonie i zezwól na „Powiadomienia”.
          </div>
        )}
      </div>

      {/* ── CARD 2: REAL-TIME LOCATION & CAMPUS GEOFENCING ── */}
      <div className="p-4 rounded-xl bg-gray-850/80 border border-gray-750 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${isCurrentlyOnCampus ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-700/50' : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'}`}>
              <MapPin size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Lokalizacja i Kampus AGH</span>
                {isCurrentlyOnCampus && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/50 text-emerald-300 border border-emerald-700/60">
                    🎓 Jesteś na Kampusie AGH
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isCurrentlyOnCampus
                  ? 'System wie, że jesteś już na miejscu — nie wyśle alarmu o wyjściu z domu, a jedynie przypomnienie o sali 15 min przed zajęciami.'
                  : distFromCampus != null
                  ? `Jesteś poza kampusem (ok. ${(distFromCampus / 1000).toFixed(1)} km od AGH). Działa algorytm Time-to-Leave (czas wyjścia z domu).`
                  : 'Pobierz swoją pozycję, aby system wiedział czy jesteś w domu, czy już na uczelni.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckGps}
            disabled={checkingGps}
            className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-blue-300 hover:text-white text-xs font-semibold border border-gray-700 transition-all flex items-center gap-1.5 flex-shrink-0"
            title="Sprawdź aktualną pozycję GPS"
          >
            <Compass size={13} className={checkingGps ? 'animate-spin' : ''} />
            <span>{checkingGps ? 'Lokalizuję...' : 'Pobierz GPS'}</span>
          </button>
        </div>

        {gpsError && (
          <p className="text-xs text-red-400 bg-red-950/20 p-2 rounded-lg border border-red-900/30">
            {gpsError}
          </p>
        )}
      </div>

      {/* ── CARD 3: COMMUTE TIME & TRAVEL SETTINGS ── */}
      <div className="p-4 rounded-xl bg-gray-850/80 border border-gray-750 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Navigation size={17} className="text-blue-400" />
            <span>Parametry Czasu Dojazdu (Time-to-Leave)</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Dostosuj kalkulację wyjścia z domu do swoich codziennych przyzwyczajeń.
          </p>
        </div>

        {/* Transport Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Główny środek dojazdu na AGH:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'transit', label: 'Komunikacja MPK', icon: Bus, desc: 'Tramwaj / Autobus' },
              { id: 'driving', label: 'Samochód', icon: Car, desc: 'Korki w szczycie' },
              { id: 'bicycling', label: 'Rower / Hulajnoga', icon: Bike, desc: 'Ścieżki rowerowe' },
              { id: 'walking', label: 'Pieszo', icon: Footprints, desc: 'Z akademika / blisko' },
            ].map((m) => {
              const Icon = m.icon;
              const active = settings.transportMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSaveSettings({ transportMode: m.id })}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                    active
                      ? 'bg-zinc-800 border-zinc-500 text-white font-bold ring-1 ring-white/20 shadow-sm'
                      : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="mb-1 text-white" />
                  <span>{m.label}</span>
                  <span className="text-[10px] text-gray-400">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Base Commute Minutes */}
          <div>
            <label className="block text-xs text-gray-300 font-medium mb-1">
              Zwykły czas dojazdu:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="5"
                max="180"
                value={settings.defaultCommuteMinutes}
                onChange={(e) =>
                  handleSaveSettings({
                    defaultCommuteMinutes: parseInt(e.target.value, 10) || 40,
                  })
                }
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
              <span className="text-xs text-gray-400">min</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Bazowy czas w typowy dzień (np. 40 min).
            </p>
          </div>

          {/* Advance warning before departure */}
          <div>
            <label className="block text-xs text-gray-300 font-medium mb-1">
              Przypomnij przed wyjściem:
            </label>
            <select
              value={settings.notifyBeforeMinutes}
              onChange={(e) =>
                handleSaveSettings({
                  notifyBeforeMinutes: parseInt(e.target.value, 10) || 10,
                })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value={5}>5 minut przed wyjściem</option>
              <option value={10}>10 minut przed wyjściem (Zalecane)</option>
              <option value={15}>15 minut przed wyjściem</option>
              <option value={20}>20 minut przed wyjściem</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              Czas na ubranie się i spakowanie plecaka.
            </p>
          </div>

          {/* Campus buffer */}
          <div>
            <label className="block text-xs text-gray-300 font-medium mb-1">
              Bufor na kampusie (dojście do sali):
            </label>
            <select
              value={settings.bufferMinutes}
              onChange={(e) =>
                handleSaveSettings({
                  bufferMinutes: parseInt(e.target.value, 10) || 5,
                })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value={3}>3 minuty</option>
              <option value={5}>5 minut (Zalecane)</option>
              <option value={10}>10 minut (np. D-17 lub C-5)</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-1">
              Czas od przystanku/parkingu do wejścia do sali.
            </p>
          </div>
        </div>

        {/* Location-aware smart toggle */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.locationAware}
              onChange={(e) => handleSaveSettings({ locationAware: e.target.checked })}
              className="rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-gray-300">
              Inteligentny Geofencing Kampusu AGH (nie wysyłaj alarmu wyjścia, jeśli jestem już na AGH)
            </span>
          </label>

          {savedSuccess && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> Zapisano
            </span>
          )}
        </div>
      </div>

      {/* ── CARD 4: ORIGIN PRESET & JAKDOJADĘ / GOOGLE MAPS ── */}
      <div className="p-4 rounded-xl bg-gray-850/80 border border-gray-750 space-y-3.5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass size={17} className="text-emerald-400" />
            <span>Domyślny Punkt Startowy & Integracja z Jakdojadę / Mapami</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Wybierz miejsce, z którego najczęściej dojeżdżasz na zajęcia. Aplikacja automatycznie wyznacza stąd trasę w Jakdojadę i Google Maps.
          </p>
        </div>

        {/* Preset Origin Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Mogilska 23 (Dom) */}
          <button
            type="button"
            onClick={() => handleOriginChange('home')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
              originType === 'home'
                ? 'bg-zinc-800 border-zinc-500 text-white font-bold ring-1 ring-white/20 shadow-sm'
                : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg">🏠</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">Dom (Mogilska 23)</p>
              <p className="text-[10px] text-gray-400 truncate">5. piętro (+2 min na zejście)</p>
            </div>
            {originType === 'home' && <Check size={13} className="text-white flex-shrink-0" />}
          </button>

          {/* 2. U dziewczyny (GPS) */}
          <button
            type="button"
            onClick={() => handleOriginChange('girlfriend')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
              originType === 'girlfriend' || originType === 'gps'
                ? 'bg-pink-600/30 border-pink-500 text-white font-bold ring-1 ring-pink-500/50'
                : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg">❤️</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">U dziewczyny (GPS)</p>
              <p className="text-[10px] text-pink-300/80 truncate">
                Średnio 30 min dojazdu rano
              </p>
            </div>
            {(originType === 'girlfriend' || originType === 'gps') && <Check size={13} className="text-pink-400 flex-shrink-0" />}
          </button>

          {/* 3. Miasteczko Studenckie AGH */}
          <button
            type="button"
            onClick={() => handleOriginChange('miasteczko')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
              originType === 'miasteczko'
                ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold ring-1 ring-emerald-500/50'
                : 'bg-gray-800/80 hover:bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-lg">🏢</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">Miasteczko AGH</p>
              <p className="text-[10px] text-gray-500 truncate">Rostafińskiego / Reymonta</p>
            </div>
            {originType === 'miasteczko' && <Check size={13} className="text-emerald-400 flex-shrink-0" />}
          </button>
        </div>

        {/* Direct Test Links */}
        <div className="pt-2 border-t border-gray-800 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <a
            href={buildJakdojadeUrl({
              session: { start: new Date() },
              destinationCoords: AGH_CAMPUS_CENTER,
              destinationName: 'Główny Kampus AGH (al. Mickiewicza 30)',
              originCoords: (originType === 'girlfriend' || originType === 'gps')
                ? gpsLocation
                : (originType === 'home' ? MOGILSKA_HOME.coords : PRESET_ORIGINS.miasteczko.coords),
              originName: (originType === 'girlfriend' || originType === 'gps')
                ? 'U dziewczyny (Lokalizacja GPS)'
                : (originType === 'home' ? 'ul. Mogilska 23, Kraków' : 'Miasteczko Studenckie AGH'),
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-md transition-all border border-emerald-500/30"
          >
            <Bus size={14} />
            <span>Przetestuj w Jakdojadę</span>
            <ExternalLink size={11} className="opacity-80 ml-0.5" />
          </a>

          <a
            href={buildGoogleMapsUrl({
              destinationCoords: AGH_CAMPUS_CENTER,
              destinationName: 'AGH Kraków',
              originCoords: (originType === 'girlfriend' || originType === 'gps')
                ? gpsLocation
                : (originType === 'home' ? MOGILSKA_HOME.coords : PRESET_ORIGINS.miasteczko.coords),
              travelMode: settings.transportMode || 'transit',
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 text-white text-xs font-bold shadow-md transition-all border border-blue-500/30"
          >
            <Navigation size={14} />
            <span>Przetestuj w Google Maps</span>
            <ExternalLink size={11} className="opacity-80 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
