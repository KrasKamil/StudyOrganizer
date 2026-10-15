import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  Link2, CheckCircle2, Circle, ExternalLink,
  RefreshCw, AlertTriangle, Disc, Users, Calendar,
  Check, Save, MessageSquare
} from 'lucide-react';
import CommuteNotificationSettings from '../components/CommuteNotificationSettings';

function getDefaultChannelName(courseName = '') {
  const norm = courseName.toLowerCase();
  if (norm.includes('deep learning')) return '#deep-learning';
  if (norm.includes('bezpieczeństw') || norm.includes('5g')) return '#bezpieczenstwo-5g-6g';
  if (norm.includes('rut') || norm.includes('rout')) return '#routing-zewnetrzny-ip';
  if (norm.includes('angiel') || norm.includes('lektorat')) return '#angielski';
  if (norm.includes('metodyk')) return '#metodyki-projektow';
  const slug = norm
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `#${slug.slice(0, 24)}` : '#kanal';
}

// USOS iCal sync service
async function syncUsosIcal(icalUrl, uid, addSession, courses) {
  const res = await fetch(`/api/sync/usos?url=${encodeURIComponent(icalUrl)}&uid=${uid}`);
  if (!res.ok) throw new Error('Błąd synchronizacji');
  const data = await res.json();
  return data.count;
}

