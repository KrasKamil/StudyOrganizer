import React, { useState, useEffect, useRef } from 'react';
import {
  format, startOfWeek, endOfWeek, addDays, isSameDay, isToday, addWeeks, subWeeks, startOfDay, differenceInMinutes
} from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, ChevronDown, Video, MapPin, Clock, AlertTriangle, Calendar, CheckSquare, Edit3, ExternalLink, Navigation
} from 'lucide-react';
import { parseAghLocation, isSessionOnline } from '../utils/aghCampus';
import { useData } from '../contexts/DataContext';

function CurrentTimeMarker({ now }) {
  return (
    <div className="relative my-2 flex items-center gap-2 z-20">
      <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-red-600/40 ring-2 ring-red-400/50 flex-shrink-0 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        <span>Teraz {format(now, 'HH:mm')}</span>
      </div>
      <div className="h-0.5 flex-1 bg-gradient-to-r from-red-500 via-rose-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
    </div>
  );
}

// Subject type detection based on title & description
export function detectType(title = '', desc = '', category = 'academic') {
  if (category === 'personal') return 'personal';
  const t = String(title || '').trim();
  const text = (t + ' ' + (desc || '')).toLowerCase();
  if (/odwo'ane|odwolane|odwołane|brak zaj|brak|cancelled/i.test(text)) return 'cancelled';

  // 1. Foreign language / Lektorat check FIRST (e.g. Angielski, Język angielski, LEK, SJO)
  if (
    /^lek\s*[-–:]/i.test(t) ||
    /^sjo\s*[-–:]/i.test(t) ||
    /\s*-\s*LEK(?:\s*[-–]|\s*$)/i.test(t) ||
    /\b(?:lek|lektorat(?:y)?|angielski|język\s*angielski|jezyk\s*angielski|język\s*obcy|jezyk\s*obcy|sjo)\b/i.test(text)
  ) {
    return 'lektorat';
  }

  // 2. Authoritative USOS leading prefixes in title
  // (Prevents course names like "W - Metodyki projektów..." from matching "projekt")
  if (
    /^(?:w|wyk|wyklad|wykład)\s*[-–—:.]/i.test(t) ||
    /\([Ww]\)|\[[Ww]\]/.test(t) ||
    /\s*[-–—]\s*[Ww](?:\s*[-–—]|\s*$)/.test(t) ||
    /\bWYK\b/i.test(t) ||
    /\bwyk[lł]ad(?:y)?\b/i.test(text) ||
    /rodzaj(?:\s+zajęć)?:\s*W\b/i.test(text)
  ) {
    return 'lecture';
  }
  if (/^cwl\s*[-–:]/i.test(t) || /^lab\s*[-–:]/i.test(t) || /\([Ll]\)|\[[Ll]\]/.test(t) || /\s*[-–—]\s*CWL(?:\s*[-–—]|\s*$)/i.test(t)) {
    return 'lab';
  }
  if (/^cwp\s*[-–:]/i.test(t) || /^proj\s*[-–:]/i.test(t) || /\([Pp]\)|\[[Pp]\]/.test(t) || /\s*[-–—]\s*CWP(?:\s*[-–—]|\s*$)/i.test(t)) {
    return 'project';
  }
  if (/^cwa\s*[-–:]/i.test(t) || /^ćw\s*[-–:]/i.test(t) || /\([CcĆć]\)|\[[CcĆć]\]/.test(t) || /\s*[-–—]\s*CWA(?:\s*[-–—]|\s*$)/i.test(t)) {
    return 'exercise';
  }
  if (/^sem\s*[-–:]/i.test(t) || /\s*[-–—]\s*SEM(?:\s*[-–—]|\s*$)/i.test(t)) return 'seminar';
  if (/^kon\s*[-–:]/i.test(t) || /\s*[-–—]\s*KON(?:\s*[-–—]|\s*$)/i.test(t)) return 'consultation';

  // 3. Explicit codes in title / description
  if (/\bCWL\b/i.test(t) || /\bCWL\b/i.test(desc)) return 'lab';
  if (/\bCWP\b/i.test(t) || /\bCWP\b/i.test(desc)) return 'project';
  if (/\bCWA\b/i.test(t) || /\bCWA\b/i.test(desc)) return 'exercise';
  if (/\bWYK\b/i.test(t) || /rodzaj(?:\s+zajęć)?:\s*W\b/i.test(text)) return 'lecture';

  // 4. Fallback for Metodyki: default to lecture unless explicitly CWP / projekt
  if (/metodyk/i.test(t) && !/\bcwp\b/i.test(t) && !/ćwiczenia\s+proj/i.test(text)) {
    return 'lecture';
  }

  // 5. Descriptive words (checked only when no prefix / code matched)
  if (/\bwyk[lł]ad(?:y)?\b/i.test(text)) return 'lecture';
  if (/\b(?:cwl|lab|laboratori(?:um|a|e)?)\b|\(l\)|ćwiczenia\s+lab/i.test(text)) return 'lab';
  if (/\b(?:cwp)\b|\(p\)|ćwiczenia\s+proj/i.test(text)) return 'project';
  if (/\b(?:cwa|ćw|cw|ćwiczeni(?:a|e)|cwiczeni(?:a|e))\b|\([cć]|ćw\)/i.test(text)) return 'exercise';
  if (/\b(?:sem|seminari(?:um|a)?)\b/i.test(text)) return 'seminar';
  if (/\b(?:kon|konsultacj(?:e|i)?)\b/i.test(text)) return 'consultation';

  return 'other';
}

export const TYPE_CONFIG = {
  personal: {
    badge: '🗓️ PRYWATNE',
    border: 'border-slate-500',
    bg: 'bg-slate-900/40 hover:bg-slate-900/60',
    text: 'text-slate-300',
    dot: '#94A3B8',
  },
  cancelled: {
    badge: '❌ BRAK',
    border: 'border-red-500/80',
    bg: 'bg-red-950/30 hover:bg-red-950/50',
    text: 'text-red-300',
    dot: '#EF4444',
  },
  lecture: {
    badge: 'W • WYKŁAD',
    border: 'border-blue-500',
    bg: 'bg-blue-950/30 hover:bg-blue-950/50',
    text: 'text-blue-300',
    dot: '#3B82F6',
  },
  lab: {
    badge: 'CWL • LAB',
    border: 'border-emerald-500',
    bg: 'bg-emerald-950/30 hover:bg-emerald-950/50',
    text: 'text-emerald-300',
    dot: '#10B981',
  },
  project: {
    badge: 'CWP • PROJEKT',
    border: 'border-amber-500',
    bg: 'bg-amber-950/30 hover:bg-amber-950/50',
    text: 'text-amber-300',
    dot: '#F59E0B',
  },
  exercise: {
    badge: 'CWA • ĆWICZENIA',
    border: 'border-violet-500',
    bg: 'bg-violet-950/30 hover:bg-violet-950/50',
    text: 'text-violet-300',
    dot: '#8B5CF6',
  },
  seminar: {
    badge: 'SEM • SEMINARIUM',
    border: 'border-cyan-500',
    bg: 'bg-cyan-950/30 hover:bg-cyan-950/50',
    text: 'text-cyan-300',
    dot: '#06B6D4',
  },
  lektorat: {
    badge: 'LEK • LEKTORAT',
    border: 'border-indigo-500',
    bg: 'bg-indigo-950/30 hover:bg-indigo-950/50',
    text: 'text-indigo-300',
    dot: '#6366F1',
  },
  consultation: {
    badge: 'KONSULTACJE',
    border: 'border-pink-500',
    bg: 'bg-pink-950/30 hover:bg-pink-950/50',
    text: 'text-pink-300',
    dot: '#EC4899',
  },
  other: {
    badge: 'ZAJĘCIA',
    border: 'border-gray-600',
    bg: 'bg-gray-800/60 hover:bg-gray-800',
    text: 'text-gray-300',
    dot: '#6B7280',
  },
};

// Helper to cluster sessions into continuous blocks (break <= 25 mins)
function clusterSessions(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => {
    const timeA = (a.start?.toDate?.() || new Date(a.start)).getTime();
    const timeB = (b.start?.toDate?.() || new Date(b.start)).getTime();
    return timeA - timeB;
  });

  const clusters = [];
  let currentCluster = null;
  let lastActiveEndTime = null;

  for (let i = 0; i < sorted.length; i++) {
    const session = sorted[i];
    const sStart = (session.start?.toDate?.() || new Date(session.start)).getTime();
    const sEnd = (session.end?.toDate?.() || new Date(session.end)).getTime();

    if (session.isCancelled) {
      if (currentCluster) {
        clusters.push(currentCluster);
        currentCluster = null;
      }
      clusters.push({
        start: session.start?.toDate?.() || new Date(session.start),
        end: session.end?.toDate?.() || new Date(session.end),
        items: [session],
        isStandalone: true,
        isCancelledSlot: true,
      });
      continue;
    }

    if (session.category === 'personal' || session.isAllDay) {
      if (currentCluster) {
        clusters.push(currentCluster);
        currentCluster = null;
      }
      clusters.push({
        start: session.start?.toDate?.() || new Date(session.start),
        end: session.end?.toDate?.() || new Date(session.end),
        items: [session],
        isStandalone: true,
      });
      continue;
    }

    const nextStart = session.start?.toDate?.() || new Date(session.start);
    const nextEnd = session.end?.toDate?.() || new Date(session.end);

    if (!currentCluster) {
      const gapMinutes = lastActiveEndTime
        ? Math.round((nextStart.getTime() - lastActiveEndTime) / (1000 * 60))
        : null;

      currentCluster = {
        start: nextStart,
        end: nextEnd,
        items: [session],
        gapBefore: gapMinutes && gapMinutes > 15 ? gapMinutes : null,
      };
      lastActiveEndTime = nextEnd.getTime();
    } else {
      const diffMinutes = (nextStart.getTime() - currentCluster.end.getTime()) / (1000 * 60);

      if (diffMinutes <= 25) {
        currentCluster.items.push(session);
        if (nextEnd > currentCluster.end) {
          currentCluster.end = nextEnd;
        }
        lastActiveEndTime = currentCluster.end.getTime();
      } else {
        clusters.push(currentCluster);
        currentCluster = {
          start: nextStart,
          end: nextEnd,
          items: [session],
          gapBefore: Math.round(diffMinutes),
        };
        lastActiveEndTime = nextEnd.getTime();
      }
    }
  }

  if (currentCluster) {
    clusters.push(currentCluster);
  }

  return clusters;
}

