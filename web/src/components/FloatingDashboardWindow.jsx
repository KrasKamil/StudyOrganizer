import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import {
  ExternalLink, Minimize2, Maximize2, X, RefreshCw, Copy, Check,
  ChevronDown, Video, GraduationCap, Radio, ShieldCheck, Sparkles,
  ArrowRight, Globe, Lock, Layers, PhoneCall, BookOpen, AlertCircle,
  MessageSquare, UserCheck, Monitor
} from 'lucide-react';
import { getAllCourseUpelLinks } from '../utils/courseMatcher';
import DiscordWidget from './DiscordWidget';

export default function FloatingDashboardWindow() {
  const {
    courses,
    floatingWindow,
    setFloatingWindow,
    closeFloatingDashboard,
    selectedCourseId,
  } = useData();

  // All React Hooks must be declared unconditionally at the top level
  const [activeService, setActiveService] = useState('teams'); // 'teams' | 'upel' | 'discord'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Initialize service & course when floatingWindow state changes
  useEffect(() => {
    if (floatingWindow?.service) {
      setActiveService(floatingWindow.service);
    }
    const cId = floatingWindow?.courseId || selectedCourseId;
    if (cId) {
      const found = courses.find((c) => c.id === cId);
      if (found) setSelectedCourse(found);
    } else if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0]);
    }
  }, [floatingWindow, courses, selectedCourseId]);

  // Compute target URL based on selected service and course
  useEffect(() => {
    if (floatingWindow?.customUrl) {
      setUrlInput(floatingWindow.customUrl);
      setIframeUrl(floatingWindow.customUrl);
      return;
    }

    let target = '';
    if (activeService === 'teams') {
      target = selectedCourse?.teamsUrl || 'https://teams.microsoft.com';
    } else if (activeService === 'upel') {
      target =
        selectedCourse?.upelWykUrl ||
        selectedCourse?.upelLabUrl ||
        selectedCourse?.upelProjUrl ||
        selectedCourse?.upelUrl ||
        'https://upel.agh.edu.pl';
    } else if (activeService === 'discord') {
      target = selectedCourse?.discordUrl || localStorage.getItem('discordServerUrl') || 'discord://';
    }

    setUrlInput(target);
    setIframeUrl(target);
  }, [activeService, selectedCourse, floatingWindow?.customUrl]);

  // Upel links for currently selected course
  const upelLinks = useMemo(() => {
    return getAllCourseUpelLinks(selectedCourse);
  }, [selectedCourse]);

  const handleApplyUrl = (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;
    let u = urlInput.trim();
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://' + u;
    }
    setUrlInput(u);
    setIframeUrl(u);
    setIframeKey((k) => k + 1);
  };

  const handleCopy = () => {
    if (!urlInput) return;
    navigator.clipboard.writeText(urlInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Opens the real service in a dedicated native Popout / Picture-in-Picture style window.
   * This cleanly bypasses all X-Frame-Options / CSP restrictions of Microsoft and Moodle,
   * allowing full login with @student.agh.edu.pl credentials!
   */
  const openPopoutNativeWindow = (url = iframeUrl) => {
    const width = 1100;
    const height = 800;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const winFeatures = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`;
    window.open(url || 'https://teams.microsoft.com', 'RealDashboardPopout', winFeatures);
  };

  // Open native app protocol if supported
  const openTeamsApp = (url) => {
    if (url && url.includes('teams.microsoft.com')) {
      const appUrl = url.replace(/^https?:\/\/teams\.microsoft\.com/i, 'msteams://');
      window.open(appUrl, '_blank');
    } else {
      window.open('msteams://', '_blank');
    }
  };

  // Safe condition check AFTER all hooks
  if (!floatingWindow?.isOpen) return null;

  // If minimized, display a neat floating pill at bottom-right
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-bounce">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-600 text-white font-bold text-xs shadow-2xl ring-2 ring-white/30 hover:scale-105 transition-all"
        >
          <span>🪟</span>
          <span>Okno w oknie: {activeService === 'teams' ? 'MS Teams' : activeService === 'upel' ? 'UPeL AGH' : 'Discord'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-200 flex flex-col shadow-2xl rounded-2xl border border-gray-700 bg-gray-900/95 backdrop-blur-md overflow-hidden ${
        isMaximized
          ? 'top-0 sm:top-2 bottom-0 sm:bottom-2 left-0 sm:left-2 right-0 sm:right-2 rounded-none sm:rounded-2xl'
          : 'bottom-0 sm:bottom-4 left-0 sm:left-auto right-0 sm:right-4 w-full sm:w-[680px] md:w-[780px] lg:w-[860px] h-[88vh] sm:h-[640px] rounded-t-2xl sm:rounded-2xl'
      }`}
    >
      {/* ── WINDOW TITLE BAR (DRAGGABLE / CONTROLS) ── */}
      <div className="bg-gray-950 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between gap-3 select-none flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-400" onClick={closeFloatingDashboard} />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 cursor-pointer hover:bg-amber-400" onClick={() => setIsMinimized(true)} />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 cursor-pointer hover:bg-emerald-400" onClick={() => setIsMaximized(!isMaximized)} />
          </div>

          <div className="h-4 w-px bg-gray-800 mx-1" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🪟</span>
            <h3 className="font-bold text-xs sm:text-sm text-white truncate">
              Okno w oknie: {activeService === 'teams' ? 'Microsoft Teams • AGH' : activeService === 'discord' ? 'Discord • Teleinformatyka 2025/6' : 'UPeL AGH (Moodle)'}
            </h3>
          </div>
        </div>

        {/* Window action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => openPopoutNativeWindow()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow hover:scale-105"
            title="Wyciągnij jako osobne, niezależne małe okno przeglądarki z pełnym logowaniem"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Wyciągnij do okna (PiP)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Minimalizuj do paska"
          >
            <Minimize2 size={14} />
          </button>

          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title={isMaximized ? 'Przywróć mniejsze okno' : 'Powiększ na pełny ekran'}
          >
            <Maximize2 size={14} />
          </button>

          <button
            type="button"
            onClick={closeFloatingDashboard}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
            title="Zamknij okno"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── PLATFORM SWITCHER & COURSE SELECTOR ── */}
      <div className="bg-gray-900/90 px-4 py-2 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        {/* Service pills */}
        <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800 overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setActiveService('teams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeService === 'teams'
                ? 'bg-[#6264A7] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>MS Teams</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveService('upel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeService === 'upel'
                ? 'bg-orange-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🎓</span>
            <span>UPeL AGH</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveService('discord')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeService === 'discord'
                ? 'bg-[#5865F2] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🎮</span>
            <span>Discord</span>
          </button>
        </div>

        {/* Course Dropdown Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 hidden sm:inline">Przedmiot:</span>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const c = courses.find((item) => item.id === e.target.value);
              setSelectedCourse(c || null);
            }}
            className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 max-w-[200px] truncate"
          >
            <option value="">Wszystkie / Ogólny</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── BROWSER ADDRESS BAR & ACTION BUTTONS ── */}
      <div className="bg-gray-950/70 px-4 py-2 border-b border-gray-800 flex items-center justify-between gap-2 text-xs flex-shrink-0">
        <form onSubmit={handleApplyUrl} className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 flex-1 min-w-0 focus-within:border-indigo-500">
            <Lock size={12} className="text-emerald-400 flex-shrink-0" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Wpisz lub wklej adres URL..."
              className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none flex-1 font-mono truncate"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium text-xs transition-colors flex-shrink-0"
          >
            Przejdź
          </button>
        </form>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Odśwież"
          >
            <RefreshCw size={13} />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Kopiuj adres URL"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeService === 'discord') {
                if (urlInput && urlInput.startsWith('http')) {
                  window.open(urlInput, '_blank', 'noopener,noreferrer');
                } else {
                  window.open('discord://', '_blank');
                }
              } else {
                openPopoutNativeWindow(urlInput);
              }
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow"
          >
            <span>{activeService === 'discord' ? 'Otwórz w Discord' : 'Otwórz w oknie'}</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 relative bg-gray-950 overflow-y-auto flex flex-col">
        {/* ── TEAMS DEDICATED VIEW (Bypasses Microsoft CSP frame-ancestors block cleanly) ── */}
        {activeService === 'teams' ? (
          <div className="p-5 sm:p-7 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Authenticated Teams Hub Card */}
              <div className="p-5 rounded-2xl bg-[#292932] border border-[#6264A7]/50 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4B53BC] to-[#6264A7] flex items-center justify-center font-black text-white text-xl shadow-lg">
                      T
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">
                          Prawdziwy panel Microsoft Teams
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                          Konto AGH
                        </span>
                      </div>
                      <p className="text-xs text-[#A6A6B8] mt-0.5">
                        Oficjalne środowisko Teams z czatami, zespołami i spotkaniami dla Twojego konta @student.agh.edu.pl
                      </p>
                    </div>
                  </div>

                  {/* Big Popout Button */}
                  <button
                    type="button"
                    onClick={() => openPopoutNativeWindow(urlInput || 'https://teams.microsoft.com')}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#4B53BC] to-[#6264A7] hover:from-[#3E45A0] hover:to-[#525492] text-white font-bold text-sm shadow-xl shadow-[#6264A7]/30 transition-all hover:scale-105 flex-shrink-0"
                  >
                    <ExternalLink size={16} />
                    <span>Uruchom prawdziwy Teams w oknie (Zaloguj)</span>
                  </button>
                </div>

                {/* Explanation why native popout is used for Teams */}
                <div className="p-3.5 rounded-xl bg-[#1F1F24] border border-[#3E3E4A] flex items-start gap-2.5 text-xs text-[#C5C5D8]">
                  <ShieldCheck size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-white">Dlaczego okno podręczne (Popout PiP)?</span>
                    <br />
                    Microsoft stosuje rygorystyczne zabezpieczenie <em>Content Security Policy (frame-ancestors 'self')</em>, które uniemożliwia wprowadzanie haseł w ramkach iframe na zewnętrznych stronach.
                    Kliknięcie przycisku powyżej otwiera <strong>autentyczne, niezależne okno Teams</strong>, w którym logujesz się raz, a przeglądarka zapamiętuje Twoją sesję.
                  </div>
                </div>
              </div>

              {/* Course Action Grid */}
              {selectedCourse && (
                <div className="p-4 rounded-xl bg-[#292932] border border-[#3E3E4A] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedCourse.color }}
                      />
                      <span className="text-xs font-bold text-white">
                        Akcje dla: {selectedCourse.name}
                      </span>
                    </div>
                    {selectedCourse.teamsUrl && (
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Link do spotkania aktywny
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedCourse.teamsUrl ? (
                      <button
                        type="button"
                        onClick={() => openPopoutNativeWindow(selectedCourse.teamsUrl)}
                        className="p-3 rounded-xl bg-[#1F1F24] hover:bg-[#34343E] border border-[#6264A7] text-white font-bold text-xs flex items-center justify-between transition-all group"
                      >
                        <span className="flex items-center gap-2">
                          <PhoneCall size={14} className="text-emerald-400" />
                          <span>Dołącz do spotkania Teams</span>
                        </span>
                        <ExternalLink size={12} className="text-gray-400 group-hover:text-white" />
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-[#1F1F24] border border-[#3E3E4A] text-xs text-gray-500">
                        Brak dedykowanego linku do spotkania dla tego przedmiotu
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => openTeamsApp(selectedCourse.teamsUrl)}
                      className="p-3 rounded-xl bg-[#1F1F24] hover:bg-[#34343E] border border-[#3E3E4A] text-gray-200 hover:text-white font-semibold text-xs flex items-center justify-between transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <Monitor size={14} className="text-indigo-400" />
                        <span>Otwórz w aplikacji desktopowej Teams</span>
                      </span>
                      <ExternalLink size={12} className="text-gray-400 group-hover:text-white" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Links bottom */}
            <div className="pt-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>Wszystkie aplikacje Office 365 AGH dostępne z Twojego konta</span>
              <button
                type="button"
                onClick={() => openPopoutNativeWindow('https://teams.microsoft.com')}
                className="text-indigo-400 hover:underline font-bold"
              >
                Otwórz pełny portal Teams
              </button>
            </div>
          </div>
        ) : activeService === 'discord' ? (
          /* ── DISCORD DEDICATED VIEW (Authentic Channels & Messages Reader) ── */
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#313338]">
            <DiscordWidget
              currentCourseId={selectedCourse?.id || null}
              inFloatingWindow={true}
              onSelectCourse={(course) => setSelectedCourse(course)}
            />
          </div>
        ) : (
          /* ── UPEL & MOODLE WEB VIEW ── */
          <div className="flex-1 flex flex-col h-full">
            {/* Top Helper Banner */}
            <div className="p-3 bg-orange-950/40 border-b border-orange-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-orange-200">
                <span className="font-bold text-white">Logowanie SSO AGH:</span> Jeśli strona UPeL wymaga logowania przez Centralny Punkt Logowania AGH, kliknij przycisk obok:
              </div>
              <button
                type="button"
                onClick={() => openPopoutNativeWindow(urlInput || 'https://upel.agh.edu.pl')}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow transition-all hover:scale-105 flex-shrink-0"
              >
                <ExternalLink size={13} />
                <span>Uruchom w oknie logowania</span>
              </button>
            </div>

            {/* Embedded Iframe */}
            {iframeUrl ? (
              <div className="flex-1 w-full h-full relative bg-white">
                <iframe
                  key={iframeKey}
                  src={iframeUrl}
                  title="Real University Dashboard Web View"
                  className="w-full h-full border-0"
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                Wprowadź adres URL powyżej
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