export default function SettingsView() {
  const { user, isDiscordConnected, isMicrosoftConnected, connectDiscord, connectMicrosoft, logout, googleToken } =
    useAuth();
  const {
    courses,
    updateCourse,
    syncLocalDataToFirestore,
    theme,
    setTheme,
    calendarDaysMode,
    setCalendarDaysMode,
    calendarCategoryFilter,
    setCalendarCategoryFilter,
    calendarCourseFilter,
    setCalendarCourseFilter,
  } = useData();

  const [usosUrl, setUsosUrl] = useState(() => localStorage.getItem('usosIcalUrl') || '');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState('');

  // Discord server & channel mapping state
  const [discordServerUrl, setDiscordServerUrl] = useState(() => localStorage.getItem('discordServerUrl') || '');
  const [channelMap, setChannelMap] = useState({});
  const [savingChannels, setSavingChannels] = useState(false);
  const [channelSaveSuccess, setChannelSaveSuccess] = useState(false);

  useEffect(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = {
        name: c.discordChannelName || getDefaultChannelName(c.name),
        url: c.discordUrl || '',
      };
    });
    setChannelMap(map);
  }, [courses]);

  const handleChannelChange = (courseId, field, value) => {
    setChannelMap((prev) => ({
      ...prev,
      [courseId]: {
        ...(prev[courseId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveSingleCourse = async (courseId) => {
    const item = channelMap[courseId];
    if (!item) return;
    try {
      await updateCourse(courseId, {
        discordChannelName: item.name?.trim() || null,
        discordUrl: item.url?.trim() || null,
        discordServerName: 'Teleinformatyka magisterka 2025/6',
      });
      setChannelSaveSuccess(true);
      setTimeout(() => setChannelSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Błąd zapisu kanału:', err);
    }
  };

  const handleSaveAllChannels = async () => {
    setSavingChannels(true);
    try {
      localStorage.setItem('discordServerUrl', discordServerUrl.trim());
      for (const c of courses) {
        const item = channelMap[c.id];
        if (item) {
          await updateCourse(c.id, {
            discordChannelName: item.name?.trim() || null,
            discordUrl: item.url?.trim() || null,
            discordServerName: 'Teleinformatyka magisterka 2025/6',
          });
        }
      }
      setChannelSaveSuccess(true);
      setTimeout(() => setChannelSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Błąd zapisu kanałów Discord:', err);
    } finally {
      setSavingChannels(false);
    }
  };

  const handleSaveUsosUrl = () => {
    localStorage.setItem('usosIcalUrl', usosUrl);
    setSyncMsg('✅ URL zapisany. Kliknij "Synchronizuj" by pobrać plan.');
  };

  const handleSyncUsos = async () => {
    if (!usosUrl) return;
    setSyncing(true);
    setSyncMsg('Synchronizuję z USOS...');
    try {
      // Cloud Function endpoint for iCal sync
      const res = await fetch('/__/functions/syncIcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: usosUrl, uid: user.uid }),
      });
      const data = await res.json();
      setSyncMsg(`✅ Zsynchronizowano ${data.count ?? 0} zajęć z USOS.`);
    } catch (err) {
      setSyncMsg(`❌ Błąd: ${err.message}`);
    }
    setSyncing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl w-full">
      <h1 className="text-xl font-bold text-white mb-5">Ustawienia & Preferencje</h1>

      {/* ── WYGLĄD I PREFERENCJE PLANU ZAJĘĆ ── */}
      <Section title="🎨 Wygląd & Filtry Planu Zajęć">
        <div className="space-y-4">
          {/* Motyw aplikacji */}
          <div className="p-3.5 rounded-xl bg-gray-850/60 border border-gray-800 space-y-2.5">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>{theme === 'light' ? '☀️' : '🌙'}</span>
                <span>Motyw aplikacji</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Tryb jasny oferuje minimalistyczny, jasny wygląd o wysokim kontraście i czytelności.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white'
                }`}
              >
                <span>🌙</span>
                <span>Tryb ciemny (Dark)</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white'
                }`}
              >
                <span>☀️</span>
                <span>Tryb jasny (Minimalistyczny)</span>
              </button>
            </div>
          </div>

          {/* Dni w planie zajęć */}
          <div className="p-3.5 rounded-xl bg-gray-850/60 border border-gray-800 space-y-2.5">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>📅</span>
                <span>Dni w planie tygodniowym</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                5 dni (Pon–Pt) zapewnia maksymalną szerokość i czytelność na laptopach.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCalendarDaysMode('workdays')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                  calendarDaysMode === 'workdays'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-bold ring-1 ring-white/20 shadow-sm'
                    : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white font-medium'
                }`}
              >
                <span className="text-sm mb-0.5">💼</span>
                <span>5 dni (Pn – Pt)</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Dni robocze • Zalecany</span>
              </button>
              <button
                type="button"
                onClick={() => setCalendarDaysMode('full')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                  calendarDaysMode === 'full'
                    ? 'bg-zinc-800 border-zinc-500 text-white font-bold ring-1 ring-white/20 shadow-sm'
                    : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white font-medium'
                }`}
              >
                <span className="text-sm mb-0.5">🗓️</span>
                <span>7 dni (+Weekend)</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Pełny tydzień (Pn – Nd)</span>
              </button>
            </div>
          </div>

          {/* Kategorie wyświetlanych wydarzeń */}
          <div className="p-3.5 rounded-xl bg-gray-850/60 border border-gray-800 space-y-2.5">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>🗂️</span>
                <span>Kategorie wydarzeń w planie</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Wybierz rodzaj wydarzeń wyświetlanych w kalendarzu.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Wszystkie', desc: 'Zajęcia + prywatne' },
                { id: 'academic', label: '🎓 Tylko zajęcia', desc: 'Dydaktyka AGH' },
                { id: 'personal', label: '🗓️ Prywatne', desc: 'Tylko osobiste' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCalendarCategoryFilter(f.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all ${
                    calendarCategoryFilter === f.id
                      ? 'bg-zinc-800 border-zinc-500 text-white font-bold ring-1 ring-white/20 shadow-sm'
                      : 'bg-gray-850 hover:bg-gray-800 border-gray-750 text-gray-400 hover:text-white font-medium'
                  }`}
                >
                  <span className="font-bold">{f.label}</span>
                  <span className="text-[10px] text-gray-400 mt-0.5 truncate">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Domyślny filtr przedmiotu */}
          {courses.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gray-850/60 border border-gray-800 space-y-2.5">
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🎯</span>
                  <span>Filtrowanie według przedmiotu w planie</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Pozwala skupić się wyłącznie na wybranym przedmiocie lub widzieć wszystkie naraz.
                </p>
              </div>
              <select
                value={calendarCourseFilter}
                onChange={(e) => setCalendarCourseFilter(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-750 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Wszystkie przedmioty (brak filtra)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* Profile */}
      <Section title="Konto Google">
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img src={user.photoURL} className="w-10 h-10 rounded-full" alt="avatar" />
          )}
          <div>
            <p className="text-sm font-medium text-white">{user?.displayName}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <StatusBadge connected={true} label="Połączono" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sesja jest trwała — nie musisz się ponownie logować.
        </p>
      </Section>

      {/* USOS iCal */}
      <Section title="📅 USOS AGH — Subskrypcja Kalendarza">
        <p className="text-xs text-gray-400 mb-3">
          W USOSie: <span className="text-white">Plan zajęć → Eksportuj → Subskrybuj kalendarz</span>.
          Skopiuj URL i wklej poniżej.
        </p>
        <div className="flex gap-2 mb-2">
          <input
            value={usosUrl}
            onChange={(e) => setUsosUrl(e.target.value)}
            placeholder="https://usosapps.agh.edu.pl/...ical..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSaveUsosUrl}
            className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
          >
            Zapisz
          </button>
        </div>
        <button
          onClick={handleSyncUsos}
          disabled={syncing || !usosUrl}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Synchronizuj teraz
        </button>
        {syncMsg && <p className="text-xs mt-2 text-gray-400">{syncMsg}</p>}
      </Section>

      {/* Google Calendar */}
      <Section title="🗓️ Google Calendar (w tym zajęcia z USOS)">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-white">Twój Główny Kalendarz</p>
            <p className="text-xs text-gray-400">
              Skoro masz już podpięty kalendarz USOS do Google Calendar, aplikacja automatycznie zaciąga Twoje terminy z konta Google.
            </p>
          </div>
          <StatusBadge connected={!!googleToken} label={googleToken ? "Aktywne" : "Zalogowany"} />
        </div>
        <p className="text-xs text-gray-500">
          Wszystkie zajęcia, zmiany sal i powiadomienia o dojeździe bazują na Twoich wydarzeniach z Google.
        </p>
      </Section>

      {/* ── POWIADOMIENIA PUSH & CZAS DOJAZDU ── */}
      <Section title="🔔 Powiadomienia na telefonie & Czas Dojazdu">
        <CommuteNotificationSettings />
      </Section>

      {/* ── CLOUD FIRESTORE SYNC: PC <-> Mobile ── */}
      <Section title="☁️ Synchronizacja z Chmurą (PC ↔ Telefon)">
        <div className="p-4 rounded-xl bg-gray-850/80 border border-gray-750 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>🔄</span> Synchronizuj oznaczenia i notatki z chmurą
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Wysyła wszystkie oznaczenia (np. „Brak zajęć”, żółte uwagi z wykrzyknikiem, zadania i edycje) do Twojego konta Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setCloudSyncing(true);
                try {
                  await syncLocalDataToFirestore?.();
                  setCloudSyncMsg('✅ Dane zostały pomyślnie wysłane do chmury! Odśwież aplikację na telefonie.');
                } catch {
                  setCloudSyncMsg('❌ Błąd wysyłania do chmury. Upewnij się, że jesteś zalogowany.');
                } finally {
                  setCloudSyncing(false);
                  setTimeout(() => setCloudSyncMsg(''), 6000);
                }
              }}
              disabled={cloudSyncing}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-sm flex items-center gap-2 flex-shrink-0"
            >
              <RefreshCw size={14} className={cloudSyncing ? 'animate-spin' : ''} />
              <span>{cloudSyncing ? 'Wysyłanie do chmury...' : 'Wyślij dane do chmury'}</span>
            </button>
          </div>
          {cloudSyncMsg && (
            <p className="text-xs text-emerald-300 font-semibold bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-700/60 animate-pulse">
              {cloudSyncMsg}
            </p>
          )}
        </div>
      </Section>

      {/* ── DISCORD: Teleinformatyka magisterka 2025/6 ── */}
      <Section title="🎮 Discord — Serwer „Teleinformatyka magisterka 2025/6”">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#5865F2]/20 via-indigo-950/40 to-gray-900 border border-[#5865F2]/40 space-y-3 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎮</span>
                <p className="text-sm font-bold text-white">Teleinformatyka magisterka 2025/6</p>
                <StatusBadge connected={true} label="Aktywny" />
              </div>
              <p className="text-xs text-indigo-300/80 mt-1">
                Połączone kanały dyskusyjne, pliki i ogłoszenia od starosty dla Twoich przedmiotów
              </p>
            </div>

            {discordServerUrl ? (
              <a
                href={discordServerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold shadow transition-all hover:scale-[1.02] flex-shrink-0"
              >
                <ExternalLink size={13} />
                <span>Otwórz serwer w Discord</span>
              </a>
            ) : null}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-300 mb-1">
              Link do serwera lub zaproszenie (opcjonalnie):
            </label>
            <div className="flex gap-2">
              <input
                value={discordServerUrl}
                onChange={(e) => setDiscordServerUrl(e.target.value)}
                placeholder="https://discord.com/channels/... lub link z zaproszeniem"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('discordServerUrl', discordServerUrl.trim());
                  setChannelSaveSuccess(true);
                  setTimeout(() => setChannelSaveSuccess(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-indigo-300 border border-gray-700 text-xs font-semibold"
              >
                Zapisz link
              </button>
            </div>
          </div>
        </div>

        {/* Channel mapping per course */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span> Przypisanie kanałów do przedmiotów ({courses.length})
            </h3>
            {channelSaveSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
                <Check size={13} /> Zapisano przypisania!
              </span>
            )}
          </div>

          {courses.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">
              Brak utworzonych przedmiotów. Dodaj przedmioty w panelu bocznym lub kalendarzu, aby przypisać im kanały Discord.
            </p>
          ) : (
            <div className="space-y-2.5">
              {courses.map((c) => {
                const item = channelMap[c.id] || { name: getDefaultChannelName(c.name), url: '' };
                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-gray-850 border border-gray-750 hover:border-gray-700 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: c.color || '#3B82F6' }}
                        />
                        <span className="text-xs font-bold text-white truncate">{c.name}</span>
                        {c.type && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 uppercase font-semibold">
                            {c.type}
                          </span>
                        )}
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex-shrink-0"
                          title="Przetestuj otwarcie kanału w Discord"
                        >
                          <ExternalLink size={11} />
                          <span>Otwórz</span>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Nazwa kanału na Discordzie:</label>
                        <input
                          value={item.name}
                          onChange={(e) => handleChannelChange(c.id, 'name', e.target.value)}
                          placeholder="#nazwa-kanału"
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Link do kanału (URL):</label>
                        <input
                          value={item.url}
                          onChange={(e) => handleChannelChange(c.id, 'url', e.target.value)}
                          placeholder="https://discord.com/channels/... lub discord://..."
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[10px] text-gray-500 max-w-sm">
                  💡 <strong>Jak skopiować link do kanału?</strong> W Discordzie kliknij prawym przyciskiem myszy na kanał przedmiotu i wybierz <em>Kopiuj link do kanału</em>.
                </p>
                <button
                  type="button"
                  onClick={handleSaveAllChannels}
                  disabled={savingChannels}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                >
                  <Save size={13} />
                  <span>{savingChannels ? 'Zapisuję...' : 'Zapisz wszystkie kanały'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Konto">
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg border border-red-800 text-red-400 text-sm hover:bg-red-900/20 transition-colors"
        >
          Wyloguj się
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6 pb-6 border-b border-gray-800 last:border-0">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function StatusBadge({ connected, label }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
        connected
          ? 'bg-green-900/40 text-green-400 border border-green-800'
          : 'bg-gray-800 text-gray-500 border border-gray-700'
      }`}
    >
      {connected ? <CheckCircle2 size={11} /> : <Circle size={11} />}
      {label}
    </span>
  );
}
