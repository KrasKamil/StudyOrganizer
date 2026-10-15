import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  ExternalLink, Video, Users, PhoneCall, Copy, Check, Plus, Edit3,
  Calendar, Clock, ShieldCheck, Sparkles, MessageSquare, ChevronRight,
  Radio, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function TeamsWidget({ currentCourseId = null, compact = false }) {
  const { courses, sessions, updateCourse, setSelectedCourseId } = useData();

  const [selectedCourseId, setLocalSelectedCourseId] = useState(null);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'upcoming' | 'all'
  const [copiedLink, setCopiedLink] = useState(null);
  const [editingUrl, setEditingUrl] = useState(false);
  const [teamsInput, setTeamsInput] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  // Set default selection based on currentCourseId or first course with Teams
  useEffect(() => {
    if (currentCourseId) {
      setLocalSelectedCourseId(currentCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      const withTeams = courses.find((c) => c.teamsUrl);
      setLocalSelectedCourseId(withTeams ? withTeams.id : courses[0].id);
    }
  }, [currentCourseId, courses]);

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (activeCourse) {
      setTeamsInput(activeCourse.teamsUrl || '');
      setEditingUrl(false);
    }
  }, [activeCourse]);

  // General university / rocznik Teams channels
  const generalTeamsChannels = useMemo(() => [
    {
      id: 'gen-teams-all',
      name: 'Teleinformatyka 25/26 - Ogólny',
      desc: 'Główny zespół rocznikowy do ogłoszeń i zebrań',
      icon: '🏛️',
      type: 'general',
      url: 'https://teams.microsoft.com',
    },
    {
      id: 'gen-teams-consult',
      name: 'Dyżury i Konsultacje Prowadzących',
      desc: 'Wirtualne pokoje konsultacyjne katedry',
      icon: '👨‍🏫',
      type: 'consultation',
      url: 'https://teams.microsoft.com',
    },
    {
      id: 'gen-teams-study',
      name: 'Grupa do nauki i projektów',
      desc: 'Wspólne call-e rocznikowe przed kolosami',
      icon: '💡',
      type: 'study',
      url: 'https://teams.microsoft.com',
    },
  ], []);

  // Upcoming online / Teams sessions from the calendar
  const upcomingOnlineSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => {
        const d = s.start?.toDate?.() || new Date(s.start || 0);
        return d >= now && (s.isOnline || s.teamsLink || (s.location && /teams|zdaln/i.test(s.location)));
      })
      .slice(0, 5);
  }, [sessions]);

  const handleCopy = (url, key) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSaveTeamsUrl = async () => {
    if (!activeCourse) return;
    setSavingUrl(true);
    try {
      await updateCourse(activeCourse.id, {
        teamsUrl: teamsInput.trim() || null,
      });
      setEditingUrl(false);
    } catch (err) {
      console.warn('Błąd zapisu Teams URL:', err);
    } finally {
      setSavingUrl(false);
    }
  };

  const openTeamsLink = (url) => {
    if (!url) {
      window.open('https://teams.microsoft.com', '_blank', 'noopener,noreferrer');
      return;
    }
    // If it's a web link, open in browser. Also supports direct desktop app protocol
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const coursesWithTeamsCount = courses.filter((c) => c.teamsUrl).length;

  return (
    <div className="rounded-2xl border border-[#6264A7]/40 bg-[#1F1F24] text-gray-200 overflow-hidden shadow-2xl flex flex-col font-sans transition-all">
      {/* ── TEAMS HEADER ── */}
      <div className="bg-[#292932] px-4 py-3 border-b border-[#3E3E4A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4B53BC] to-[#6264A7] flex items-center justify-center font-black text-white text-lg shadow-inner flex-shrink-0 group hover:scale-105 transition-all">
            T
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-sm truncate">
                Microsoft Teams • AGH
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4B53BC]/30 text-indigo-300 border border-[#6264A7]/50 font-semibold">
                Oficjalne
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#A6A6B8]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#92C353] animate-pulse" />
                <span>Konto uczelniane AGH</span>
              </span>
              <span>•</span>
              <span className="truncate">{coursesWithTeamsCount}/{courses.length} podpiętych zespołów</span>
            </div>
          </div>
        </div>

        {/* Tab switchers & open Teams button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#18181C] p-0.5 rounded-lg border border-[#3E3E4A] flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'rooms'
                  ? 'bg-[#6264A7] text-white shadow'
                  : 'text-[#A6A6B8] hover:text-white'
              }`}
            >
              <Video size={12} />
              <span>Zespoły</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 relative ${
                activeTab === 'upcoming'
                  ? 'bg-[#6264A7] text-white shadow'
                  : 'text-[#A6A6B8] hover:text-white'
              }`}
            >
              <Clock size={12} />
              <span>Najbliższe</span>
              {upcomingOnlineSessions.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'all'
                  ? 'bg-[#6264A7] text-white shadow'
                  : 'text-[#A6A6B8] hover:text-white'
              }`}
            >
              <Layers size={12} />
              <span>Katalog</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openTeamsLink('https://teams.microsoft.com')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-semibold shadow transition-all hover:scale-[1.02]"
            title="Otwórz aplikację lub wersję webową Microsoft Teams"
          >
            <span>Otwórz Teams</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── TAB 1: POKOJE PRZEDMIOTÓW (ROOMS & CHANNELS) ── */}
      {activeTab === 'rooms' && (
        <div className="flex flex-col md:flex-row min-h-[400px]">
          {/* Left Course List Sidebar */}
          <div className="w-full md:w-64 bg-[#292932] p-3 border-r border-[#3E3E4A] flex flex-col justify-between space-y-3">
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#A6A6B8] px-2 mb-1.5">
                  <span>PRZEDMIOTY ({courses.length})</span>
                </div>
                <div className="space-y-1">
                  {courses.map((c) => {
                    const isSelected = c.id === selectedCourseId;
                    const hasLink = Boolean(c.teamsUrl);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setLocalSelectedCourseId(c.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${
                          isSelected
                            ? 'bg-[#3E3E4A] text-white font-semibold ring-1 ring-[#6264A7]'
                            : 'text-[#A6A6B8] hover:bg-[#34343E] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                        {hasLink ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Link do Teams aktywny" />
                        ) : (
                          <span className="text-[10px] text-gray-500 flex-shrink-0">Brak</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* General channels */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#A6A6B8] px-2 mb-1.5">
                  <span>ZESPOŁY OGÓLNE</span>
                </div>
                <div className="space-y-1">
                  {generalTeamsChannels.map((gen) => (
                    <button
                      key={gen.id}
                      type="button"
                      onClick={() => openTeamsLink(gen.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#A6A6B8] hover:bg-[#34343E] hover:text-white transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{gen.icon}</span>
                        <span className="truncate">{gen.name}</span>
                      </div>
                      <ExternalLink size={11} className="text-gray-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="pt-2 border-t border-[#3E3E4A] text-[10px] text-[#A6A6B8] flex items-center justify-between">
              <span>Wszystkie spotkania z @student.agh.edu.pl</span>
            </div>
          </div>

          {/* Right Main Panel: Selected Course Meeting Hub */}
          <div className="flex-1 bg-[#1F1F24] p-5 flex flex-col justify-between space-y-4">
            {activeCourse ? (
              <div className="space-y-4">
                {/* Course Banner */}
                <div className="bg-[#292932] border border-[#3E3E4A] rounded-xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activeCourse.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white">
                            {activeCourse.name}
                          </h4>
                          {activeCourse.teamsUrl && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> Podłączone
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#A6A6B8] mt-0.5">
                          Pokój wykładów zdalnych, laboratoriów i konsultacji w MS Teams
                        </p>
                      </div>
                    </div>

                    {/* Join / Launch button */}
                    <div className="flex items-center gap-2">
                      {activeCourse.teamsUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeCourse.teamsUrl, 'active')}
                            className="px-2.5 py-2 rounded-lg bg-[#34343E] hover:bg-[#3E3E4A] text-[#A6A6B8] hover:text-white text-xs font-medium transition-all"
                            title="Kopiuj bezpośredni link do spotkania"
                          >
                            {copiedLink === 'active' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openTeamsLink(activeCourse.teamsUrl)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#4B53BC] to-[#6264A7] hover:from-[#3E45A0] hover:to-[#525492] text-white text-xs font-bold shadow-lg shadow-[#6264A7]/30 transition-all hover:scale-105"
                          >
                            <PhoneCall size={14} />
                            <span>Dołącz do spotkania</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingUrl(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#6264A7] text-indigo-300 hover:bg-[#6264A7]/20 text-xs font-medium transition-all"
                        >
                          <Plus size={13} />
                          <span>Wklej link Teams</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Edit URL Bar */}
                  <div className="mt-4 pt-3 border-t border-[#3E3E4A]">
                    {editingUrl ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={teamsInput}
                          onChange={(e) => setTeamsInput(e.target.value)}
                          placeholder="https://teams.microsoft.com/l/meetup-join/..."
                          className="flex-1 bg-[#18181C] border border-[#6264A7] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveTeamsUrl}
                          disabled={savingUrl}
                          className="px-3 py-1.5 rounded-lg bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {savingUrl ? 'Zapisuję...' : 'Zapisz'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUrl(false)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white text-xs"
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-[#A6A6B8]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] font-semibold text-gray-400">Link Teams:</span>
                          <span className="truncate max-w-xs text-gray-300 font-mono text-[11px]">
                            {activeCourse.teamsUrl || 'Brak skonfigurowanego linku'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingUrl(true)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                        >
                          <Edit3 size={11} />
                          <span>Zmień link</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => openTeamsLink(activeCourse.teamsUrl || 'https://teams.microsoft.com')}
                    className="p-3 rounded-xl bg-[#292932] border border-[#3E3E4A] hover:border-[#6264A7] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">🎥</span>
                      <ChevronRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h5 className="text-xs font-bold text-white">Wykład Zdalny</h5>
                    <p className="text-[11px] text-[#A6A6B8] mt-0.5">Dołącz do transmisji z wykładu na Teams</p>
                  </div>

                  <div
                    onClick={() => openTeamsLink('https://teams.microsoft.com')}
                    className="p-3 rounded-xl bg-[#292932] border border-[#3E3E4A] hover:border-[#6264A7] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">💬</span>
                      <ChevronRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h5 className="text-xs font-bold text-white">Czat i Pliki Przedmiotu</h5>
                    <p className="text-[11px] text-[#A6A6B8] mt-0.5">Otwórz wątki dyskusyjne zespołu w Teams</p>
                  </div>

                  <div
                    onClick={() => {
                      if (setSelectedCourseId) setSelectedCourseId(activeCourse.id);
                    }}
                    className="p-3 rounded-xl bg-[#292932] border border-[#3E3E4A] hover:border-indigo-500 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">📅</span>
                      <ChevronRight size={13} className="text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h5 className="text-xs font-bold text-white">Plan tego przedmiotu</h5>
                    <p className="text-[11px] text-[#A6A6B8] mt-0.5">Zobacz wszystkie terminy w kalendarzu</p>
                  </div>
                </div>

                {/* Helpful Tip */}
                <div className="p-3 rounded-xl bg-[#6264A7]/10 border border-[#6264A7]/30 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-[#A6A6B8] flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#C5C5D8]">
                    <span className="font-semibold text-white">Wskazówka:</span> Jeśli prowadzący podaje link do Teams w opisie zajęć w USOS, aplikacja automatycznie podświetla przycisk dołączenia 15 minut przed rozpoczęciem zajęć.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                Wybierz przedmiot z listy po lewej
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: NAJBLIŻSZE SPOTKANIA ZDALNE (UPCOMING) ── */}
      {activeTab === 'upcoming' && (
        <div className="p-5 space-y-4 min-h-[380px]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A6A6B8] flex items-center gap-1.5">
              <span>📅</span> Najbliższe zajęcia zdalne / z linkiem do spotkania
            </h4>
            <span className="text-xs text-[#A6A6B8]">{upcomingOnlineSessions.length} zaplanowanych spotkań</span>
          </div>

          {upcomingOnlineSessions.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingOnlineSessions.map((s) => {
                const start = s.start?.toDate?.() || new Date(s.start);
                const assignedCourse = courses.find((c) => c.id === s.courseId);
                const joinUrl = s.teamsLink || assignedCourse?.teamsUrl;

                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-[#292932] border border-[#3E3E4A] hover:border-[#6264A7] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: assignedCourse?.color || '#6264A7' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-white text-xs sm:text-sm">
                            {s.title}
                          </h5>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
                            ZDALNIE
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#A6A6B8] mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{format(start, 'EEEE, d MMMM', { locale: pl })}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{format(start, 'HH:mm')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {joinUrl ? (
                        <button
                          type="button"
                          onClick={() => openTeamsLink(joinUrl)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-bold transition-all shadow"
                        >
                          <PhoneCall size={12} />
                          <span>Dołącz</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">Brak linku</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500 text-xs">
              Brak nadchodzących zajęć oznaczonych jako zdalne w kalendarzu.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: KATALOG WSZYSTKICH PRZEDMIOTÓW (ALL) ── */}
      {activeTab === 'all' && (
        <div className="p-5 space-y-3 min-h-[380px]">
          <div className="text-xs text-[#A6A6B8]">
            Szybki podgląd wszystkich zespołów Microsoft Teams dla Twoich przedmiotów:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-[#292932] border border-[#3E3E4A] hover:border-[#6264A7] transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{c.name}</h5>
                    <span className="text-[11px] text-[#A6A6B8]">
                      {c.teamsUrl ? 'Z linkiem do zespołu' : 'Brak linku'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {c.teamsUrl ? (
                    <button
                      type="button"
                      onClick={() => openTeamsLink(c.teamsUrl)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#6264A7] hover:bg-[#525492] text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <ExternalLink size={11} />
                      <span>Teams</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSelectedCourseId(c.id);
                        setActiveTab('rooms');
                        setEditingUrl(true);
                      }}
                      className="px-2 py-1 rounded border border-dashed border-gray-600 text-gray-400 hover:text-white text-[11px]"
                    >
                      + Dodaj
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
