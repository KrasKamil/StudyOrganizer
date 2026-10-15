import React, { useEffect, useState } from 'react';
import { differenceInMinutes, differenceInHours, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Video, MapPin, Clock, ExternalLink, CheckSquare, Edit3, Navigation, AlertTriangle, Bus } from 'lucide-react';
import { detectType } from './WeekGridView';
import { parseAghLocation, isSessionOnline } from '../utils/aghCampus';
import { useData } from '../contexts/DataContext';
import { getEffectiveUpelLink } from '../utils/courseMatcher';
import { buildJakdojadeUrl } from '../utils/transit';

export const TYPE_CONFIG = {
  personal: {
    badge: '🗓️ PRYWATNE',
    border: 'border-slate-600',
    bg: 'bg-slate-900/50 hover:bg-slate-900/70',
    text: 'text-slate-300',
    dot: '#94A3B8',
  },
  cancelled: {
    badge: '❌ BRAK',
    border: 'border-red-500',
    bg: 'bg-red-950/30 hover:bg-red-950/50',
    text: 'text-red-300',
    dot: '#EF4444',
  },
  lecture: {
    badge: 'W • WYKŁAD',
    border: 'border-blue-500',
    bg: 'bg-blue-950/20 hover:bg-blue-950/40',
    text: 'text-blue-300',
    dot: '#3B82F6',
  },
  lab: {
    badge: 'CWL • LAB',
    border: 'border-emerald-500',
    bg: 'bg-emerald-950/20 hover:bg-emerald-950/40',
    text: 'text-emerald-300',
    dot: '#10B981',
  },
  project: {
    badge: 'CWP • PROJEKT',
    border: 'border-amber-500',
    bg: 'bg-amber-950/20 hover:bg-amber-950/40',
    text: 'text-amber-300',
    dot: '#F59E0B',
  },
  exercise: {
    badge: 'CWA • ĆWICZENIA',
    border: 'border-violet-500',
    bg: 'bg-violet-950/20 hover:bg-violet-950/40',
    text: 'text-violet-300',
    dot: '#8B5CF6',
  },
  seminar: {
    badge: 'SEM • SEMINARIUM',
    border: 'border-cyan-500',
    bg: 'bg-cyan-950/20 hover:bg-cyan-950/40',
    text: 'text-cyan-300',
    dot: '#06B6D4',
  },
  lektorat: {
    badge: 'LEK • LEKTORAT',
    border: 'border-indigo-500',
    bg: 'bg-indigo-950/20 hover:bg-indigo-950/40',
    text: 'text-indigo-300',
    dot: '#6366F1',
  },
  consultation: {
    badge: 'KONSULTACJE',
    border: 'border-pink-500',
    bg: 'bg-pink-950/20 hover:bg-pink-950/40',
    text: 'text-pink-300',
    dot: '#EC4899',
  },
  other: {
    badge: 'ZAJĘCIA',
    border: 'border-gray-600',
    bg: 'bg-gray-800 hover:bg-gray-750',
    text: 'text-gray-300',
    dot: '#6B7280',
  },
};

function Countdown({ start, end, isCancelled }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (isCancelled) {
    return <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">🎉 Wolne!</span>;
  }

  const startDate = start?.toDate?.() || new Date(start);
  const endDate = end?.toDate?.() || new Date(end);

  if (endDate < now) {
    return <span className="text-[11px] font-semibold text-gray-500">Zakończone</span>;
  }

  if (startDate <= now && endDate > now) {
    const leftMin = differenceInMinutes(endDate, now);
    return (
      <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-600/80 px-2 py-0.5 rounded animate-pulse flex items-center gap-1 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>Trwa (jeszcze {leftMin}m)</span>
      </span>
    );
  }

  const diffMin = differenceInMinutes(startDate, now);
  const diffHr = differenceInHours(startDate, now);

  if (diffMin === 0) return <span className="text-xs font-bold text-emerald-400 animate-pulse">Teraz!</span>;
  if (diffMin < 60)
    return (
      <span className={`text-xs font-semibold ${diffMin <= 10 ? 'text-amber-400' : 'text-blue-400'}`}>
        za {diffMin} min
      </span>
    );
  if (diffHr < 24)
    return <span className="text-xs text-gray-400">za {diffHr}h {diffMin % 60}min</span>;
  return <span className="text-xs text-gray-500">{format(startDate, 'EEE d MMM', { locale: pl })}</span>;
}

