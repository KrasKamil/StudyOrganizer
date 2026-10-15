import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInMinutes, differenceInHours } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CalendarDays, Clock, Plus, Square,
  ArrowRight, Zap, Video, ExternalLink, MapPin, Navigation, AlertTriangle, Bus,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import ClassCard, { TYPE_CONFIG } from '../components/ClassCard';
import { detectType } from '../components/WeekGridView';
import { parseAghLocation, isSessionOnline } from '../utils/aghCampus';
import { getEffectiveUpelLink } from '../utils/courseMatcher';
import { buildJakdojadeUrl, calculateDeparturePlan, MOGILSKA_HOME } from '../utils/transit';
import AddSessionModal from '../components/AddSessionModal';
import AddTaskModal from '../components/AddTaskModal';
import SessionDetailModal from '../components/SessionDetailModal';
import TransitAssistant from '../components/TransitAssistant';

export default function TodayView() {
  const {
    sessions,
    tasks,
    courses,
    todaySessions,
    toggleTask,
    syncGoogleCalendar,
    syncingGoogle,
  } = useData();
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);
  const [modalInitialEdit, setModalInitialEdit] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenSessionModal = (session, editMode = false) => {
    setSelectedSessionForModal(session);
    setModalInitialEdit(editMode);
  };

  // Sessions with overrides already applied by DataContext
  const enrichedSessions = sessions;
  const activeTasks = tasks.filter((t) => !t.done);

  // Separate academic classes from personal/all-day events for Today's view
  const todayAcademicSessions = todaySessions.filter(
    (s) => s.category !== 'personal' && !s.isAllDay
  );
  const activeTodayAcademicSessions = todayAcademicSessions.filter(
    (s) => !s.isCancelled && !s.isConvertedToNote
  );
  const cancelledTodayAcademicSessions = todayAcademicSessions.filter(
    (s) => s.isCancelled && !s.isConvertedToNote
  );
  const todayPersonalEvents = todaySessions.filter(
    (s) => s.category === 'personal' || s.isAllDay
  );

  // Check if all active classes scheduled for today have already completed
  const allTodayClassesPassed = activeTodayAcademicSessions.length > 0 &&
    activeTodayAcademicSessions.every((s) => {
      const end = s.end?.toDate?.() || new Date(s.end);
      return end <= now;
    });

  // 1. Current academic session in progress today
  const currentOngoingSession = activeTodayAcademicSessions.find((s) => {
    const start = s.start?.toDate?.() || new Date(s.start);
    const end = s.end?.toDate?.() || new Date(s.end);
    return start <= now && end > now;
  });

  // 2. Next upcoming academic session today
  const upcomingActiveSession = activeTodayAcademicSessions.find((s) => {
    const start = s.start?.toDate?.() || new Date(s.start);
    return start > now;
  });

  // Hero session is strictly today's current or upcoming active academic class
  const heroSession = currentOngoingSession || upcomingActiveSession;

  let isOngoing = false;
  let isStartingSoon = false;
  let countdownLabel = '';
  let heroCourse = null;
  let heroEffectiveTeams = null;
  let heroEffectiveUpel = null;
  let heroAghLoc = null;
  let heroIsOnline = false;
  let heroTypeCfg = TYPE_CONFIG?.other || { badge: 'ZAJĘCIA', border: 'border-gray-600', bg: 'bg-gray-800', text: 'text-gray-300' };
  let heroStart = null;
  let heroEnd = null;

  if (heroSession) {
    heroStart = heroSession.start?.toDate?.() || new Date(heroSession.start);
    heroEnd = heroSession.end?.toDate?.() || new Date(heroSession.end);
    heroCourse = courses.find((c) => c.id === heroSession.courseId);
    heroEffectiveTeams = heroSession.teamsLink || heroCourse?.teamsUrl || null;
    heroEffectiveUpel = getEffectiveUpelLink(heroSession, heroCourse);
    heroAghLoc = parseAghLocation(heroSession.location, heroSession.description, heroSession.title);
    heroIsOnline = isSessionOnline(heroSession, heroAghLoc);

    const detected = detectType(heroSession.title, heroSession.description, heroSession.category);
    if (TYPE_CONFIG && TYPE_CONFIG[detected]) {
      heroTypeCfg = TYPE_CONFIG[detected];
    }

    if (heroStart <= now && heroEnd > now) {
      isOngoing = true;
      const leftMin = differenceInMinutes(heroEnd, now);
      countdownLabel = `jeszcze ${leftMin} min (do ${format(heroEnd, 'HH:mm')})`;
    } else {
      const diffMin = differenceInMinutes(heroStart, now);
      const diffHr = differenceInHours(heroStart, now);
      if (diffMin <= 45) {
        isStartingSoon = true;
        countdownLabel = diffMin <= 0 ? 'Za chwilę!' : `za ${diffMin} min (${format(heroStart, 'HH:mm')})`;
      } else {
        countdownLabel = `Dziś o ${format(heroStart, 'HH:mm')} (za ${diffHr}h ${diffMin % 60}m)`;
      }
    }
  }

  // Transit calculations for hero or upcoming on-site session (defaults to Mogilska 23, Kraków, 5. piętro)
  const heroDeparturePlan = useMemo(() => {
    if (!heroSession || heroIsOnline) return null;
    return calculateDeparturePlan({
      sessionStart: heroSession.start,
      travelMinutes: 20,
      bufferMinutes: 5,
      extraMinutes: MOGILSKA_HOME.floorBufferMinutes || 2,
      now,
    });
  }, [heroSession, heroIsOnline, now]);

  const heroJakdojadeUrl = useMemo(() => {
    if (!heroSession || heroIsOnline) return null;
    return buildJakdojadeUrl({
      session: heroSession,
      destinationCoords: heroAghLoc?.coords,
      destinationName: heroAghLoc?.building ? `AGH Budynek ${heroAghLoc.building}` : heroSession.location,
      originCoords: MOGILSKA_HOME.coords,
      originName: 'Mogilska 23, Kraków',
    });
  }, [heroSession, heroIsOnline, heroAghLoc]);

  // Find next upcoming onsite class today (if hero is online or past)
  const nextOnsiteSessionToday = useMemo(() => {
    return todayAcademicSessions.find((s) => {
      const agh = parseAghLocation(s.location, s.description, s.title);
      const end = s.end?.toDate?.() || new Date(s.end);
      return !s.isCancelled && !isSessionOnline(s, agh) && end > now;
    });
  }, [todayAcademicSessions, now]);

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-5 md:p-6 space-y-3 sm:space-y-4 flex flex-col h-full w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white capitalize truncate">
            {format(new Date(), 'EEEE, d MMMM', { locale: pl })}
          </h1>
          {heroSession ? (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {isOngoing ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>🟢 W tej chwili trwają zajęcia</span>
                </span>
              ) : isStartingSoon ? (
                <span className="text-amber-400 font-semibold">⚡ Za chwilę: {heroSession.title}</span>
              ) : (
                <span>Kolejne: <strong className="text-gray-200">{heroSession.title}</strong></span>
              )}
            </p>
          ) : allTodayClassesPassed ? (
            <p className="text-xs text-emerald-400 mt-0.5 font-medium flex items-center gap-1.5 truncate">
              <span>✅</span>
              <span>Wszystkie dzisiejsze zajęcia już się zakończyły — koniec na dziś!</span>
            </p>
          ) : (
            <p className="text-xs text-emerald-400 mt-0.5 font-medium truncate">
              {cancelledTodayAcademicSessions.length > 0 && activeTodayAcademicSessions.length === 0
                ? '🎉 Wszystkie dzisiejsze zajęcia zostały odwołane — masz wolne!'
                : '🎉 Brak zaplanowanych zajęć dydaktycznych na dziś — wolny dzień!'}
            </p>
          )}
        </div>

        {/* View toggle & Google sync */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={async () => {
              try {
                await syncGoogleCalendar(true);
              } catch (err) {
                console.error('Błąd odświeżania:', err);
              }
            }}
            disabled={syncingGoogle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-gray-750 disabled:opacity-50"
            title="Pobierz najnowsze zajęcia z Twojego Google Calendar"
          >
            <Clock size={13} className={syncingGoogle ? 'animate-spin text-blue-400' : ''} />
            <span className="hidden sm:inline">{syncingGoogle ? 'Pobieram...' : 'Odśwież kalendarz'}</span>
            <span className="sm:hidden">{syncingGoogle ? 'Pobieram...' : 'Synchronizuj'}</span>
          </button>
        </div>
      </div>

      {/* ── HERO BANNER: END OF DAY / TRWAJĄ TERAZ / NAJBLIŻSZE ZAJĘCIA ── */}
      {allTodayClassesPassed ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/25 via-gray-900 to-gray-900 p-5 sm:p-6 pb-6 sm:pb-7 md:p-6 md:pb-7 min-h-[145px] shadow-lg flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                <CheckCircle2 size={13} className="text-emerald-400" />
                DZIEŃ ZAJĘĆ ZAKOŃCZONY
              </span>
              <span className="text-xs text-gray-400 font-medium">
                Wszystkie dzisiejsze bloki ({activeTodayAcademicSessions.length}) już się odbyły
              </span>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white">
              To już wszystko na dziś — odpocznij!
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Wszystkie zaplanowane zajęcia na dzisiaj dobiegły końca. Możesz przejrzeć swoje notatki, zadania lub sprawdzić jutrzejszy plan w kalendarzu.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 pt-2 md:pt-1">
            <Link
              to="/calendar"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs border border-gray-700 transition-colors shadow-sm"
            >
              <CalendarDays size={14} className="text-blue-400" />
              <span>Zobacz plan w kalendarzu</span>
            </Link>
          </div>
        </div>
      ) : heroSession ? (
        <div
          onClick={() => handleOpenSessionModal(heroSession, false)}
          className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 sm:p-6 pb-6 sm:pb-7 md:p-6 md:pb-7 min-h-[145px] transition-all duration-200 group shadow-lg flex flex-col justify-between ${
            isOngoing
              ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/25 via-gray-900 to-gray-900 shadow-emerald-950/20 hover:border-emerald-500/70'
              : isStartingSoon
              ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/25 via-gray-900 to-gray-900 shadow-amber-950/15 hover:border-amber-500/70'
              : 'border-gray-750 bg-gradient-to-br from-gray-850/70 via-gray-900 to-gray-900 shadow-sm hover:border-gray-650'
          }`}
        >
          {/* Subtle background ambient glow */}
          <div
            className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none ${
              isOngoing ? 'bg-emerald-500' : isStartingSoon ? 'bg-amber-400' : 'bg-gray-400'
            }`}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6 py-0.5">
            {/* Left info column */}
            <div className="space-y-2.5 min-w-0 flex-1">
              {/* Status Pill & Course Type Badge */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {isOngoing ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    🟢 TRWAJĄ TERAZ
                  </span>
                ) : isStartingSoon ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                    <Zap size={13} className="text-amber-400 animate-bounce" />
                    ⚡ ZA CHWILĘ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-zinc-950 shadow-sm">
                    <Clock size={13} />
                    NAJBLIŻSZE ZAJĘCIA
                  </span>
                )}

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${heroTypeCfg.border} ${heroTypeCfg.bg} ${heroTypeCfg.text}`}>
                  {heroTypeCfg.badge}
                </span>

                {heroIsOnline ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-200 border border-gray-700 uppercase tracking-wider">
                    <Video size={11} /> Zdalnie
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-200 border border-gray-700 uppercase tracking-wider">
                    <MapPin size={11} /> Na miejscu
                  </span>
                )}

                <span className="text-xs text-gray-300 font-semibold">
                  {countdownLabel}
                </span>
              </div>

              {/* Title & Course Name */}
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white group-hover:text-gray-100 transition-colors line-clamp-2 break-words leading-tight">
                  {heroSession.title}
                </h3>
                {heroCourse && heroCourse.name !== heroSession.title && (
                  <p className="text-xs sm:text-sm text-gray-300 mt-0.5 font-semibold truncate">
                    {heroCourse.name}
                  </p>
                )}
              </div>

              {/* ⚠️ Minimalist Yellow Exclamation Icon Badge for notes / warnings */}
              {(heroSession.studentNotes || heroSession.topicsToSend) && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 font-semibold shadow-sm">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 animate-pulse" />
                  <span className="truncate">{heroSession.studentNotes || heroSession.topicsToSend}</span>
                </div>
              )}

              {/* Time & Location badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <span className="flex items-center gap-1.5 font-semibold text-white bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700/60 flex-shrink-0">
                  <Clock size={13} className="text-blue-400" />
                  {format(heroStart, 'HH:mm')} – {format(heroEnd, 'HH:mm')}
                </span>

                {heroIsOnline ? (
                  <span className="flex items-center gap-1.5 bg-indigo-950/60 text-indigo-200 px-2.5 py-1 rounded-lg border border-indigo-800/60 truncate min-w-0">
                    <Video size={13} className="text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{heroEffectiveTeams ? 'Spotkanie online (Teams)' : 'Zajęcia zdalne'}</span>
                  </span>
                ) : (heroAghLoc?.building || heroSession.location) ? (
                  <span className="flex items-center gap-1.5 bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700/60 truncate min-w-0 max-w-full">
                    <MapPin size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="truncate max-w-[190px] sm:max-w-xs">
                      {heroAghLoc?.displayText || heroSession.location || 'Kampus AGH'}
                      {heroAghLoc?.buildingDetails?.name ? ` • ${heroAghLoc.buildingDetails.name}` : ''}
                    </span>
                    {heroAghLoc?.mapUrl && (
                      <a
                        href={heroAghLoc.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-400 hover:text-blue-300 ml-0.5 inline-flex items-center gap-0.5 flex-shrink-0"
                        title="Otwórz mapę kampusu AGH"
                      >
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </span>
                ) : null}

                {/* Transit stop hint if onsite and known */}
                {/* Transit stop hint if onsite and known */}
                {!heroIsOnline && heroAghLoc?.buildingDetails?.transitStop && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-gray-400 bg-gray-800/60 px-2 py-1 rounded-lg border border-gray-750">
                    <span>🚌 Przystanek: {heroAghLoc.buildingDetails.transitStop}</span>
                  </span>
                )}

                {/* Departure time countdown for onsite class */}
                {!heroIsOnline && heroDeparturePlan && !isOngoing && (
                  <span className="flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-700/60 text-xs font-semibold">
                    <Clock size={12} className="text-emerald-400" />
                    <span>Wyjdź: <strong className="text-white font-bold">{heroDeparturePlan.departureTimeFormatted}</strong> ({heroDeparturePlan.statusText})</span>
                  </span>
                )}
              </div>
            </div>

            {/* Right actions column */}
            <div className="w-full md:w-auto grid grid-cols-2 sm:flex sm:flex-wrap md:flex-nowrap items-center gap-2 pt-3 md:pt-1 border-t md:border-t-0 border-gray-800/80 flex-shrink-0 md:self-center">
              {heroIsOnline ? (
                /* ONLINE: Default action is meeting link */
                heroEffectiveTeams ? (
                  <a
                    href={heroEffectiveTeams}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="col-span-2 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm transition-all"
                    title="Dołącz bezpośrednio do spotkania / wykładu w Microsoft Teams"
                  >
                    <Video size={13} />
                    <span>Dołącz do spotkania</span>
                    <ExternalLink size={11} className="opacity-90 ml-0.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSessionModal(heroSession, true);
                    }}
                    className="col-span-2 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition-colors"
                    title="Wprowadź link do spotkania online dla tych zajęć"
                  >
                    <Plus size={13} className="text-gray-400" />
                    <span>Dodaj link</span>
                  </button>
                )
              ) : (
                /* ONSITE: Default action is Jakdojadę & Google Maps directions */
                <>
                  {heroJakdojadeUrl && (
                    <a
                      href={heroJakdojadeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-emerald-400 hover:text-emerald-300 font-semibold text-xs rounded-xl shadow-xs transition-all border border-gray-700"
                      title="Otwórz Jakdojadę (zaplanowany przyjazd przed zajęciami)"
                    >
                      <Bus size={13} />
                      <span>Jakdojadę</span>
                      <ExternalLink size={10} className="opacity-90 ml-0.5" />
                    </a>
                  )}

                  {(heroAghLoc?.navigateUrl || heroAghLoc?.mapUrl) ? (
                    <a
                      href={heroAghLoc.navigateUrl || heroAghLoc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-200 hover:text-white font-semibold text-xs rounded-xl shadow-xs transition-all border border-gray-700"
                      title="Otwórz nawigację i wskazówki dojazdu w Google Maps"
                    >
                      <Navigation size={13} />
                      <span>Google Maps</span>
                      <ExternalLink size={10} className="opacity-90 ml-0.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSessionModal(heroSession, false);
                      }}
                      className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold rounded-xl border border-emerald-700/60 transition-colors"
                    >
                      <MapPin size={13} className="text-emerald-400" />
                      <span>Wskazówki</span>
                    </button>
                  )}

                  {/* Secondary Teams pill if on-site class also has Teams tasks/materials */}
                  {heroEffectiveTeams && (
                    <a
                      href={heroEffectiveTeams}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gray-800 hover:bg-gray-750 text-indigo-300 hover:text-white text-xs font-semibold rounded-xl border border-gray-700 transition-colors"
                      title="Zadania i materiały w Microsoft Teams"
                    >
                      <ExternalLink size={11} />
                      <span>Teams</span>
                    </a>
                  )}
                </>
              )}

              {/* Direct UPeL Button for Hero Class (automatically detects Wykład vs Laby) */}
              {heroEffectiveUpel && (
                <a
                  href={heroEffectiveUpel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-950/80 hover:bg-orange-900 text-orange-200 hover:text-white text-xs font-semibold rounded-xl border border-orange-700/80 transition-all shadow-sm"
                  title={`${heroEffectiveUpel.label} na platformie UPeL AGH`}
                >
                  <span>🎓</span>
                  <span className="truncate">{heroEffectiveUpel.label}</span>
                  <ExternalLink size={11} />
                </a>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenSessionModal(heroSession, false);
                }}
                className="col-span-1 sm:col-auto w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-750 text-gray-300 hover:text-white text-xs font-semibold rounded-xl border border-gray-750 transition-colors"
              >
                <span>Szczegóły</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── TRANSIT & DEPARTURE ASSISTANT (JAKDOJADĘ & GOOGLE MAPS) ── */}
      {heroSession && !heroIsOnline ? (
        <TransitAssistant session={heroSession} />
      ) : nextOnsiteSessionToday && (!heroSession || heroIsOnline) ? (
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
            <span>📍 Dojazd na najbliższe zajęcia stacjonarne dzisiaj ({nextOnsiteSessionToday.title})</span>
          </p>
          <TransitAssistant session={nextOnsiteSessionToday} />
        </div>
      ) : null}

      {/* ── SPLIT VIEW (DZIŚ) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Today's personal & all-day events pills (e.g. birthdays, private events) */}
          {todayPersonalEvents.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 shadow-sm">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🗓️ Wydarzenia prywatne i całodniowe ({todayPersonalEvents.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayPersonalEvents.map((pe) => (
                  <div
                    key={pe.id}
                    onClick={() => handleOpenSessionModal(pe, false)}
                    className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <span>🎉</span>
                    <span className="font-semibold truncate max-w-[200px]">{pe.title}</span>
                    {!pe.isAllDay && pe.start && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {format(pe.start?.toDate?.() || new Date(pe.start), 'HH:mm')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's academic classes */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <CalendarDays size={15} className="text-gray-400" />
                Zajęcia na dziś ({activeTodayAcademicSessions.length})
              </h2>
              <button
                onClick={() => setShowAddSession(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <Plus size={13} />
                <span>Dodaj zajęcia</span>
              </button>
            </div>

            {activeTodayAcademicSessions.length === 0 ? (
              <div className="text-center py-6 px-4 text-gray-400 text-sm bg-gray-900/40 rounded-xl border border-gray-800 space-y-1 shadow-sm">
                <p className="text-base font-bold text-white">
                  {cancelledTodayAcademicSessions.length > 0
                    ? '🎉 Dzisiejsze zajęcia zostały odwołane!'
                    : '🎉 Brak zajęć dydaktycznych na dziś'}
                </p>
                <p className="text-xs text-emerald-400">
                  {cancelledTodayAcademicSessions.length > 0
                    ? `Oznaczono ${cancelledTodayAcademicSessions.length} ${cancelledTodayAcademicSessions.length === 1 ? 'zajęcia jako odwołane (brak zajęć)' : 'zajęć jako odwołane'} — masz dziś wolne!`
                    : 'Brak zaplanowanych zajęć — wolny dzień!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTodayAcademicSessions.map((s, idx) => {
                  // Compute break before this session (from previous active session end)
                  let breakIndicator = null;
                  if (idx > 0) {
                    const prevActive = activeTodayAcademicSessions[idx - 1];
                    if (prevActive) {
                      const prevEnd = prevActive.end?.toDate?.() || new Date(prevActive.end);
                      const curStart = s.start?.toDate?.() || new Date(s.start);
                      const gapMin = differenceInMinutes(curStart, prevEnd);
                      if (gapMin > 15) {
                        const isInGap = prevEnd <= now && now < curStart;
                        const remainingMin = isInGap ? differenceInMinutes(curStart, now) : null;
                        const totalLabel = Math.floor(gapMin / 60) > 0
                          ? `${Math.floor(gapMin / 60)}h ${gapMin % 60}m`
                          : `${gapMin} min`;
                        breakIndicator = (
                          <div className={`py-1 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg border border-dashed shadow-sm ${
                            isInGap
                              ? 'text-amber-300 bg-amber-950/30 border-amber-600/50'
                              : 'text-emerald-300 bg-emerald-950/25 border-emerald-700/40'
                          }`}>
                            <span>{isInGap ? '⏱️' : '☕'}</span>
                            <span className={`font-bold ${isInGap ? 'text-amber-400' : 'text-emerald-400'}`}>Okienko:</span>
                            <span>{totalLabel} przerwy</span>
                            {isInGap && remainingMin !== null && (
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold text-[11px]">
                                pozostało {remainingMin} min
                              </span>
                            )}
                          </div>
                        );
                      }
                    }
                  }
                  return (
                    <React.Fragment key={s.id}>
                      {breakIndicator}
                      <ClassCard
                        session={s}
                        course={getCourse(s.courseId)}
                        onClick={() => handleOpenSessionModal(s, false)}
                        onEdit={() => handleOpenSessionModal(s, true)}
                      />
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* If there are cancelled classes, display them in a collapsed/muted list below */}
            {cancelledTodayAcademicSessions.length > 0 && (
              <div className="space-y-1.5 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
                  <span>❌ Odwołane zajęcia ({cancelledTodayAcademicSessions.length})</span>
                </p>
                {cancelledTodayAcademicSessions.map((s) => (
                  <ClassCard
                    key={s.id}
                    session={s}
                    course={getCourse(s.courseId)}
                    onClick={() => handleOpenSessionModal(s, false)}
                    onEdit={() => handleOpenSessionModal(s, true)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Tasks (1 col on lg) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tasks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap size={15} className="text-amber-400" />
                Do zrobienia ({activeTasks.length})
              </h2>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <Plus size={13} />
                Dodaj
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <p className="text-xs text-gray-600">Wszystko zrobione ✅</p>
            ) : (
              <div className="space-y-1.5">
                {activeTasks.slice(0, 6).map((task) => {
                  const course = getCourse(task.courseId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 transition-colors border border-gray-750"
                    >
                      <button
                        onClick={() => toggleTask(task.id, true)}
                        className="text-gray-500 hover:text-green-400 transition-colors flex-shrink-0"
                      >
                        <Square size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm text-white truncate font-medium">{task.title}</p>
                          {task.priority === 'high' && (
                            <span title="Pilne zadanie" className="inline-flex items-center text-amber-400">
                              <AlertTriangle size={13} className="text-amber-400 animate-pulse" />
                            </span>
                          )}
                        </div>

                        {/* ⚠️ Minimalist Yellow Exclamation Icon Badge for task notes / warnings */}
                        {task.note && (
                          <div className="mt-0.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 font-medium">
                            <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 animate-pulse" />
                            <span className="truncate flex-1">{task.note}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {task.sessionTitle ? (
                            <span className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-800/80 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                              <span>📅 Do zajęć: {task.sessionTitle}</span>
                            </span>
                          ) : course ? (
                            <span className="text-xs text-gray-300 font-medium">{course.name}</span>
                          ) : (
                            <span className="text-[10px] text-gray-400 bg-gray-900 border border-gray-800 px-1.5 py-0.2 rounded">
                              Zadanie ogólne
                            </span>
                          )}
                          {task.deadline && (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <Clock size={10} />
                              {format(task.deadline?.toDate?.() || new Date(task.deadline), 'd MMM', { locale: pl })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Popups & Modals */}
      {selectedSessionForModal && (
        <SessionDetailModal
          session={sessions.find((s) => s.id === selectedSessionForModal.id) || selectedSessionForModal}
          course={getCourse(selectedSessionForModal.courseId)}
          initialEditing={modalInitialEdit}
          onClose={() => {
            setSelectedSessionForModal(null);
            setModalInitialEdit(false);
          }}
        />
      )}
      {showAddSession && <AddSessionModal onClose={() => setShowAddSession(false)} />}
      {showAddTask && <AddTaskModal onClose={() => setShowAddTask(false)} />}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    high: { label: 'Pilne', cls: 'bg-red-900/60 text-red-400' },
    medium: { label: 'Średnie', cls: 'bg-amber-900/40 text-amber-400' },
    low: { label: 'Niskie', cls: 'bg-gray-700 text-gray-400' },
  };
  const p = map[priority] || map.medium;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${p.cls}`}>{p.label}</span>
  );
}
