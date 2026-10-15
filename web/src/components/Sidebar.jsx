import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Calendar, Inbox, CheckSquare, Settings, Plus,
  ChevronRight, BookOpen, GraduationCap, Check, Edit3, Layers, Sparkles, X, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import CourseModal from './CourseModal';
import { getCourseSubsections } from '../utils/courseMatcher';
import { usePwaInstall } from '../hooks/usePwaInstall';

const TYPE_ICONS = {
  lecture: '📘',
  wyk: '📘',
  lab: '📗',
  cwl: '📗',
  project: '📙',
  cwp: '📙',
  exercise: '📕',
  cwa: '📕',
  seminar: '🎓',
  sem: '🎓',
  lektorat: '🗣️',
  lek: '🗣️',
  consultation: '💬',
  kon: '💬',
  other: '📓',
};

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const navigate = useNavigate();
  const [dragOverCourseId, setDragOverCourseId] = useState(null);
  const [droppedFeedback, setDroppedFeedback] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initFeedback, setInitFeedback] = useState(null);

  const {
    courses,
    sessions,
    tasks,
    selectedCourseId,
    setSelectedCourseId,
    updateSession,
    pinResource,
    initializeSemester2Courses,
    openFloatingDashboard,
    theme,
    toggleTheme,
  } = useData();
  const { user, logout } = useAuth();
  const [showAddCourse, setShowAddCourse] = useState(false);
  const { isInstallable, isStandalone, isIos, installApp } = usePwaInstall();

  const handleInitSemester2 = async () => {
    setIsInitializing(true);
    try {
      const results = await initializeSemester2Courses();
      const linkedCount = results.reduce((sum, r) => sum + r.count, 0);
      setInitFeedback(`Powiązano ${results.length} przedmiotów (${linkedCount} zajęć)!`);
      setTimeout(() => setInitFeedback(null), 4000);
    } catch (err) {
      console.error('Błąd inicjalizacji przedmiotów:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const unreadTasks = tasks.filter((t) => !t.done).length;

  const handleDropOnCourse = async (e, courseId) => {
    e.preventDefault();
    setDragOverCourseId(null);
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.type === 'calendar_session' && data.sessionId) {
        const sessionObj = sessions.find((s) => s.id === data.sessionId) || data;
        const targetCourse = courses.find((c) => c.id === courseId);

        let dateText = '';
        try {
          const sDate = sessionObj.start?.toDate?.() || new Date(sessionObj.start);
          dateText = format(sDate, 'd MMM yyyy, HH:mm', { locale: pl });
        } catch {}

        // 1. Pin as note with icon in the course
        await pinResource(courseId, {
          type: 'note',
          icon: '📝',
          title: sessionObj.title,
          dateText,
          location: sessionObj.location || '',
          notes: sessionObj.studentNotes || sessionObj.description || '',
          url: sessionObj.teamsLink || '',
          sessionId: sessionObj.id,
          source: 'Kalendarz / USOS',
          pinnedAt: new Date().toISOString(),
        });

        // 2. Mark session as converted to note (removed from schedule grid, shown as note badge)
        await updateSession(data.sessionId, {
          courseId: courseId,
          isConvertedToNote: true,
        });

        // 3. Show feedback
        setDroppedFeedback({
          courseName: targetCourse?.name || 'Przedmiot',
          title: sessionObj.title,
        });
        setTimeout(() => setDroppedFeedback(null), 4000);
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-gray-900 border-r border-gray-800 flex flex-col h-full z-50 transform transition-transform duration-300 ease-in-out md:static md:w-60 md:transform-none ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo / App name + Mobile Close button */}
        <div className="px-4 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GraduationCap size={20} className="text-white flex-shrink-0" />
              <span className="text-sm font-bold text-white truncate">StudyOrganizer</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[170px]">{user?.email}</p>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 md:hidden flex-shrink-0 transition-colors"
            title="Zamknij menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main navigation */}
        <nav className="px-2 py-3 space-y-0.5">
          <NavItem to="/today" icon={<CalendarDays size={15} />} label="Dziś" onClick={onCloseMobile} />
          <NavItem to="/calendar" icon={<Calendar size={15} />} label="Kalendarz" onClick={onCloseMobile} />
          <NavItem
            to="/tasks"
            icon={<CheckSquare size={15} />}
            label="Zadania"
            badge={unreadTasks > 0 ? unreadTasks : null}
            onClick={onCloseMobile}
          />
          <NavItem to="/inbox" icon={<Inbox size={15} />} label="Discord & Inbox" onClick={onCloseMobile} />
          <button
            type="button"
            onClick={() => {
              openFloatingDashboard('teams');
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:text-white bg-gray-850 hover:bg-gray-800 border border-gray-750 transition-all mt-1 group shadow-xs text-left"
            title="Otwórz okno w oknie: Prawdziwy panel Teams & UPeL AGH"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🪟</span>
              <span>Okno w oknie</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-750 text-gray-200 font-bold group-hover:scale-105 transition-all">
              Teams/UPeL
            </span>
          </button>
        </nav>

      {/* Dropped event converted to note feedback toast */}
      {droppedFeedback && (
        <div className="mx-2 mb-2 p-2 rounded-lg bg-amber-950/90 border border-amber-600/80 text-[11px] text-amber-200 shadow-md">
          <p className="font-bold flex items-center gap-1 text-amber-300">
            <span>📝</span> Zapisano jako notatkę!
          </p>
          <p className="truncate text-gray-300 mt-0.5 font-medium">
            {droppedFeedback.title}
          </p>
          <p className="text-[10px] text-amber-400/90 truncate">
            Przeniesiono do: {droppedFeedback.courseName}
          </p>
        </div>
      )}

      {/* Courses list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Przedmioty
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleInitSemester2}
              disabled={isInitializing}
              className="text-xs text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
              title="Automatycznie stwórz 8 przedmiotów z semestru 2 i powiąż ich zajęcia z kalendarza"
            >
              <Sparkles size={14} className={isInitializing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAddCourse(true)}
              className="text-gray-500 hover:text-white transition-colors p-1"
              title="Dodaj przedmiot"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {initFeedback && (
          <div className="mx-1 mb-2 p-2 bg-emerald-950/60 border border-emerald-700/80 rounded-lg text-[11px] text-emerald-300 flex items-center gap-1.5 shadow-sm">
            <Check size={13} className="text-emerald-400 shrink-0" />
            <span>{initFeedback}</span>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="px-2 py-3 space-y-2 text-center bg-gray-850/60 rounded-xl border border-gray-800 m-1">
            <p className="text-xs text-gray-400">Brak przedmiotów w panelu.</p>
            <button
              onClick={handleInitSemester2}
              disabled={isInitializing}
              className="w-full py-1.5 px-2 bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles size={13} className={isInitializing ? 'animate-spin' : ''} />
              <span>{isInitializing ? 'Wiązanie...' : 'Powiąż przedmioty Semestr 2'}</span>
            </button>
          </div>
        ) : (
          <>
            {courses.length < 8 && (
              <button
                onClick={handleInitSemester2}
                disabled={isInitializing}
                className="w-full text-left text-[11px] text-gray-300 bg-gray-850 hover:bg-gray-800 border border-gray-750 rounded-xl px-2.5 py-1.5 mb-2 flex items-center justify-between transition-all group"
                title="Dodaj brakujące przedmioty z czatów Semestru 2 i powiąż ich zajęcia"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles size={12} className="text-gray-400 group-hover:rotate-12 transition-transform" />
                  <span>Powiąż przedmioty Semestr 2</span>
                </span>
                <span className="text-[10px] font-bold bg-gray-750 text-gray-200 px-1.5 py-0.5 rounded-full">
                  {isInitializing ? '...' : '+8'}
                </span>
              </button>
            )}
            <ul className="space-y-2">
            {courses.map((course, index) => {
              const isDragTarget = dragOverCourseId === course.id;
              const isSelected = selectedCourseId === course.id;
              const courseSessions = sessions.filter((s) => s.courseId === course.id && !s.isConvertedToNote);
              const subsections = getCourseSubsections(courseSessions);

              return (
                <li
                  key={course.id}
                  className="relative"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCourseId(course.id);
                  }}
                  onDragLeave={() => setDragOverCourseId(null)}
                  onDrop={(e) => handleDropOnCourse(e, course.id)}
                >
                  <div
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      navigate(`/course/${course.id}`);
                      onCloseMobile();
                    }}
                    className={`
                      group w-full flex flex-col p-2.5 rounded-xl text-left
                      text-sm transition-all cursor-pointer border shadow-xs
                      ${isDragTarget
                        ? 'bg-zinc-800 border-white text-white scale-[1.02] shadow-lg ring-1 ring-white/30'
                        : isSelected
                        ? 'bg-gray-800 border-gray-650 text-white ring-1 ring-white/10 shadow-sm'
                        : 'bg-gray-850/50 hover:bg-gray-800/90 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-base leading-none flex-shrink-0">
                        {TYPE_ICONS[course.type] || '📓'}
                      </span>
                      <span className="truncate flex-1 text-xs font-semibold text-gray-200 group-hover:text-white">
                        {course.name}
                      </span>

                      {/* Quick Link Status Badges */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {course.teamsUrl && (
                          <span title="Teams skonfigurowany" className="text-[10px]">
                            👥
                          </span>
                        )}
                        {course.upelUrl && (
                          <span title="UPeL skonfigurowany" className="text-[10px]">
                            🎓
                          </span>
                        )}

                        {/* Quick Edit icon button (visible on mobile, hover on desktop) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                          }}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-all"
                          title="Edytuj przedmiot / dodaj linki UPeL i Teams"
                        >
                          <Edit3 size={11} />
                        </button>

                        {isSelected && (
                          <ChevronRight size={12} className="text-white" />
                        )}
                      </div>
                    </div>

                    {/* Subsections Mini Pills (CWA, CWL, CWP, WYK...) */}
                    {subsections.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-6 pt-1.5 border-t border-gray-800/60">
                        {subsections.map((sub) => (
                          <span
                            key={sub.code}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourseId(course.id);
                              navigate(`/course/${course.id}?sub=${sub.code}`);
                              onCloseMobile();
                            }}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded hover:brightness-125 transition-all cursor-pointer shadow-xs"
                            style={{
                              backgroundColor: `${sub.color}25`,
                              color: sub.color,
                              border: `1px solid ${sub.color}55`,
                            }}
                            title={`${sub.label} (${sub.count} zajęć) - kliknij, by przefiltrować`}
                          >
                            {sub.code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Graphical separation divider between subjects */}
                  {index < courses.length - 1 && (
                    <div className="mx-2 mt-1.5 border-b border-gray-800/60" />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>

      {/* Bottom: Theme toggle + Settings + logout */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-1">
        {!isStandalone && (isInstallable || isIos) && (
          <button
            type="button"
            onClick={installApp}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 hover:bg-indigo-900/70 hover:text-white transition-all shadow-sm mb-1 group"
            title="Zainstaluj aplikację na telefonie lub komputerze"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Download size={14} className="text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="truncate">Zainstaluj aplikację</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold flex-shrink-0">
              PWA
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title={theme === 'light' ? 'Przełącz na tryb ciemny' : 'Przełącz na tryb jasny'}
        >
          <div className="flex items-center gap-2">
            <span>{theme === 'light' ? '☀️' : '🌙'}</span>
            <span>{theme === 'light' ? 'Tryb jasny' : 'Tryb ciemny'}</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-750 text-gray-300 font-bold">
            {theme === 'light' ? 'Jasny' : 'Ciemny'}
          </span>
        </button>
        <NavItem to="/settings" icon={<Settings size={15} />} label="Ustawienia" onClick={onCloseMobile} />
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          Wyloguj
        </button>
      </div>

      {(showAddCourse || editingCourse) && (
        <CourseModal
          course={editingCourse}
          onClose={() => {
            setShowAddCourse(false);
            setEditingCourse(null);
          }}
        />
      )}
    </aside>
  </>
  );
}

function NavItem({ to, icon, label, badge, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
          isActive
            ? 'bg-white text-zinc-950 font-semibold shadow-sm'
            : 'text-gray-400 hover:bg-gray-800/80 hover:text-white font-medium'
        }`
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.2 min-w-[18px] text-center leading-none">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