export default function ClassCard({ session, course, onClick, onEdit, compact = false }) {
  const { tasks } = useData();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const start = session.start?.toDate?.() || new Date(session.start);
  const end = session.end?.toDate?.() || new Date(session.end);

  const isPast = end < now;
  const isOngoing = start <= now && end > now;
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progressPercent = isOngoing && totalDuration > 0
    ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)))
    : 0;

  const aghLoc = parseAghLocation(session.location, session.description, session.title);
  const effectiveTeamsLink = session.teamsLink || course?.teamsUrl || null;
  const effectiveUpel = getEffectiveUpelLink(session, course);
  const detected = session.isCancelled
    ? 'cancelled'
    : detectType(session.title, session.description, session.category);
  const cfg = TYPE_CONFIG[detected] || TYPE_CONFIG.other;
  const isOnline = isSessionOnline(session, aghLoc);

  const sessionTasksCount = (tasks || []).filter((t) => t.sessionId === session.id && !t.done).length;

  // Check if courseId is set but course object is missing (deleted course)
  const isOrphanedCourse = !!session.courseId && !course;

  // MINIMALIST BAR FOR PAST SESSIONS: No join or transit buttons, just clean status and info
  if (isPast && !session.isCancelled) {
    return (
      <div
        onClick={onClick}
        className="flex items-center justify-between gap-2.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gray-900/40 hover:bg-gray-850/60 border border-gray-800/60 opacity-60 hover:opacity-100 transition-all cursor-pointer group w-full"
        title="Zajęcia zakończone — kliknij, aby zobaczyć szczegóły"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-gray-600 group-hover:bg-blue-400 transition-colors flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-400 font-mono flex-shrink-0">
            {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0 bg-gray-800 text-gray-400">
            {cfg.badge}
          </span>
          <span className="text-xs font-medium text-gray-300 truncate">
            {session.title}
          </span>
          {(aghLoc?.displayText || session.location) && (
            <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
              • {aghLoc?.displayText || session.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-md border border-gray-750">
            Minęły
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(session);
              }}
              className="p-1 rounded-md text-gray-500 hover:text-blue-300 hover:bg-gray-800 transition-colors"
              title="Edytuj szczegóły"
            >
              <Edit3 size={12} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
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
      onClick={onClick}
      className={`
        relative flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 rounded-xl p-3 cursor-pointer md:cursor-grab md:active:cursor-grabbing w-full max-w-full overflow-hidden
        border-l-4 ${isOrphanedCourse ? 'border-amber-400 bg-amber-950/30' : cfg.border} ${isOrphanedCourse ? '' : cfg.bg}
        ${isOngoing ? 'ring-2 ring-emerald-500/70 shadow-lg shadow-emerald-950/40 border-emerald-500 bg-gradient-to-br from-emerald-950/25 via-gray-900 to-gray-900' : 'border-gray-800'}
        transition-all hover:scale-[1.005] hover:shadow-lg
        ${compact ? 'py-2' : 'py-3'}
      `}
      title="Możesz przeciągnąć te zajęcia na przedmiot w panelu bocznym!"
    >
      {/* Main content body with color dot */}
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        {/* Color dot */}
        <div
          className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: isOrphanedCourse ? '#F59E0B' : cfg.dot }}
        />

        <div className="flex-1 min-w-0 space-y-1">
          {/* Badges bar: custom slot + tasks counter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {session.customSlotTime && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-indigo-950/70 border border-indigo-700/80 px-2 py-0.5 rounded">
                <span>🎯 Slot: {session.customSlotTime} ({session.customSlotDuration || 15}m)</span>
                <span className="text-[9px] uppercase text-indigo-300">
                  {session.customSlotMode === 'online' ? '🖥️' : '🏛️'}
                </span>
              </div>
            )}

            {sessionTasksCount > 0 && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-950/70 border border-sky-700/80 px-2 py-0.5 rounded">
                <CheckSquare size={10} />
                <span>{sessionTasksCount} {sessionTasksCount === 1 ? 'zadanie' : 'zadań'}</span>
              </div>
            )}
          </div>

          {/* Title + Badge + Course */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0 ${
                  detected === 'cancelled' ? 'bg-red-900/60 text-red-300' : 'bg-gray-800 text-gray-300'
                }`}>
                  {cfg.badge}
                </span>
                {course && (
                  <span className="text-xs text-blue-400 font-medium truncate">{course.name}</span>
                )}
              </div>
              <p className={`text-sm font-semibold truncate ${
                detected === 'cancelled' ? 'line-through text-gray-400' : 'text-white'
              }`}>
                {session.title}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              <Countdown start={session.start} end={session.end} isCancelled={detected === 'cancelled'} />
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(session);
                  }}
                  className="p-1 rounded-md text-gray-400 hover:text-blue-300 hover:bg-gray-800 transition-colors"
                  title="Edytuj godzinę lub szczegóły wydarzenia"
                >
                  <Edit3 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ⚠️ Minimalist Yellow Exclamation Icon Badge for notes / warnings */}
          {(session.studentNotes || session.topicsToSend) && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 font-medium">
              <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 animate-pulse" />
              <span className="truncate flex-1">{session.studentNotes || session.topicsToSend}</span>
            </div>
          )}

          {/* Meta: time + AGH campus location / online mode */}
          {!compact && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400 pt-0.5">
              <span className="flex items-center gap-1 flex-shrink-0">
                <Clock size={12} className="text-gray-400" />
                {format(start, 'HH:mm')}–{format(end, 'HH:mm')}
              </span>

              {isOnline ? (
                <span className="flex items-center gap-1 text-blue-400 font-semibold truncate min-w-0">
                  <Video size={12} className="flex-shrink-0" />
                  <span className="truncate">{aghLoc.isRemote ? 'Zdalnie (Budynek A0)' : 'Zdalnie (Teams)'}</span>
                </span>
              ) : (aghLoc.isOnsite || session.location) ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium truncate min-w-0">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="truncate">{aghLoc.displayText || session.location}</span>
                  {aghLoc.building && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/80 px-1 rounded flex-shrink-0">
                      Bud. {aghLoc.building}
                    </span>
                  )}
                </span>
              ) : null}
            </div>
          )}

          {/* Active class progress indicator ("etap") */}
          {isOngoing && !session.isCancelled && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Trwają teraz • {format(now, 'HH:mm')}
                </span>
                <span>
                  Etap: {progressPercent}% (zostało {differenceInMinutes(end, now)} min)
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-750">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick action buttons: on mobile flows to bottom row, on sm+ stays on right */}
      {!session.isCancelled && (isOnline || aghLoc.navigateUrl || aghLoc.mapUrl || effectiveTeamsLink || effectiveUpel) && (
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 sm:mt-0 border-t border-gray-800/60 sm:border-t-0 flex-shrink-0 pl-5 sm:pl-0">
          {isOnline ? (
            effectiveTeamsLink ? (
              <a
                href={effectiveTeamsLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow hover:scale-[1.02]"
                title="Dołącz do spotkania zdalnego w Teams"
              >
                <Video size={12} />
                <span>Dołącz</span>
                <ExternalLink size={10} className="opacity-80" />
              </a>
            ) : null
          ) : (
            <>
              {/* Jakdojadę quick transit link */}
              <a
                href={buildJakdojadeUrl({
                  session,
                  destinationCoords: aghLoc.coords,
                  destinationName: aghLoc.building ? `AGH Budynek ${aghLoc.building}` : session.location,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-teal-800/80 hover:bg-teal-700 text-teal-100 hover:text-white text-xs font-semibold transition-all shadow hover:scale-[1.02] border border-teal-600/40"
                title="Otwórz Jakdojadę (zaplanowany przyjazd przed zajęciami)"
              >
                <Bus size={11} />
                <span>Jakdojadę</span>
                <ExternalLink size={9} className="opacity-80" />
              </a>

              {(aghLoc.navigateUrl || aghLoc.mapUrl) ? (
                <a
                  href={aghLoc.navigateUrl || aghLoc.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-blue-100 hover:text-white text-xs font-semibold transition-all shadow hover:scale-[1.02] border border-blue-600/40"
                  title={`Nawiguj do ${aghLoc.building ? 'Budynku ' + aghLoc.building : 'kampusu AGH'} (Google Maps)`}
                >
                  <Navigation size={11} />
                  <span>{aghLoc.building ? `Bud. ${aghLoc.building}` : 'Mapy'}</span>
                  <ExternalLink size={9} className="opacity-80" />
                </a>
              ) : null}

              {effectiveTeamsLink && (
                <a
                  href={effectiveTeamsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-indigo-300 hover:text-white text-xs font-medium border border-gray-700 transition-colors"
                  title="Zadania i materiały w Teams"
                >
                  <span>Teams</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </>
          )}

          {/* Direct UPeL Button */}
          {effectiveUpel && (
            <a
              href={effectiveUpel.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-950/70 hover:bg-orange-900 text-orange-300 hover:text-white text-xs font-medium border border-orange-700/70 transition-all shadow-sm"
              title={`${effectiveUpel.label} na platformie UPeL AGH`}
            >
              <span>🎓</span>
              <span>{effectiveUpel.shortLabel || 'UPeL'}</span>
              <ExternalLink size={10} className="opacity-80" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