const POLISH_DAYS_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

export default function WeekGridView({ sessions, courses, onSelectSession, onEditSession }) {
  const { tasks, calendarDaysMode, setCalendarDaysMode, calendarCategoryFilter } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [collapsedInAll, setCollapsedInAll] = useState({});
  const todayRef = useRef(null);
  const hasPivotedRef = useRef(false);

  const showWeekend = calendarDaysMode === 'full';

  const [mobileSelectedDay, setMobileSelectedDay] = useState(() => {
    const day = new Date().getDay();
    const dayIdx = day === 0 ? 6 : day - 1; // Mon = 0, Sun = 6
    if (dayIdx >= 5 && calendarDaysMode !== 'full') {
      return 4;
    }
    return dayIdx;
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const daysCount = showWeekend ? 7 : 5;

  // Auto-adjust mobileSelectedDay if weekend is collapsed
  useEffect(() => {
    if (!showWeekend && typeof mobileSelectedDay === 'number' && mobileSelectedDay >= 5) {
      setMobileSelectedDay(4);
    }
  }, [showWeekend, mobileSelectedDay]);

  // Week range starting on Monday
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: daysCount }, (_, i) => addDays(weekStart, i));

  // Pivot / auto-scroll to today's day when viewing the current week
  useEffect(() => {
    const weekContainsToday = weekDays.some((d) => isToday(d));
    if (weekContainsToday) {
      const todayDay = new Date().getDay();
      const todayIdx = todayDay === 0 ? 6 : todayDay - 1;
      const targetIdx = !showWeekend && todayIdx >= 5 ? 4 : todayIdx;
      if (!hasPivotedRef.current) {
        hasPivotedRef.current = true;
        setMobileSelectedDay(targetIdx);
        const timer = setTimeout(() => {
          todayRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'center',
          });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentDate, weekDays, showWeekend]);

  // Detect if any session falls on weekend in this week
  const hasWeekendSessions = sessions.some((s) => {
    const d = s.start?.toDate?.() || new Date(s.start);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) return false;
    const sStart = startOfDay(weekStart);
    const sEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    return d >= sStart && d <= sEnd;
  });

  const handlePrevWeek = () => setCurrentDate((d) => subWeeks(d, 1));
  const handleNextWeek = () => setCurrentDate((d) => addWeeks(d, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const day = today.getDay();
    const dayIdx = day === 0 ? 6 : day - 1;
    if (dayIdx >= 5 && !showWeekend) {
      setCalendarDaysMode('full');
    }
    setMobileSelectedDay(dayIdx);
    setCollapsedInAll({});
  };

  const handlePrevDay = () => {
    if (mobileSelectedDay === 'all' || mobileSelectedDay === null) {
      setMobileSelectedDay(0);
    } else if (mobileSelectedDay > 0) {
      setMobileSelectedDay((d) => d - 1);
    } else {
      handlePrevWeek();
      setMobileSelectedDay(daysCount - 1);
    }
  };

  const handleNextDay = () => {
    if (mobileSelectedDay === 'all' || mobileSelectedDay === null) {
      setMobileSelectedDay(0);
    } else if (mobileSelectedDay < daysCount - 1) {
      setMobileSelectedDay((d) => d + 1);
    } else {
      handleNextWeek();
      setMobileSelectedDay(0);
    }
  };

  // Filter sessions by global category preference
  const filteredSessions = sessions.filter((s) => {
    if (calendarCategoryFilter === 'academic') return s.category !== 'personal';
    if (calendarCategoryFilter === 'personal') return s.category === 'personal';
    return true;
  });

  return (
    <div className="flex flex-col space-y-2.5 sm:space-y-4 w-full max-w-full min-w-0">
      {/* Week Navigation Header (Clean & Minimalist) */}
      <div className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-2.5 sm:p-3 w-full max-w-full min-w-0 shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0 justify-between sm:justify-start">
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-gray-750 text-xs font-bold text-white transition-colors border border-gray-700 flex-shrink-0"
          >
            Dziś
          </button>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handlePrevWeek}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Poprzedni tydzień"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Następny tydzień"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white capitalize truncate min-w-0">
            {format(weekStart, 'd MMM', { locale: pl })} –{' '}
            {format(addDays(weekStart, daysCount - 1), 'd MMM yyyy', { locale: pl })}
          </span>
        </div>

        {/* Right side controls: Category filter badge if active */}
        {calendarCategoryFilter !== 'all' && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/70 border border-blue-700/60 px-2.5 py-1 rounded-xl shadow-sm">
              {calendarCategoryFilter === 'academic' ? '🎓 Tylko zajęcia' : '🗓️ Prywatne'}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Day Picker Tabs (Compact & Responsive) */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-gray-900 border border-gray-800 rounded-2xl shadow-sm flex-nowrap w-full">
        <button
          type="button"
          onClick={() => {
            setMobileSelectedDay('all');
            setCollapsedInAll({});
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
            mobileSelectedDay === 'all'
              ? 'bg-white text-zinc-950 shadow-sm'
              : 'text-gray-400 hover:text-white bg-gray-850/60'
          }`}
        >
          Wszystkie
        </button>
        {weekDays.map((day, idx) => {
          const isSelected = mobileSelectedDay === idx;
          const isCurrent = isToday(day);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMobileSelectedDay(idx);
                setCollapsedInAll({});
              }}
              className={`flex-1 min-w-[42px] flex-shrink-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-xs transition-all relative ${
                isSelected
                  ? 'bg-white text-zinc-950 shadow-sm font-bold'
                  : isCurrent
                  ? 'bg-gray-800 border border-gray-650 text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-tight">
                {POLISH_DAYS_SHORT[idx]}
              </span>
              <span className="text-xs font-extrabold">{format(day, 'd')}</span>
              {isCurrent && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-white absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Active Day Navigation Bar (Prev / Next Day arrows) */}
      {mobileSelectedDay !== 'all' && mobileSelectedDay !== null && (
        <div className="flex md:hidden items-center justify-between p-2 rounded-xl bg-gray-900 border border-gray-800 shadow-sm w-full">
          <button
            type="button"
            onClick={handlePrevDay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs font-semibold text-gray-200 transition-colors"
          >
            <ChevronLeft size={15} />
            <span>Poprzedni</span>
          </button>

          <div className="text-center min-w-0 px-2">
            <p className="text-xs font-bold text-white capitalize truncate">
              {format(weekDays[mobileSelectedDay], 'EEEE, d MMMM', { locale: pl })}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs font-semibold text-gray-200 transition-colors"
          >
            <span>Następny</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {mobileSelectedDay === null && (
        <div className="md:hidden flex items-center justify-between px-3 py-2 rounded-xl bg-gray-900/70 border border-gray-800 text-xs text-gray-400 shadow-sm">
          <span>Dni zwinięte • Wybierz dzień, aby rozwinąć:</span>
          <button
            type="button"
            onClick={() => setMobileSelectedDay('all')}
            className="text-[11px] font-bold text-blue-400 hover:underline"
          >
            Rozwiń wszystkie
          </button>
        </div>
      )}

      {/* Grid (5 columns on desktop for Mon-Fri by default; 7 columns if weekend toggled) */}
      <div className={`grid grid-cols-1 ${showWeekend ? 'md:grid-cols-5 xl:grid-cols-7' : 'md:grid-cols-5'} gap-3 sm:gap-3.5 w-full max-w-full min-w-0`}>
        {weekDays.map((day, dayIndex) => {
          const daySessions = filteredSessions.filter((s) => {
            const d = s.start?.toDate?.() || new Date(s.start);
            return isSameDay(d, day);
          });

          const isCurrentDay = isToday(day);
          const isPastDay = !isCurrentDay && day < startOfDay(now);

          // Extract all-day events and converted-to-note events
          const allDayEvents = daySessions.filter((s) => s.isAllDay);
          const noteEvents = daySessions.filter((s) => s.isConvertedToNote);
          const timedSessions = daySessions.filter((s) => !s.isAllDay && !s.isConvertedToNote);
          const clusters = clusterSessions(timedSessions);

          let markerPlaced = false;

          const isHiddenOnMobile = mobileSelectedDay !== 'all' && mobileSelectedDay !== dayIndex;
          const isCollapsedInAll = mobileSelectedDay === 'all' && !!collapsedInAll[dayIndex];

          return (
            <React.Fragment key={day.toISOString()}>
              {/* Mobile Collapsed Day Accordion (only shown in 'all' view when day is collapsed) */}
              {isCollapsedInAll && (
                <div
                  ref={isCurrentDay ? todayRef : null}
                  id={isCurrentDay ? 'calendar-day-today-mobile' : undefined}
                  onClick={() => {
                    setCollapsedInAll((prev) => ({ ...prev, [dayIndex]: false }));
                  }}
                  className={`md:hidden flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer shadow-sm active:scale-[0.99] ${
                    isCurrentDay
                      ? 'bg-blue-950/40 border-blue-600/60 text-blue-200 hover:bg-blue-950/60'
                      : 'bg-gray-900/80 hover:bg-gray-850 border-gray-800 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isCurrentDay ? 'bg-white animate-pulse ring-2 ring-white/30' : 'bg-gray-600'}`} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold capitalize text-white truncate">
                        {format(day, 'EEEE, d MMMM', { locale: pl })}
                      </span>
                      {isCurrentDay && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white text-zinc-950 shadow-sm">
                          Dziś
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-medium text-gray-400">
                      {daySessions.length === 0 ? 'Wolne 🎉' : `${daySessions.length} ${daySessions.length === 1 ? 'zajęcia' : daySessions.length < 5 ? 'zajęcia' : 'zajęć'}`}
                    </span>
                    <span className="text-[10px] font-bold text-gray-300 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <span>Rozwiń</span>
                      <ChevronDown size={13} />
                    </span>
                  </div>
                </div>
              )}

              {/* Full Day Column */}
              <div
                ref={isCurrentDay ? todayRef : null}
                id={isCurrentDay ? 'calendar-day-today' : `calendar-day-${dayIndex}`}
                className={`flex-col rounded-2xl border ${
                  isHiddenOnMobile || isCollapsedInAll ? 'hidden md:flex' : 'flex'
                } ${
                  isCurrentDay
                    ? 'bg-gray-900/95 border-gray-700 ring-1 ring-white/10 shadow-xl'
                    : isPastDay
                    ? 'bg-gray-950/50 border-gray-850/70 opacity-80'
                    : 'bg-gray-900/50 border-gray-800/80 shadow-md'
                } min-h-[460px] w-full`}
              >
                {/* Day Column Header */}
                <div
                  className={`p-2.5 sm:p-3 border-b flex items-center justify-between sm:flex-col sm:justify-center ${
                    isCurrentDay
                      ? 'bg-gray-850 border-gray-750'
                      : isPastDay
                      ? 'bg-gray-900/40 border-gray-850'
                      : 'bg-gray-850/60 border-gray-800'
                  }`}
                >
                  <div className="text-left sm:text-center">
                    <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                      isCurrentDay ? 'text-white' : isPastDay ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {format(day, 'EEEE', { locale: pl })}
                    </p>
                    <p className={`text-base sm:text-lg font-extrabold ${
                      isCurrentDay ? 'text-white' : isPastDay ? 'text-gray-400' : 'text-gray-200'
                    }`}>
                      {format(day, 'd MMMM', { locale: pl })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isCurrentDay && (
                      <span className="sm:hidden text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white text-zinc-950 shadow-sm">
                        Dziś
                      </span>
                    )}
                    {/* Mobile toggle button: Collapse if in 'all' view, or 'Cały tydzień' if in single day view */}
                    {mobileSelectedDay === 'all' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedInAll((prev) => ({ ...prev, [dayIndex]: true }));
                        }}
                        className="md:hidden text-[10px] text-gray-300 hover:text-white px-2 py-0.5 rounded-lg bg-gray-800/90 hover:bg-gray-750 border border-gray-700 font-semibold flex items-center gap-1 transition-colors"
                        title="Zwiń ten dzień"
                      >
                        <span>Zwiń</span>
                        <ChevronDown size={11} className="rotate-180 text-gray-400" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileSelectedDay('all');
                        }}
                        className="md:hidden text-[10px] text-gray-300 hover:text-white px-2 py-0.5 rounded-lg bg-gray-800/90 hover:bg-gray-750 border border-gray-700 font-semibold flex items-center gap-1 transition-colors"
                        title="Pokaż cały tydzień"
                      >
                        <span>Wszystkie dni</span>
                      </button>
                    )}

                    {/* Desktop: quick collapse weekend button for Sat/Sun */}
                    {dayIndex >= 5 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWeekend();
                        }}
                        className="hidden md:flex text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-750 items-center gap-1 transition-colors"
                        title="Zwiń weekend (ukryj sobotę i niedzielę)"
                      >
                        <span>Zwiń weekend</span>
                      </button>
                    )}
                  </div>
                </div>

              {/* All-Day Events Pills */}
              {allDayEvents.length > 0 && (
                <div className="p-1.5 bg-gray-850/40 border-b border-gray-800 space-y-1">
                  {allDayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onSelectSession?.(event)}
                      className="group/pill px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] text-slate-300 font-medium truncate cursor-pointer hover:bg-slate-750 flex items-center justify-between gap-1"
                      title={event.title}
                    >
                      <span className="truncate">🗓️ {event.title}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSession ? onEditSession(event) : onSelectSession?.(event);
                        }}
                        className="opacity-0 group-hover/pill:opacity-100 p-0.5 text-gray-400 hover:text-white"
                        title="Edytuj wydarzenie całodniowe"
                      >
                        <Edit3 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Converted to Notes Events Pills with Icon */}
              {noteEvents.length > 0 && (
                <div className="p-1.5 bg-amber-950/20 border-b border-amber-900/30 space-y-1">
                  {noteEvents.map((event) => {
                    const assignedCourse = courses.find((c) => c.id === event.courseId);
                    return (
                      <div
                        key={event.id}
                        onClick={() => onSelectSession?.(event)}
                        className="group/note px-2 py-1 rounded-md bg-amber-950/70 border border-amber-700/60 text-[10px] text-amber-200 font-semibold flex items-center justify-between gap-1 cursor-pointer hover:bg-amber-900/60 transition-colors shadow-sm"
                        title={`Notatka do przedmiotu ${assignedCourse?.name || ''}: ${event.title}`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="text-xs">📝</span>
                          <span className="truncate">{event.title}</span>
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {assignedCourse && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-900 text-amber-300 font-bold">
                              {assignedCourse.name}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditSession ? onEditSession(event) : onSelectSession?.(event);
                            }}
                            className="opacity-0 group-hover/note:opacity-100 p-0.5 text-amber-300 hover:text-white"
                            title="Edytuj notatkę / wydarzenie"
                          >
                            <Edit3 size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day Sessions with Continuous Block Clusters */}
              <div className="p-2.5 sm:p-3 space-y-3 flex-1 relative">
                {timedSessions.length === 0 && allDayEvents.length === 0 && noteEvents.length === 0 ? (
                  <div className="py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-2">
                    {isCurrentDay && <CurrentTimeMarker now={now} />}
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm font-bold text-gray-300">Brak zajęć w tym dniu</p>
                    <p className="text-xs text-gray-500">Masz wolny czas na odpoczynek lub własne projekty!</p>
                  </div>
                ) : (
                  <>
                    {/* If now is before the first cluster on current day */}
                    {isCurrentDay && !markerPlaced && clusters.length > 0 && now < clusters[0].start && (
                      (() => {
                        markerPlaced = true;
                        return <CurrentTimeMarker now={now} />;
                      })()
                    )}

                    {clusters.map((cluster, cIdx) => {
                      const showMarkerBeforeCluster =
                        isCurrentDay && !markerPlaced && now < cluster.start;
                      if (showMarkerBeforeCluster) {
                        markerPlaced = true;
                      }

                      // Only treat as multi-class continuous block if 2+ classes are ACTIVE and NOT cancelled
                      const activeClasses = cluster.items.filter((item) => !item.isCancelled);
                      const isMulti = activeClasses.length > 1;

                      return (
                        <React.Fragment key={cIdx}>
                          {showMarkerBeforeCluster && <CurrentTimeMarker now={now} />}

                          {/* Gap / Break Indicator if there's a break > 20 mins and not yet passed */}
                          {cluster.gapBefore && (() => {
                            const breakEnd = cluster.start;
                            if (isPastDay || (isCurrentDay && now >= breakEnd)) {
                              return null;
                            }
                            const breakStartMs = breakEnd.getTime() - cluster.gapBefore * 60_000;
                            const isInBreak = isCurrentDay && now.getTime() >= breakStartMs && now < breakEnd;
                            const remainingMin = isInBreak ? differenceInMinutes(breakEnd, now) : null;
                            const totalLabel = Math.floor(cluster.gapBefore / 60) > 0
                              ? `${Math.floor(cluster.gapBefore / 60)}h ${cluster.gapBefore % 60}m`
                              : `${cluster.gapBefore} min`;
                            return (
                              <div className={`my-1.5 py-1 px-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-lg border border-dashed shadow-sm flex-shrink-0 ${
                                isInBreak
                                  ? 'text-amber-300 bg-amber-950/40 border-amber-600/60'
                                  : 'text-emerald-300 bg-emerald-950/35 border-emerald-700/50'
                              }`}>
                                <span>{isInBreak ? '⏱️' : '☕'}</span>
                                <span className={`font-bold ${isInBreak ? 'text-amber-400' : 'text-emerald-400'}`}>Okienko:</span>
                                <span>{totalLabel} wolnego</span>
                                {isInBreak && remainingMin !== null && (
                                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold">
                                    pozostało {remainingMin} min
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                        {/* Continuous Block Wrapper (only for 2+ active classes) */}
                        <div
                          className={
                            isMulti
                              ? 'p-2 sm:p-2.5 rounded-2xl bg-blue-950/20 border border-blue-600/40 space-y-2 shadow-sm'
                              : 'space-y-2'
                          }
                        >
                          {/* Continuous Cluster Banner */}
                          {isMulti && (
                            <div className="flex items-center justify-between px-1 text-[11px] font-bold text-blue-300">
                              <span className="flex items-center gap-1.5">
                                <span>⚡ Blok ciągły:</span>
                                <span className="text-white font-extrabold font-mono whitespace-nowrap">
                                  {format(cluster.start, 'HH:mm')}–{format(cluster.end, 'HH:mm')}
                                </span>
                              </span>
                              <span className="bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-700/50">
                                {activeClasses.length} zajęcia pod rząd
                              </span>
                            </div>
                          )}


                          {/* Render items: group overlapping events side-by-side */}
                          {(() => {
                            // Find overlapping items to render them side-by-side
                            const items = cluster.items;
                            const rows = [];
                            let currentRow = [];

                            for (let j = 0; j < items.length; j++) {
                              const curr = items[j];
                              const currStart = (curr.start?.toDate?.() || new Date(curr.start)).getTime();
                              const currEnd = (curr.end?.toDate?.() || new Date(curr.end)).getTime();

                              if (currentRow.length === 0) {
                                currentRow.push(curr);
                              } else {
                                // Check if curr overlaps with ANY item in currentRow
                                const overlaps = currentRow.some((prev) => {
                                  const prevStart = (prev.start?.toDate?.() || new Date(prev.start)).getTime();
                                  const prevEnd = (prev.end?.toDate?.() || new Date(prev.end)).getTime();
                                  // Overlap condition: startA < endB && startB < endA
                                  return currStart < prevEnd && prevStart < currEnd;
                                });

                                if (overlaps) {
                                  currentRow.push(curr);
                                } else {
                                  rows.push(currentRow);
                                  currentRow = [curr];
                                }
                              }
                            }
                            if (currentRow.length > 0) {
                              rows.push(currentRow);
                            }

                            return rows.map((rowItems, rIdx) => {
                              const isParallel = rowItems.length > 1;
                              const rowEarliestStart = Math.min(...rowItems.map((it) => (it.start?.toDate?.() || new Date(it.start)).getTime()));
                              const renderMarkerBeforeRow = isCurrentDay && !markerPlaced && now.getTime() < rowEarliestStart;
                              if (renderMarkerBeforeRow) {
                                markerPlaced = true;
                              }

                              return (
                                <React.Fragment key={rIdx}>
                                  {renderMarkerBeforeRow && <CurrentTimeMarker now={now} />}
                                  <div
                                    className={
                                      isParallel
                                        ? 'flex flex-col xl:grid xl:grid-cols-2 gap-2 w-full'
                                        : 'w-full space-y-2'
                                    }
                                  >
                                    {rowItems.map((session) => {
                                      const start = session.start?.toDate?.() || new Date(session.start);
                                      const end = session.end?.toDate?.() || new Date(session.end);
                                      const isPast = end < now;
                                      const isOngoing = start <= now && end > now;
                                      const totalDuration = end.getTime() - start.getTime();
                                      const elapsed = now.getTime() - start.getTime();
                                      const progressPercent = isOngoing && totalDuration > 0
                                        ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
                                        : 0;

                                      const detected = session.isCancelled
                                        ? 'cancelled'
                                        : detectType(session.title, session.description, session.category);
                                      const cfg = TYPE_CONFIG[detected] || TYPE_CONFIG.other;
                                      const sessionTasksCount = (tasks || []).filter((t) => t.sessionId === session.id && !t.done).length;
                                      const aghLoc = parseAghLocation(session.location, session.description, session.title);
                                      const assignedCourse = courses.find((c) => c.id === session.courseId);
                                      const effectiveTeamsLink = session.teamsLink || assignedCourse?.teamsUrl || null;
                                      const isOnline = isSessionOnline(session, aghLoc);
                                      const isOrphanedCourse = !!session.courseId && !assignedCourse;

                                      return (
                                        <div
                                          key={session.id}
                                          draggable={typeof window !== 'undefined' && window.innerWidth >= 768}
                                          onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                              'application/json',
                                              JSON.stringify({
                                                type: 'calendar_session',
                                                sessionId: session.id,
                                                title: session.title,
                                              })
                                            );
                                          }}
                                          onClick={() => onSelectSession?.(session)}
                                          className={`
                                            group relative p-2.5 rounded-lg border-l-4 ${
                                              isOrphanedCourse ? 'border-amber-400 bg-amber-950/30' : cfg.border
                                            } ${isOrphanedCourse ? '' : cfg.bg}
                                            ${isPast ? 'opacity-50 saturate-[0.35] hover:opacity-95 hover:saturate-100 transition-all bg-gray-900/50 border-gray-850' : 'border-gray-800/80'}
                                            ${isOngoing ? 'ring-2 ring-red-500/80 shadow-lg shadow-red-950/40 bg-gradient-to-br from-red-950/20 via-gray-900 to-gray-900' : ''}
                                            border shadow-sm cursor-pointer md:cursor-grab md:active:cursor-grabbing transition-all
                                            hover:scale-[1.01] hover:shadow-md ${isParallel ? 'min-w-0' : ''}
                                          `}
                                          title="Chwyć i przeciągnij na przedmiot po lewej stronie, aby go przypisać!"
                                        >
                                          {/* Warning if assigned course was deleted */}
                                          {isOrphanedCourse && (
                                            <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80">
                                              <span>💬 Konsultacje / brak przedmiotu</span>
                                            </div>
                                          )}

                                          {/* Assigned Course badge if exists */}
                                          {assignedCourse && (
                                            <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold text-blue-300">
                                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                              <span className="truncate">{assignedCourse.name}</span>
                                            </div>
                                          )}

                                          {/* 🎯 Custom Slot Badge (CWP / Project defense) */}
                                          {session.customSlotTime && (
                                            <div className="mb-1 flex items-center justify-between gap-1 text-[9px] font-bold text-emerald-300 bg-indigo-950/70 border border-indigo-700/80 px-1.5 py-0.5 rounded">
                                              <span>🎯 Slot: {session.customSlotTime} ({session.customSlotDuration || 15}m)</span>
                                              <span className="text-[8px] uppercase text-indigo-300">
                                                {session.customSlotMode === 'online' ? 'Teams' : 'Sala'}
                                              </span>
                                            </div>
                                          )}

                                          {/* 📋 Tasks to this session badge */}
                                          {sessionTasksCount > 0 && (
                                            <div className="mb-1 inline-flex items-center gap-1 text-[9px] font-bold text-sky-300 bg-sky-950/70 border border-sky-700/80 px-1.5 py-0.5 rounded">
                                              <CheckSquare size={9} />
                                              <span>{sessionTasksCount} {sessionTasksCount === 1 ? 'zadanie do zajęć' : 'zadania do zajęć'}</span>
                                            </div>
                                          )}

                                          {/* Time & Type Badge */}
                                          <div className="flex items-center justify-between gap-1.5 mb-1 w-full">
                                            <div className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                                              <Clock size={11} className="text-gray-400 flex-shrink-0" />
                                              <span className="text-[10.5px] font-semibold text-gray-200 font-mono tracking-tight whitespace-nowrap">
                                                {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                              {detected === 'cancelled' || session.isCancelled ? (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 bg-red-900/70 text-red-300 border border-red-700/60">
                                                  ❌ BRAK
                                                </span>
                                              ) : isPast ? (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 bg-gray-800 text-gray-500 border border-gray-700/50">
                                                  Minęły
                                                </span>
                                              ) : isOngoing ? (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 bg-red-950 text-red-300 border border-red-800 animate-pulse">
                                                  🔴 Trwa
                                                </span>
                                              ) : (
                                                <span
                                                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${
                                                    detected === 'personal'
                                                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                                      : 'bg-gray-800 text-gray-300'
                                                  }`}
                                                >
                                                  {cfg.badge}
                                                </span>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onEditSession ? onEditSession(session) : onSelectSession?.(session);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-all"
                                                title="Edytuj godzinę lub szczegóły wydarzenia"
                                              >
                                                <Edit3 size={11} />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Title */}
                                          <p className={`text-xs font-bold leading-snug line-clamp-2 ${
                                            detected === 'cancelled' ? 'line-through text-gray-400' : 'text-white'
                                          }`}>
                                            {session.title}
                                          </p>

                                          {/* Active class live progress indicator (etap) */}
                                          {isOngoing && (
                                            <div className="mt-1.5 space-y-1">
                                              <div className="flex items-center justify-between text-[9px] font-bold text-red-300">
                                                <span className="flex items-center gap-1">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                                                  Teraz {format(now, 'HH:mm')}
                                                </span>
                                                <span>{progressPercent}% (zostało {differenceInMinutes(end, now)}m)</span>
                                              </div>
                                              <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-750">
                                                <div
                                                  className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 transition-all duration-500 rounded-full"
                                                  style={{ width: `${progressPercent}%` }}
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {/* ⚠️ Minimalist Yellow Exclamation Icon Badge for notes / warnings */}
                                          {(session.studentNotes || session.topicsToSend) && (
                                            <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200 font-medium">
                                              <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 animate-pulse" />
                                              <span className="truncate flex-1">{session.studentNotes || session.topicsToSend}</span>
                                            </div>
                                          )}

                                          {/* Location / Online indicator (with AGH building & room) + Teams Link */}
                                          <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-medium text-gray-400">
                                            <div className="flex items-center gap-1 min-w-0">
                                              {isOnline ? (
                                                <span className="flex items-center gap-1 text-blue-400 truncate font-semibold">
                                                  <Video size={10} className="flex-shrink-0" />
                                                  {aghLoc.isRemote ? 'Zdalnie (A0)' : 'Zdalnie (Teams)'}
                                                </span>
                                              ) : (aghLoc.isOnsite || session.location) ? (
                                                <span className="flex items-center gap-1 text-emerald-400 truncate">
                                                  <MapPin size={10} className="flex-shrink-0" />
                                                  <span className="truncate">{aghLoc.displayText || session.location}</span>
                                                  {aghLoc.building && (
                                                    <span className="text-[8px] font-bold px-1 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 flex-shrink-0">
                                                      Bud. {aghLoc.building}
                                                    </span>
                                                  )}
                                                </span>
                                              ) : null}
                                            </div>

                                            {/* Quick action badges: hide entirely for cancelled sessions */}
                                            {!session.isCancelled && (
                                              <div className="flex-shrink-0 flex items-center gap-1">
                                                {isOnline ? (
                                                  effectiveTeamsLink ? (
                                                    <a
                                                      href={effectiveTeamsLink}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      onClick={(e) => e.stopPropagation()}
                                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold transition-colors shadow-sm"
                                                      title="Dołącz do spotkania zdalnego w Teams"
                                                    >
                                                      <Video size={9} />
                                                      <span>Dołącz</span>
                                                      <ExternalLink size={8} />
                                                    </a>
                                                  ) : null
                                                ) : (
                                                  <>
                                                    {(aghLoc.navigateUrl || aghLoc.mapUrl) ? (
                                                      <a
                                                        href={aghLoc.navigateUrl || aghLoc.mapUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 hover:text-white text-[9px] font-bold border border-emerald-600/70 transition-colors shadow-sm"
                                                        title={`Nawiguj do ${aghLoc.building ? 'Budynku ' + aghLoc.building : 'kampusu AGH'} (Google Maps)`}
                                                      >
                                                        <Navigation size={8} />
                                                        <span>{aghLoc.building ? `Bud. ${aghLoc.building}` : 'Dojazd'}</span>
                                                        <ExternalLink size={8} />
                                                      </a>
                                                    ) : null}

                                                    {effectiveTeamsLink && (
                                                      <a
                                                        href={effectiveTeamsLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gray-800 hover:bg-gray-750 text-indigo-300 hover:text-white text-[8px] font-medium border border-gray-700 transition-colors"
                                                        title="Zadania i materiały w Teams"
                                                      >
                                                        <span>Teams</span>
                                                        <ExternalLink size={8} />
                                                      </a>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {/* Render marker at the end of the day if not yet rendered */}
                  {isCurrentDay && !markerPlaced && (
                    <CurrentTimeMarker now={now} />
                  )}
                </>
              )}
              </div>
            </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
