import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import WeekGridView from '../components/WeekGridView';
import SessionDetailModal from '../components/SessionDetailModal';
import AddSessionModal from '../components/AddSessionModal';
import { Calendar, RefreshCw, Plus, Filter, Settings, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CalendarView() {
  const {
    sessions,
    courses,
    syncGoogleCalendar,
    syncingGoogle,
    googleSessionsCount,
    calendarCourseFilter,
    setCalendarCourseFilter,
  } = useData();

  const [showAddSession, setShowAddSession] = useState(false);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);
  const [modalInitialEdit, setModalInitialEdit] = useState(false);

  const handleOpenSessionModal = (session, editMode = false) => {
    setSelectedSessionForModal(session);
    setModalInitialEdit(editMode);
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  // Filter sessions by course from global preferences
  const displayedSessions = calendarCourseFilter === 'all'
    ? sessions
    : sessions.filter((s) => s.courseId === calendarCourseFilter);

  const activeCourse = courses.find((c) => c.id === calendarCourseFilter);

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-2.5 sm:space-y-4 flex flex-col w-full max-w-full min-w-0">
      {/* Header (Flattened, slim and compact) */}
      <div className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar size={16} className="text-white flex-shrink-0" />
          <h1 className="text-sm sm:text-base font-bold text-white truncate">Plan zajęć</h1>
          <span className="text-xs text-gray-400 font-medium hidden md:inline truncate">
            • {sessions.length} wydarzeń
          </span>
        </div>

        {/* Action Buttons & Settings shortcut */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Active course filter pill if set in Settings */}
          {activeCourse && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-200 font-semibold shadow-xs">
              <span className="truncate max-w-[100px] sm:max-w-[150px]">{activeCourse.name}</span>
              <button
                type="button"
                onClick={() => setCalendarCourseFilter('all')}
                className="hover:text-white transition-colors"
                title="Wyczyść filtr przedmiotu"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <Link
            to="/settings"
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white transition-colors border border-gray-750 shadow-sm"
            title="Otwórz ustawienia planu, motywu i filtrów"
          >
            <Settings size={13} />
          </Link>

          <button
            onClick={() => syncGoogleCalendar(true)}
            disabled={syncingGoogle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-gray-750 disabled:opacity-50 shadow-sm"
            title="Pobierz najnowsze terminy z USOS i Google Calendar"
          >
            <RefreshCw size={12} className={syncingGoogle ? 'animate-spin text-white' : 'text-gray-400'} />
            <span className="hidden sm:inline">{syncingGoogle ? 'Pobieranie...' : 'Synchronizuj'}</span>
          </button>

          <button
            onClick={() => setShowAddSession(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-sm flex-shrink-0"
          >
            <Plus size={13} />
            <span>Dodaj</span>
          </button>
        </div>
      </div>

      {/* Week Grid Calendar */}
      <div className="w-full">
        <WeekGridView
          sessions={displayedSessions}
          courses={courses}
          onSelectSession={(session) => handleOpenSessionModal(session, false)}
          onEditSession={(session) => handleOpenSessionModal(session, true)}
        />
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
    </div>
  );
}
