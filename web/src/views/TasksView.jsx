import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  CheckSquare, Square, Plus, Trash2, Clock, Filter,
  CheckCircle2, AlertCircle, BookOpen, Calendar, AlertTriangle
} from 'lucide-react';
import { format, isToday, isPast, isTomorrow, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import AddTaskModal from '../components/AddTaskModal';
import { Timestamp } from 'firebase/firestore';

export default function TasksView() {
  const { tasks, courses, toggleTask, deleteTask } = useData();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'all' | 'done'
  const [courseFilter, setCourseFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab === 'active' && task.done) return false;
      if (activeTab === 'done' && !task.done) return false;

      // Course filter
      if (courseFilter !== 'all' && task.courseId !== courseFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      return true;
    });
  }, [tasks, activeTab, courseFilter, priorityFilter]);

  const activeCount = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const renderDeadlineBadge = (deadline) => {
    if (!deadline) return null;
    const date = deadline?.toDate?.() || new Date(deadline);
    if (isNaN(date.getTime())) return null;

    if (isPast(date) && !isToday(date)) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/70 border border-red-800/80 px-2 py-0.5 rounded-full">
          <AlertCircle size={11} /> Przeterminowane ({format(date, 'd MMM', { locale: pl })})
        </span>
      );
    }
    if (isToday(date)) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded-full animate-pulse">
          <Clock size={11} /> Dziś!
        </span>
      );
    }
    if (isTomorrow(date)) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-300 bg-sky-950/70 border border-sky-800/80 px-2 py-0.5 rounded-full">
          <Clock size={11} /> Jutro
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
        <Calendar size={11} /> {format(date, 'd MMMM yyyy', { locale: pl })}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 flex flex-col h-full w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-3.5 sm:p-4 shadow-sm w-full max-w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckSquare size={20} className="text-white flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Zadania & Projekty</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-800 border border-gray-700 text-gray-300 flex-shrink-0">
              {activeCount}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            Wejściówki, sprawozdania, etapy projektów i zadania własne
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-sm flex-shrink-0"
        >
          <Plus size={14} />
          <span>Dodaj zadanie</span>
        </button>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-400">Postęp semestralny:</span>
            <span className="text-emerald-400">{doneCount} / {totalCount} ukończonych ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-gray-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Status Tabs */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
          {[
            { id: 'active', label: `Do zrobienia (${activeCount})` },
            { id: 'all', label: `Wszystkie (${totalCount})` },
            { id: 'done', label: `Ukończone (${doneCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2">
          {/* Filter by course */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">Wszystkie przedmioty</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filter by priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">Wszystkie priorytety</option>
            <option value="high">🔴 Pilne</option>
            <option value="medium">🟡 Średnie</option>
            <option value="low">🟢 Niskie</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2 flex-1">
        {filteredTasks.length === 0 ? (
          <div className="py-14 text-center bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 space-y-2">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-semibold text-white">
              {activeTab === 'done' ? 'Brak ukończonych zadań w tej kategorii' : 'Brak zadań do zrobienia!'}
            </p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Możesz dodać nowe zadanie powyżej lub przypisać zadanie bezpośrednio do zajęć w kalendarzu.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const course = getCourse(task.courseId);
            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                  task.done
                    ? 'bg-gray-950/60 border-gray-850 opacity-60'
                    : 'bg-gray-900/80 border-gray-800 hover:border-gray-700 shadow-sm'
                }`}
              >
                {/* Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTask(task.id, !task.done)}
                  className={`mt-0.5 flex-shrink-0 transition-colors ${
                    task.done ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'
                  }`}
                  title={task.done ? 'Oznacz jako nieukończone' : 'Oznacz jako zrobione'}
                >
                  {task.done ? <CheckCircle2 size={18} /> : <Square size={18} />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-snug break-words ${
                      task.done ? 'line-through text-gray-500' : 'text-white'
                    }`}>
                      {task.title}
                    </p>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all flex-shrink-0"
                      title="Usuń zadanie"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Note with Minimalist Yellow Exclamation Icon Badge */}
                  {task.note && (
                    <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 font-medium">
                      <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 animate-pulse" />
                      <span className="truncate flex-1">{task.note}</span>
                    </div>
                  )}

                  {/* Metadata Chips: Course, Session, Priority, Deadline */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {/* Course Badge */}
                    {course && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1"
                        style={{
                          backgroundColor: `${course.color || '#3B82F6'}15`,
                          borderColor: `${course.color || '#3B82F6'}50`,
                          color: course.color || '#93C5FD',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: course.color || '#3B82F6' }}
                        />
                        {course.name}
                      </span>
                    )}

                    {/* Session / Class info if linked */}
                    {task.sessionTitle && (
                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <BookOpen size={10} />
                        Zajęcia: {task.sessionTitle}
                      </span>
                    )}

                    {/* Priority Badge */}
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        task.priority === 'high'
                          ? 'bg-red-950/80 text-red-300 border border-red-800/80'
                          : task.priority === 'low'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {task.priority === 'high' ? '🔴 Pilne' : task.priority === 'low' ? '🟢 Niskie' : '🟡 Średnie'}
                    </span>

                    {/* Deadline Badge */}
                    {renderDeadlineBadge(task.deadline)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
