import React, { useState, useEffect } from 'react';
import {
  X, Clock, MapPin, Video, ExternalLink, Calendar,
  AlertCircle, CheckCircle, FileText, Send, BookOpen,
  Edit3, Trash2, Plus, Check, AlertTriangle, Square, CheckSquare, Navigation
} from 'lucide-react';
import { format, differenceInMinutes, addDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import { Timestamp } from 'firebase/firestore';
import { parseAghLocation, isSessionOnline } from '../utils/aghCampus';
import { getEffectiveUpelLink, getAllCourseUpelLinks } from '../utils/courseMatcher';
import RichHtmlDescription from './RichHtmlDescription';
import TransitAssistant from './TransitAssistant';

export default function SessionDetailModal({ session, course, onClose, initialEditing = false }) {
  if (!session) return null;

  const { updateSession, deleteSession, addTask, toggleTask, deleteTask, tasks, courses } = useData();

  const start = session.start?.toDate?.() || new Date(session.start);
  const end = session.end?.toDate?.() || new Date(session.end);
  const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
  const aghLoc = parseAghLocation(session.location, session.description, session.title);
  const effectiveTeamsLink = session.teamsLink || course?.teamsUrl || null;
  const effectiveUpel = getEffectiveUpelLink(session, course);
  const effectiveUpelLink = effectiveUpel?.url || null;
  const isOnline = isSessionOnline(session, aghLoc);
  
  const sessionTasks = (tasks || []).filter((t) => t.sessionId === session.id && !t.done);
  const doneSessionTasks = (tasks || []).filter((t) => t.sessionId === session.id && t.done);
  
  // Custom cancellation/status flag
  const [localCancelled, setLocalCancelled] = useState(
    session.isCancelled || /odwo'ane|odwolane|brak zaj|brak/i.test(session.title + ' ' + (session.description || ''))
  );
  const isCancelled = localCancelled;

  // Check if course is missing/deleted
  const isOrphanedCourse = !!session.courseId && !course;

  // Custom slot states (for CWP, project defense, 15-min review slot)
  const [showSlotConfig, setShowSlotConfig] = useState(!!session.customSlotTime);
  const [slotTime, setSlotTime] = useState(session.customSlotTime || '');
  const [slotDuration, setSlotDuration] = useState(session.customSlotDuration || '15');
  const [slotMode, setSlotMode] = useState(session.customSlotMode || 'online'); // 'online' | 'onsite'
  const [slotLocation, setSlotLocation] = useState(session.customSlotLocation || '');

  // Edit states (full time, date, title, location & course editing)
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editTitle, setEditTitle] = useState(session.title || '');
  const [editDate, setEditDate] = useState(
    isValidDate(start) ? format(start, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [editStartTime, setEditStartTime] = useState(
    isValidDate(start) ? format(start, 'HH:mm') : '08:00'
  );
  const [editEndTime, setEditEndTime] = useState(
    isValidDate(end) ? format(end, 'HH:mm') : '09:30'
  );
  const [editMode, setEditMode] = useState(session.mode || (session.teamsLink ? 'online' : 'onsite'));
  const [editCategory, setEditCategory] = useState(session.category || 'academic');
  const [editLocation, setEditLocation] = useState(session.location || '');
  const [editTeamsLink, setEditTeamsLink] = useState(session.teamsLink || '');
  const [editUpelLink, setEditUpelLink] = useState(session.upelUrl || '');
  const [selectedCourseId, setSelectedCourseId] = useState(session.courseId || '');
  const [notes, setNotes] = useState(session.studentNotes || '');
  const [notesSavedMsg, setNotesSavedMsg] = useState(false);
  const [statusFeedbackMsg, setStatusFeedbackMsg] = useState(null);
  const [topicsToSend, setTopicsToSend] = useState(session.topicsToSend || '');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state if session prop updates
  useEffect(() => {
    if (!session) return;
    setLocalCancelled(
      Boolean(session.isCancelled) || /odwo'ane|odwolane|brak zaj|brak/i.test(session.title + ' ' + (session.description || ''))
    );
    setEditTitle(session.title || '');
    const sStart = session.start?.toDate?.() || new Date(session.start);
    const sEnd = session.end?.toDate?.() || new Date(session.end);
    if (isValidDate(sStart)) {
      setEditDate(format(sStart, 'yyyy-MM-dd'));
      setEditStartTime(format(sStart, 'HH:mm'));
    }
    if (isValidDate(sEnd)) {
      setEditEndTime(format(sEnd, 'HH:mm'));
    }
    setEditMode(session.mode || (session.teamsLink ? 'online' : 'onsite'));
    setEditCategory(session.category || 'academic');
    setEditLocation(session.location || '');
    setEditTeamsLink(session.teamsLink || '');
    setEditUpelLink(session.upelUrl || '');
    setSelectedCourseId(session.courseId || '');
    setNotes(session.studentNotes || '');
    setTopicsToSend(session.topicsToSend || '');
    setShowSlotConfig(!!session.customSlotTime);
    setSlotTime(session.customSlotTime || '');
    setSlotDuration(session.customSlotDuration || '15');
    setSlotMode(session.customSlotMode || 'online');
    setSlotLocation(session.customSlotLocation || '');
  }, [session]);

  // Quick Task states
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskAddedMsg, setTaskAddedMsg] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleCopyTopics = () => {
    navigator.clipboard.writeText(topicsToSend);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNotes = async () => {
    await updateSession(session.id, { studentNotes: notes.trim() });
    setNotesSavedMsg(true);
    setTimeout(() => setNotesSavedMsg(false), 2000);
  };

  // Quick Time Shift helpers
  const shiftMinutes = (deltaMin) => {
    try {
      const curStart = new Date(`${editDate}T${editStartTime}:00`);
      const curEnd = new Date(`${editDate}T${editEndTime}:00`);
      const newStart = new Date(curStart.getTime() + deltaMin * 60000);
      const newEnd = new Date(curEnd.getTime() + deltaMin * 60000);
      setEditDate(format(newStart, 'yyyy-MM-dd'));
      setEditStartTime(format(newStart, 'HH:mm'));
      setEditEndTime(format(newEnd, 'HH:mm'));
    } catch (err) {
      console.warn('shiftMinutes error:', err);
    }
  };

  const setDuration = (durationMin) => {
    try {
      const curStart = new Date(`${editDate}T${editStartTime}:00`);
      const newEnd = new Date(curStart.getTime() + durationMin * 60000);
      setEditEndTime(format(newEnd, 'HH:mm'));
    } catch (err) {
      console.warn('setDuration error:', err);
    }
  };

  const shiftDays = (deltaDays) => {
    try {
      const curStart = new Date(`${editDate}T${editStartTime}:00`);
      const newStart = addDays(curStart, deltaDays);
      setEditDate(format(newStart, 'yyyy-MM-dd'));
    } catch (err) {
      console.warn('shiftDays error:', err);
    }
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const newStart = new Date(`${editDate}T${editStartTime}:00`);
      let newEnd = new Date(`${editDate}T${editEndTime}:00`);
      if (isNaN(newStart.getTime())) throw new Error('Nieprawidłowa data');
      if (isNaN(newEnd.getTime()) || newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 90 * 60000);
      }

      await updateSession(session.id, {
        title: editTitle.trim(),
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
        category: editCategory,
        mode: editMode,
        location: editMode === 'onsite' ? (editLocation.trim() || null) : null,
        teamsLink: editMode === 'online' ? (editTeamsLink.trim() || null) : null,
        upelUrl: editUpelLink.trim() || null,
        courseId: selectedCourseId || null,
        studentNotes: notes.trim() || null,
        customSlotTime: slotTime.trim() || null,
        customSlotDuration: slotTime.trim() ? slotDuration : null,
        customSlotMode: slotTime.trim() ? slotMode : null,
        customSlotLocation: slotLocation.trim() || null,
        topicsToSend: topicsToSend.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Błąd zapisu zmian:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuickSlot = async () => {
    setSaving(true);
    try {
      await updateSession(session.id, {
        customSlotTime: slotTime.trim() || null,
        customSlotDuration: slotTime.trim() ? slotDuration : null,
        customSlotMode: slotTime.trim() ? slotMode : null,
        customSlotLocation: slotLocation.trim() || null,
      });
      setShowSlotConfig(false);
    } catch (err) {
      console.error('Błąd zapisu slotu:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCancel = async () => {
    const nextStatus = !isCancelled;
    setLocalCancelled(nextStatus);
    setStatusFeedbackMsg(nextStatus ? '❌ Oznaczono: Brak zajęć' : '✅ Przywrócono zajęcia');
    setTimeout(() => setStatusFeedbackMsg(null), 3000);
    await updateSession(session.id, {
      isCancelled: nextStatus,
    });
    if (session.gcalId && session.gcalId !== session.id) {
      await updateSession(session.gcalId, {
        isCancelled: nextStatus,
      });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await addTask({
      title: taskTitle.trim(),
      courseId: session.courseId || null,
      sessionId: session.id,
      sessionTitle: session.title,
      deadline: Timestamp.fromDate(end),
      priority: taskPriority,
      note: `Zadanie do zajęć: ${session.title}`,
    });

    setTaskTitle('');
    setShowTaskForm(false);
    setTaskAddedMsg(true);
    setTimeout(() => setTaskAddedMsg(false), 3000);
  };

  const handleConfirmDelete = async () => {
    await deleteSession(session.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b border-gray-800 flex items-start justify-between gap-3 ${
          isCancelled ? 'bg-red-950/40' : 'bg-gray-850'
        }`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isCancelled ? 'bg-red-900/70 text-red-200' : 'bg-blue-900/70 text-blue-200'
              }`}>
                {isCancelled ? '❌ Brak zajęć / Odwołane' : isOnline ? '🖥️ Zdalnie' : '🏛️ Na uczelni'}
              </span>
              {session.calendarName && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                  {session.calendarName}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-gray-800 border border-blue-500 rounded-lg px-2.5 py-1 text-sm text-white font-bold focus:outline-none"
              />
            ) : (
              <h2 className={`text-lg font-bold leading-snug ${
                isCancelled ? 'line-through text-gray-400' : 'text-white'
              }`}>
                {session.title}
              </h2>
            )}

            {course && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-white/90 font-semibold">{course.name}</span>
                {effectiveUpel && (
                  <a
                    href={effectiveUpel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/80 hover:bg-orange-900 text-orange-300 border border-orange-700/80 flex items-center gap-1 font-semibold transition-colors"
                    title={`${effectiveUpel.label} na platformie UPeL AGH`}
                  >
                    <span>🎓</span> {effectiveUpel.label} ↗
                  </a>
                )}
                {effectiveTeamsLink && (
                  <a
                    href={effectiveTeamsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/80 flex items-center gap-1 font-semibold transition-colors"
                    title="Microsoft Teams dla tego przedmiotu"
                  >
                    <span>👥</span> Teams ↗
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Edytuj dane zajęć"
            >
              <Edit3 size={16} />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Usuń / Ukryj te zajęcia"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 text-sm text-gray-300">
          {/* Converted to note banner */}
          {session.isConvertedToNote && (
            <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-600/80 text-xs text-amber-200 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="text-xl flex-shrink-0">📝</span>
                <div>
                  <p className="font-bold text-amber-300">Wydarzenie zapisane jako notatka do przedmiotu</p>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Zostało usunięte z godzinowej siatki zajęć i przypięte jako zasób/notatka w przedmiocie.
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateSession(session.id, { isConvertedToNote: false })}
                className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs flex-shrink-0 shadow transition-colors"
                title="Przywróć to wydarzenie jako normalne zajęcia w siatce godzinowej"
              >
                Przywróć do planu
              </button>
            </div>
          )}

          {/* Time & Duration of overall block */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-800/60 border border-gray-750">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-blue-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white">
                  {format(start, 'EEEE, d MMMM yyyy', { locale: pl })}
                </p>
                <p className="text-xs text-gray-400">
                  Godziny: <strong className="text-white font-mono">{format(start, 'HH:mm')} – {format(end, 'HH:mm')}</strong> ({differenceInMinutes(end, start)} minut)
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Zmień godzinę, dzień lub szczegóły wydarzenia"
              >
                <Edit3 size={13} />
                <span>Zmień godzinę</span>
              </button>
            )}
          </div>

          {/* 🎯 CUSTOM MEETING SLOT (CWP, 15-min review, project defense) */}
          <div className="p-3.5 rounded-xl bg-gray-850/80 border border-gray-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <span>🎯</span> Twój indywidualny slot spotkania (CWP / Zdanie projektu)
              </span>
              <button
                onClick={() => setShowSlotConfig(!showSlotConfig)}
                className="text-[11px] text-gray-400 hover:text-white font-semibold"
              >
                {showSlotConfig ? 'Zwiń' : session.customSlotTime ? 'Zmień slot' : '+ Ustaw godzinę'}
              </button>
            </div>

            {/* Display active custom slot */}
            {session.customSlotTime && !showSlotConfig && (
              <div className="p-2.5 rounded-lg bg-gray-800/80 border border-gray-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-sm">{session.customSlotTime}</span>
                    <span className="text-gray-400 text-[11px]">({session.customSlotDuration || 15} min)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-700 text-gray-200 uppercase font-semibold">
                      {session.customSlotMode === 'online' ? '🖥️ Zdalnie' : '🏛️ Na miejscu'}
                    </span>
                  </p>
                  {session.customSlotLocation && (
                    <p className="text-[11px] text-emerald-300 mt-0.5">
                      📍 {session.customSlotLocation}
                    </p>
                  )}
                </div>
                {session.customSlotMode === 'online' && effectiveTeamsLink && (
                  <a
                    href={effectiveTeamsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold flex items-center gap-1 shadow-sm"
                    title={session.teamsLink ? 'Dołącz do spotkania' : `Dołącz do Teams (${course?.name || 'Przedmiot'})`}
                  >
                    <ExternalLink size={12} /> Dołącz
                  </a>
                )}
              </div>
            )}

            {/* Config Form for custom slot */}
            {showSlotConfig && (
              <div className="pt-1 space-y-2.5 border-t border-indigo-800/40">
                <p className="text-[11px] text-gray-400">
                  Wpisz dokładną godzinę Twojej kolejki (np. obrona projektu, 15 minut na Teams):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Godzina (np. 16:15):</label>
                    <input
                      type="text"
                      value={slotTime}
                      onChange={(e) => setSlotTime(e.target.value)}
                      placeholder="16:15"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Czas trwania (min):</label>
                    <input
                      type="number"
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(e.target.value)}
                      placeholder="15"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[10px] text-gray-400">Forma:</label>
                  <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="slotMode"
                      checked={slotMode === 'online'}
                      onChange={() => setSlotMode('online')}
                      className="text-blue-500"
                    />
                    🖥️ Zdalnie (Teams)
                  </label>
                  <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="slotMode"
                      checked={slotMode === 'onsite'}
                      onChange={() => setSlotMode('onsite')}
                      className="text-blue-500"
                    />
                    🏛️ Na miejscu
                  </label>
                </div>

                {slotMode === 'onsite' && (
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Sala na miejscu (opcjonalnie):</label>
                    <input
                      value={slotLocation}
                      onChange={(e) => setSlotLocation(e.target.value)}
                      placeholder="np. sala 203 w B5"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => setShowSlotConfig(false)}
                    className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-white"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveQuickSlot}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Zapisz slot
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Warning Banner if course was deleted (e.g. consultations after semester) */}
          {isOrphanedCourse && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  Zajęcia / Konsultacje bez aktywnego przedmiotu
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Możesz normalnie dodać zadanie, dołączyć do Teams lub przepiąć do innego przedmiotu.
                </p>
              </div>
              <button
                onClick={() => updateSession(session.id, { courseId: null })}
                className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-[10px] font-semibold border border-amber-700 flex-shrink-0"
              >
                Odepnij przedmiot
              </button>
            </div>
          )}

          {/* Edit Form Fields if in Edit Mode */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-gray-800/95 border-2 border-blue-500/60 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                  <Edit3 size={14} /> Modyfikacja wydarzenia i godzin
                </span>
                <span className="text-[10px] text-gray-400">Zmiany zapisują się natychmiast</span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Nazwa wydarzenia / zajęć:</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="np. Sieci Komputerowe (l) lub Rozmowa kwalifikacyjna"
                />
              </div>

              {/* Course selection */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Przypisany przedmiot:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">(Brak — wolne zajęcia / wydarzenie ogólne)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Quick Date shifts */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Data:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 flex-1 font-mono"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => shiftDays(-1)}
                      className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-750 text-[11px] text-gray-300 border border-gray-700"
                      title="Przesuń na dzień wcześniej"
                    >
                      -1 dzień
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDate(format(new Date(), 'yyyy-MM-dd'))}
                      className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-750 text-[11px] text-blue-300 border border-gray-700 font-semibold"
                      title="Ustaw dzisiejszą datę"
                    >
                      Dziś
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftDays(1)}
                      className="px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-750 text-[11px] text-gray-300 border border-gray-700"
                      title="Przesuń na kolejny dzień"
                    >
                      +1 dzień
                    </button>
                  </div>
                </div>
              </div>

              {/* Hours: Start & End */}
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Godzina rozpoczęcia:</label>
                    <input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-300 mb-1">Godzina zakończenia:</label>
                    <input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Quick Time Shift Controls */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-gray-750">
                  <span className="text-[10px] text-gray-400 font-medium mr-1">Przesuń godzinę:</span>
                  <button
                    type="button"
                    onClick={() => shiftMinutes(-15)}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 border border-gray-700"
                    title="Cofnij o 15 minut"
                  >
                    -15 min
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMinutes(15)}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 border border-gray-700"
                    title="Przesuń do przodu o 15 minut"
                  >
                    +15 min
                  </button>
                  <button
                    type="button"
                    onClick={() => shiftMinutes(60)}
                    className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[10px] text-gray-300 border border-gray-700"
                    title="Przesuń do przodu o 1 godzinę"
                  >
                    +1 godzina
                  </button>
                  <span className="text-gray-600">|</span>
                  <span className="text-[10px] text-gray-400 font-medium">Czas trwania:</span>
                  <button
                    type="button"
                    onClick={() => setDuration(45)}
                    className="px-2 py-1 rounded bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700 text-[10px] text-indigo-300"
                    title="Ustaw czas trwania na 45 minut"
                  >
                    45 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(90)}
                    className="px-2 py-1 rounded bg-blue-950/70 hover:bg-blue-900 border border-blue-700 text-[10px] text-blue-300 font-semibold"
                    title="Ustaw czas trwania na standardowe 90 minut AGH"
                  >
                    90 min (AGH)
                  </button>
                </div>
              </div>

              {/* Mode & Category */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Forma zajęć:</label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="onsite">🏛️ Na uczelni (stacjonarnie)</option>
                    <option value="online">🖥️ Zdalnie (Teams / Meet)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">Kategoria:</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="academic">Zajęcia uczelniane (USOS)</option>
                    <option value="personal">Wydarzenie własne / Spotkanie</option>
                  </select>
                </div>
              </div>

              {/* Location & Teams link */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Sala / Budynek na AGH (lub Zdalnie):
                  </label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="np. B-9 sala 012 lub Zdalnie"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                    Link do Teams (odnośnik do zadań / spotkania):
                  </label>
                  <input
                    value={editTeamsLink}
                    onChange={(e) => setEditTeamsLink(e.target.value)}
                    placeholder="https://teams.microsoft.com/... (link do kanału / zadań / spotkania)"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-300">
                      Kurs na platformie UPeL (AGH):
                    </label>
                    <span className="text-[10px] text-orange-400 font-medium">Wykład vs Laby</span>
                  </div>
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditUpelLink('')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                        !editUpelLink ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      ⚡ Auto (wg typu zajęć)
                    </button>
                    {course?.upelWykUrl && (
                      <button
                        type="button"
                        onClick={() => setEditUpelLink(course.upelWykUrl)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          editUpelLink === course.upelWykUrl ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900'
                        }`}
                      >
                        📘 UPeL Wykład
                      </button>
                    )}
                    {course?.upelLabUrl && (
                      <button
                        type="button"
                        onClick={() => setEditUpelLink(course.upelLabUrl)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          editUpelLink === course.upelLabUrl ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                        }`}
                      >
                        📗 UPeL Laby
                      </button>
                    )}
                    {course?.upelProjUrl && (
                      <button
                        type="button"
                        onClick={() => setEditUpelLink(course.upelProjUrl)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          editUpelLink === course.upelProjUrl ? 'bg-amber-600 border-amber-500 text-white' : 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900'
                        }`}
                      >
                        📙 UPeL Projekt
                      </button>
                    )}
                  </div>
                  <input
                    value={editUpelLink}
                    onChange={(e) => setEditUpelLink(e.target.value)}
                    placeholder={effectiveUpel?.url || "https://upel.agh.edu.pl/course/view.php?id=..."}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Możesz wybrać kurs wykładu, labów lub wkleić link do dedykowanego podkursu Twojej grupy.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold shadow-sm transition-colors"
                >
                  {saving ? 'Zapisuję...' : 'Zapisz zmiany'}
                </button>
              </div>
            </div>
          )}

          {/* Normal View: Location or Teams Link */}
          {!isEditing && (
            <>
              {isOnline ? (
                /* ── ONLINE SECTION ── */
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/50 via-gray-900 to-gray-900 border border-indigo-700/60 space-y-3 shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                        <Video size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">
                          {aghLoc.isRemote ? 'Zajęcia Zdalne (Budynek A0 USOS)' : 'Zajęcia Zdalne (Online)'}
                        </p>
                        <p className="text-xs text-indigo-300/80">
                          {effectiveTeamsLink
                            ? (session.teamsLink ? 'Bezpośredni link do spotkania / wykładu' : `Teams przedmiotu (${course?.name || 'Przedmiot'})`)
                            : 'Wymagane dołączenie online (brak dodanego linku)'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {effectiveTeamsLink ? (
                    <a
                      href={effectiveTeamsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-indigo-400/30"
                    >
                      <Video size={16} />
                      <span>Dołącz do spotkania online (Teams)</span>
                      <ExternalLink size={13} className="opacity-90 ml-1" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-200 text-xs font-semibold rounded-xl border border-indigo-700/70 transition-colors"
                    >
                      <Plus size={14} className="text-indigo-400" />
                      <span>Dodaj link do spotkania (MS Teams / Zoom)</span>
                    </button>
                  )}
                </div>
              ) : (aghLoc.isOnsite || session.location) ? (
                /* ── ONSITE SECTION (Asystent dojazdu: Jakdojadę & Google Maps & Kiedy wyjść) ── */
                <TransitAssistant session={session} />
              ) : null}

              {/* Ancillary Teams link banner for on-site class (e.g. English course tasks) */}
              {effectiveTeamsLink && !isOnline && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base flex-shrink-0">👥</span>
                    <div>
                      <p className="font-semibold text-white text-xs">Materiały i zadania w Microsoft Teams</p>
                      <p className="text-[11px] text-indigo-300/80">
                        Zajęcia odbywają się stacjonarnie, a odnośnik służy do zadań i plików
                      </p>
                    </div>
                  </div>
                  <a
                    href={effectiveTeamsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow"
                  >
                    <span>Otwórz Teams</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* UPeL Platform Course for this session */}
              {(effectiveUpel || course?.upelWykUrl || course?.upelLabUrl) && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-950/30 via-gray-900 to-gray-900 border border-orange-800/60 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-orange-600/20 border border-orange-500/40 text-orange-400">
                        <span className="text-base leading-none">🎓</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs flex items-center gap-1.5">
                          <span>Kurs na platformie UPeL:</span>
                          <strong className="text-orange-300 font-bold">{effectiveUpel?.label || 'Domyślny kurs'}</strong>
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {session.upelUrl
                            ? 'Dedykowany kurs wybrany dla tych zajęć'
                            : 'Automatycznie dopasowano wg typu zajęć'}
                        </p>
                      </div>
                    </div>

                    {effectiveUpel && (
                      <a
                        href={effectiveUpel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-colors shadow"
                      >
                        <span>Otwórz UPeL</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  {/* Quick Course UPeL switcher if course has specific links */}
                  {(course?.upelWykUrl || course?.upelLabUrl) && (
                    <div className="flex items-center gap-1.5 pt-2 border-t border-orange-900/40 flex-wrap">
                      <span className="text-[10px] text-orange-400 font-medium">Szybki wybór UPeL:</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateSession(session.id, { upelUrl: null });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                          !session.upelUrl
                            ? 'bg-orange-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                        title="Dopasuj automatycznie wg typu zajęć (wykład / laby)"
                      >
                        ⚡ Auto
                      </button>
                      {course.upelWykUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSession(session.id, { upelUrl: course.upelWykUrl });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                            session.upelUrl === course.upelWykUrl
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-950/60 text-blue-300 hover:bg-blue-900'
                          }`}
                        >
                          📘 Wykład
                        </button>
                      )}
                      {course.upelLabUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSession(session.id, { upelUrl: course.upelLabUrl });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                            session.upelUrl === course.upelLabUrl
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900'
                          }`}
                        >
                          📗 Laby
                        </button>
                      )}
                      {course.upelProjUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            await updateSession(session.id, { upelUrl: course.upelProjUrl });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                            session.upelUrl === course.upelProjUrl
                              ? 'bg-amber-600 text-white'
                              : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900'
                          }`}
                        >
                          📙 Projekt
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Special Section: Brak zajęć ale wyślij tematy */}
          {isCancelled && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <AlertCircle size={15} />
                Zajęcia odwołane — tematy / zadania do przesłania
              </div>
              <p className="text-[11px] text-gray-400">
                Wpisz tematy lub sprawozdania, które trzeba wysłać prowadzącemu mimo braku fizycznych zajęć:
              </p>
              <textarea
                value={topicsToSend}
                onChange={(e) => setTopicsToSend(e.target.value)}
                placeholder="np. Przesłać sprawozdanie nr 2 do godziny 20:00 na UPeL / mail..."
                rows={2}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => updateSession(session.id, { topicsToSend })}
                  className="text-[11px] text-gray-400 hover:text-white"
                >
                  Zapisz notatkę
                </button>
                {topicsToSend && (
                  <button
                    onClick={handleCopyTopics}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <Send size={11} />
                    {copied ? 'Skopiowano do schowka!' : 'Kopiuj treść do wysłania'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 📝 PRIVATE STUDENT NOTES (triggers the ❗ icon in plan) */}
          <div className="p-3.5 rounded-xl bg-gray-800/50 border border-gray-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-400" />
                Twoja notatka do tych zajęć (wyświetla ❗ w planie)
              </span>
              {notesSavedMsg && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check size={12} /> Zapisano!
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="np. Dziś wejściówka z rozdziału 3, przynieść sprawozdanie..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
              >
                Zapisz notatkę
              </button>
            </div>
          </div>

          {/* Zadania do tych konkretnych zajęć */}
          <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-400" />
                Zadania do tych zajęć
                {sessionTasks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-900/80 text-sky-200 border border-sky-700 font-bold">
                    {sessionTasks.length}
                  </span>
                )}
              </span>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white font-semibold"
              >
                <Plus size={12} />
                {showTaskForm ? 'Zwiń' : 'Dodaj zadanie'}
              </button>
            </div>

            {/* List of existing active tasks linked to this session */}
            {sessionTasks.length > 0 ? (
              <div className="space-y-1.5">
                {sessionTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-900/80 border border-gray-750 hover:border-gray-650 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        onClick={() => toggleTask(t.id, true)}
                        className="text-gray-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                        title="Oznacz jako zrobione"
                      >
                        <Square size={15} />
                      </button>
                      <span className="text-xs text-gray-200 truncate font-medium">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          t.priority === 'high'
                            ? 'bg-red-950 text-red-300 border border-red-800/80'
                            : t.priority === 'low'
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                        }`}
                      >
                        {t.priority === 'high' ? 'Pilne' : t.priority === 'low' ? 'Niski' : 'Średni'}
                      </span>
                      <button
                        onClick={() => deleteTask(t.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        title="Usuń zadanie"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showTaskForm ? (
              <p className="text-[11px] text-gray-500 italic">
                Brak przypisanych zadań (np. wejściówki, sprawozdania). Kliknij „Dodaj zadanie”, aby utworzyć.
              </p>
            ) : null}

            {/* Done tasks count */}
            {doneSessionTasks.length > 0 && (
              <div className="pt-1 text-[10px] text-gray-500 flex items-center gap-1.5">
                <CheckSquare size={11} className="text-emerald-500" />
                <span>Ukończone dla tych zajęć: {doneSessionTasks.length}</span>
              </div>
            )}

            {taskAddedMsg && (
              <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <Check size={13} /> Dodano zadanie powiązane z tymi zajęciami!
              </p>
            )}

            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="pt-2 space-y-2 border-t border-gray-700/60">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="np. Przygotować wejściówkę / sprawozdanie..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {[
                      { id: 'high', label: 'Pilne' },
                      { id: 'medium', label: 'Średnie' },
                      { id: 'low', label: 'Niskie' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTaskPriority(p.id)}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          taskPriority === p.id
                            ? 'bg-amber-600 text-white shadow'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm"
                  >
                    Zapisz zadanie
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Description from USOS / Calendar */}
          {session.description && (
            <div className="p-3.5 rounded-xl bg-gray-800/50 border border-gray-700/80 space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-gray-400" /> Informacje z USOS / Kalendarza
              </p>
              <RichHtmlDescription content={session.description} />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-800 flex items-center justify-between gap-2 bg-gray-850 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleCancel}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm ${
                isCancelled
                  ? 'bg-emerald-900/60 border border-emerald-600 text-emerald-200 hover:bg-emerald-800'
                  : 'bg-red-900/40 border border-red-700 text-red-200 hover:bg-red-800'
              }`}
            >
              {isCancelled ? '✅ Przywróć zajęcia' : '❌ Oznacz jako: Brak zajęć'}
            </button>
            {statusFeedbackMsg && (
              <span className="text-[11px] font-semibold text-amber-300 animate-pulse">
                {statusFeedbackMsg}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold transition-colors flex-shrink-0"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Confirmation Prompt for Delete / Hide */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-red-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 font-bold text-base">
              <AlertTriangle size={22} />
              Potwierdź usunięcie
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Czy na pewno chcesz usunąć/ukryć te zajęcia:
              <br />
              <b className="text-white mt-1 block">"{session.title}"</b>?
              <br />
              Zajęcia znikną z Twojego planu w aplikacji.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:text-white"
              >
                Anuluj
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Tak, usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
