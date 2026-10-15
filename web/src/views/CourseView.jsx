import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { ExternalLink, Pin, Trash2, Link2, Clock, BookOpen, Edit3, Zap, Plus, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import ClassCard from '../components/ClassCard';
import RichHtmlDescription from '../components/RichHtmlDescription';
import CourseModal from '../components/CourseModal';
import SessionDetailModal from '../components/SessionDetailModal';
import DiscordWidget from '../components/DiscordWidget';
import TeamsWidget from '../components/TeamsWidget';
import UpelWidget from '../components/UpelWidget';
import {
  findMatchingSessionsForCourse,
  getCourseTypeConfig,
  getCourseSubsections,
  detectUsosTypeCode,
  getAllCourseUpelLinks,
  matchesCourse,
} from '../utils/courseMatcher';

const TABS = ['Plan', 'Wiadomości', 'Pliki', 'Zasoby', 'Zadania'];

export default function CourseView() {
  const {
    courses,
    sessions,
    tasks,
    messages,
    pinResource,
    unpinResource,
    toggleTask,
    updateSession,
    linkCourseSessions,
    selectedCourseId,
    addMessage,
    deleteMessage,
  } = useData();

  // Support both URL param and sidebar selection
  const { courseId: paramId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseId = paramId || selectedCourseId;
  const course = courses.find((c) => c.id === courseId);

  const [activeTab, setActiveTab] = useState('Plan');
  const [activeIntegration, setActiveIntegration] = useState('discord'); // 'discord' | 'teams' | 'upel'
  const [dragOver, setDragOver] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSessionForModal, setSelectedSessionForModal] = useState(null);
  const [modalInitialEdit, setModalInitialEdit] = useState(false);

  // Active subsection filter (e.g. 'ALL', 'CWL', 'CWP', 'WYK', 'CWA')
  const initialSub = searchParams.get('sub') || 'ALL';
  const [selectedSubsection, setSelectedSubsection] = useState(initialSub);

  useEffect(() => {
    const s = searchParams.get('sub');
    if (s && s !== selectedSubsection) {
      setSelectedSubsection(s);
    } else if (!s && selectedSubsection !== 'ALL') {
      setSelectedSubsection('ALL');
    }
  }, [searchParams]);

  const handleSelectSubsection = (code) => {
    setSelectedSubsection(code);
    if (code === 'ALL') {
      searchParams.delete('sub');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), sub: code });
    }
  };

  const courseSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (s.isConvertedToNote || s.category === 'personal') return false;
      return s.courseId === courseId || (!s.courseId && matchesCourse(s.title, course?.name));
    });
  }, [sessions, courseId, course?.name]);

  const courseNoteSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (!s.isConvertedToNote || s.category === 'personal') return false;
      return s.courseId === courseId || (!s.courseId && matchesCourse(s.title, course?.name));
    });
  }, [sessions, courseId, course?.name]);

  const courseTasks = tasks.filter((t) => t.courseId === courseId);
  const courseMessages = messages.filter((m) => m.courseId === courseId);

  // Available subsections derived from course sessions
  const availableSubsections = useMemo(() => {
    return getCourseSubsections(courseSessions);
  }, [courseSessions]);

  // Filtered sessions based on active subsection
  const displayedSessions = useMemo(() => {
    if (selectedSubsection === 'ALL') return courseSessions;
    return courseSessions.filter((s) => {
      const code = detectUsosTypeCode(s.title, s.description) || 'INNE';
      return code === selectedSubsection;
    });
  }, [courseSessions, selectedSubsection]);

  const activeSubObj = availableSubsections.find((s) => s.code === selectedSubsection);

  // Real-time matching for semi-automatic session linking
  const matchingSessions = useMemo(() => {
    return findMatchingSessionsForCourse(sessions, course?.name);
  }, [sessions, course?.name]);

  const unlinkedSessions = useMemo(() => {
    return matchingSessions.filter((s) => s.courseId !== course?.id);
  }, [matchingSessions, course?.id]);

  if (!course) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
        Wybierz przedmiot z panelu bocznego
      </div>
    );
  }

  // Drag-and-drop: accept messages or calendar sessions
  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type === 'calendar_session' && data.sessionId) {
        const sessionObj = sessions.find((s) => s.id === data.sessionId) || data;
        let dateText = '';
        try {
          const sDate = sessionObj.start?.toDate?.() || new Date(sessionObj.start);
          dateText = format(sDate, 'd MMM yyyy, HH:mm', { locale: pl });
        } catch {}

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

        await updateSession(data.sessionId, {
          courseId: courseId,
          isConvertedToNote: true,
        });
      } else {
        const msg = data;
        await pinResource(courseId, {
          type: msg.type || 'link',
          icon: '🔗',
          title: msg.content?.slice(0, 80) || 'Zasób z Discorda / Teams',
          url: msg.url || msg.content,
          source: msg.source || 'discord',
          messageId: msg.id,
          pinnedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Drop error in CourseView:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 pb-3 sm:pb-4 border-b border-gray-800 w-full max-w-full min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            className="w-2.5 sm:w-3.5 h-8 sm:h-10 rounded-full flex-shrink-0"
            style={{ backgroundColor: course.color }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 min-w-0">
              <span className="truncate">{course.name}</span>
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-400 font-normal border border-gray-700 flex-shrink-0">
                Wraper
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400">
                {courseSessions.length} zajęć w planie
              </span>
              {availableSubsections.length > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {availableSubsections.map((sub) => (
                      <span
                        key={sub.code}
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${sub.color}22`,
                          color: sub.color,
                          border: `1px solid ${sub.color}55`,
                        }}
                      >
                        {sub.code}: {sub.count}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons & Links */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Quick Auto-Link Button if unlinked sessions exist */}
          {unlinkedSessions.length > 0 && (
            <button
              onClick={async () => {
                await linkCourseSessions(course.id, unlinkedSessions.map((s) => s.id));
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-600 text-indigo-200 text-xs font-bold transition-all shadow"
              title="Automatycznie przypisz wszystkie pasujące zajęcia z kalendarza do tego przedmiotu"
            >
              <Zap size={12} className="text-amber-400 animate-pulse" />
              <span>Połącz {unlinkedSessions.length} z USOS</span>
            </button>
          )}

          {/* Teams Link */}
          {course.teamsUrl ? (
            <a
              href={course.teamsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-gray-200 text-xs font-semibold transition-colors shadow-xs"
              title="Otwórz zespół lub spotkanie w Microsoft Teams"
            >
              <ExternalLink size={11} />
              <span>Teams</span>
            </a>
          ) : (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-gray-700 text-gray-400 hover:bg-gray-800/80 hover:text-white text-xs font-medium transition-colors"
              title="Wklej link do spotkań lub zespołu w Teams"
            >
              <Plus size={11} />
              <span>Teams</span>
            </button>
          )}

          {/* UPeL Links (separated between Wykład, Laby, Projekt) */}
          {(() => {
            const upelLinks = getAllCourseUpelLinks(course);
            if (upelLinks.length > 0) {
              return upelLinks.map((u) => (
                <a
                  key={u.type}
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                    u.type === 'lab'
                      ? 'bg-emerald-950/60 border-emerald-600/80 hover:bg-emerald-900 text-emerald-300'
                      : u.type === 'project'
                      ? 'bg-amber-950/60 border-amber-600/80 hover:bg-amber-900 text-amber-300'
                      : 'bg-orange-600/20 border-orange-600/80 hover:bg-orange-600/30 text-orange-400'
                  }`}
                  title={`Otwórz ${u.label} na platformie UPeL AGH`}
                >
                  <ExternalLink size={11} />
                  <span>{u.label}</span>
                </a>
              ));
            }
            return (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-orange-500/50 text-orange-400 hover:bg-orange-950/40 text-xs font-medium transition-colors"
                title="Wklej linki do kursów na platformie UPeL AGH (wykład, laby)"
              >
                <Plus size={11} />
                <span>UPeL</span>
              </button>
            );
          })()}

          {/* Discord Channel Link */}
          {course.discordUrl || course.discordChannelName ? (
            <a
              href={course.discordUrl || 'discord://'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#5865F2]/20 border border-[#5865F2] hover:bg-[#5865F2]/30 text-indigo-300 text-xs font-semibold transition-colors shadow-sm"
              title={`Otwórz kanał ${course.discordChannelName || ''} na serwerze Discord`}
            >
              <span>🎮</span>
              <span>{course.discordChannelName || 'Discord'}</span>
              <ExternalLink size={11} />
            </a>
          ) : (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-indigo-500/50 text-indigo-300 hover:bg-indigo-950/40 text-xs font-medium transition-colors"
              title="Przypisz kanał z serwera Discord"
            >
              <Plus size={11} />
              <span>Discord</span>
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            title="Edytuj nazwę, typ, kolory lub linki tego przedmiotu"
          >
            <Edit3 size={11} />
            <span>Edytuj</span>
          </button>
        </div>
      </div>

      {/* Subsections Selector Bar */}
      {availableSubsections.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 p-2 bg-gray-900/90 rounded-xl border border-gray-800 shadow-sm overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-gray-400 px-1.5 flex items-center gap-1 whitespace-nowrap">
            <span>📂</span> Podsekcje:
          </span>

          <button
            onClick={() => handleSelectSubsection('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedSubsection === 'ALL'
                ? 'bg-white text-zinc-950 shadow-sm scale-[1.02]'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <span>Wszystkie</span>
            <span className="text-[10px] bg-black/30 text-zinc-900 px-1.5 py-0.2 rounded-full font-semibold">
              {courseSessions.length}
            </span>
          </button>

          {availableSubsections.map((sub) => {
            const isSelected = selectedSubsection === sub.code;
            return (
              <button
                key={sub.code}
                onClick={() => handleSelectSubsection(sub.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border whitespace-nowrap ${
                  isSelected
                    ? 'text-white shadow-md ring-2 ring-white/30 scale-[1.02]'
                    : 'bg-gray-800/80 text-gray-300 hover:text-white hover:bg-gray-750 border-gray-750'
                }`}
                style={{
                  backgroundColor: isSelected ? sub.color : undefined,
                  borderColor: isSelected ? sub.color : undefined,
                }}
              >
                <span>{sub.label}</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full text-white font-semibold">
                  {sub.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-4 gap-1 overflow-x-auto no-scrollbar flex-nowrap w-full">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-white text-white font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB: PLAN ─────────────────────────────── */}
      {activeTab === 'Plan' && (
        <div className="space-y-2">
          {selectedSubsection !== 'ALL' && activeSubObj && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-850 border border-gray-750 text-xs text-gray-300 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeSubObj.color }}
                />
                <span className="font-semibold text-white">
                  Filtrowanie podsekcji: {activeSubObj.label} ({displayedSessions.length} zajęć)
                </span>
              </div>
              <button
                onClick={() => handleSelectSubsection('ALL')}
                className="text-[11px] text-gray-400 hover:text-white underline font-medium"
              >
                Pokaż wszystkie moduły
              </button>
            </div>
          )}

          {displayedSessions.length === 0 ? (
            <p className="text-sm text-gray-600">
              {selectedSubsection !== 'ALL'
                ? `Brak terminów dla podsekcji ${activeSubObj?.label || selectedSubsection}.`
                : 'Brak zaplanowanych zajęć z USOS/ręcznie.'}
            </p>
          ) : (
            displayedSessions.map((s) => (
              <ClassCard
                key={s.id}
                session={s}
                course={course}
                onClick={() => {
                  setSelectedSessionForModal(s);
                  setModalInitialEdit(false);
                }}
                onEdit={() => {
                  setSelectedSessionForModal(s);
                  setModalInitialEdit(true);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* ── TAB: WIADOMOŚCI & INTEGRACJE ─────────────── */}
      {activeTab === 'Wiadomości' && (
        <div className="space-y-5">
          {/* Platform Switcher Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/90 border border-gray-800 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-lg border border-gray-800">
              <button
                type="button"
                onClick={() => setActiveIntegration('discord')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeIntegration === 'discord'
                    ? 'bg-[#5865F2] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🎮</span>
                <span>Discord</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveIntegration('teams')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeIntegration === 'teams'
                    ? 'bg-[#6264A7] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>👥</span>
                <span>MS Teams</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveIntegration('upel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeIntegration === 'upel'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>🎓</span>
                <span>UPeL AGH</span>
              </button>
            </div>

            <div className="text-[11px] text-gray-500 hidden sm:block">
              Wszystkie platformy zintegrowane pod przedmiot <span className="text-gray-300 font-semibold">{course.name}</span>
            </div>
          </div>

          {/* Active Interactive Widget */}
          {activeIntegration === 'discord' && <DiscordWidget currentCourseId={courseId} />}
          {activeIntegration === 'teams' && <TeamsWidget currentCourseId={courseId} />}
          {activeIntegration === 'upel' && <UpelWidget currentCourseId={courseId} />}

          {/* Saved Announcements & Notes from this course if any exist */}
          {courseMessages.length > 0 && (
            <div className="pt-4 border-t border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <span>📌</span> Zapisane ogłoszenia i notatki ({courseMessages.length})
                </h4>
                <span className="text-[11px] text-gray-500">Przeciągnij do Zasobów, aby przypiąć</span>
              </div>
              <div className="space-y-2">
                {courseMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    courseId={courseId}
                    onPin={pinResource}
                    onDelete={deleteMessage}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PLIKI ────────────────────────────── */}
      {activeTab === 'Pliki' && (
        <div className="space-y-4">
          {/* UPeL Platform Courses (separated by type) */}
          <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🎓</span> Kursy na platformie UPeL AGH
              </h3>
              <span className="text-[10px] text-gray-400">Materiały, zadania i testy</span>
            </div>
            
            {(() => {
              const upelLinks = getAllCourseUpelLinks(course);
              if (upelLinks.length === 0) {
                return (
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-gray-750 text-xs text-gray-400 flex items-center justify-between">
                    <span>Nie przypisano jeszcze linków do UPeL dla tego przedmiotu.</span>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px]"
                    >
                      Dodaj linki UPeL
                    </button>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {upelLinks.map((u) => (
                    <div
                      key={u.type}
                      className="p-3 rounded-xl bg-gray-900/80 border border-gray-750 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{u.icon}</span>
                          <span>{u.label}</span>
                        </span>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5 font-mono">{u.url}</p>
                      </div>
                      <a
                        href={u.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 flex-shrink-0 transition-colors shadow"
                      >
                        <ExternalLink size={12} />
                        <span>Otwórz</span>
                      </a>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Teams Files */}
          <div className="p-4 rounded-xl bg-gray-800 border border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <span>👥</span> Materiały na Teams
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Przejdź jednym kliknięciem bezpośrednio do folderu z plikami i prezentacjami tego przedmiotu:
            </p>
            {course.teamsUrl ? (
              <a
                href={course.teamsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <ExternalLink size={14} />
                Otwórz folder plików w Microsoft Teams
              </a>
            ) : (
              <p className="text-xs text-amber-400">
                Nie podałeś jeszcze linku do Teams dla tego przedmiotu. Możesz go dodać w edycji przedmiotu lub przypiąć link w zakładce <b>Zasoby</b>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ZASOBY (PINNED) ──────────────────── */}
      {activeTab === 'Zasoby' && (
        <div>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={`
              border-2 border-dashed rounded-xl p-4 mb-4 text-center text-xs transition-colors
              ${dragOver
                ? 'border-blue-500 bg-blue-900/20 text-blue-400'
                : 'border-gray-700 text-gray-600'}
            `}
          >
            <Pin size={16} className="mx-auto mb-1" />
            Przeciągnij wiadomość z Discorda lub Teams tutaj, aby przypiąć jako zasób
          </div>

          {/* Pinned resources list */}
          {(course.resources || []).length === 0 ? (
            <p className="text-sm text-gray-600">Brak przypiętych zasobów ani notatek.</p>
          ) : (
            <div className="space-y-2">
              {course.resources.map((res, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-800/80 border border-gray-750 hover:border-gray-700 transition-colors">
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {res.icon || (res.type === 'note' ? '📝' : '🔗')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{res.title}</p>
                    {res.dateText && (
                      <p className="text-xs text-amber-300 font-medium mt-0.5">
                        📅 {res.dateText} {res.location ? `• 🏛️ ${res.location}` : ''}
                      </p>
                    )}
                    {res.notes && (
                      <div className="mt-1 bg-gray-900/60 p-2 rounded-lg border border-gray-750">
                        <RichHtmlDescription content={res.notes} />
                      </div>
                    )}
                    <p className="text-[11px] text-gray-500 mt-1">
                      {res.source || 'Zasób'} · {res.pinnedAt?.slice(0, 10)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    {res.sessionId && (
                      <button
                        onClick={async () => {
                          await updateSession(res.sessionId, { isConvertedToNote: false });
                          await unpinResource(courseId, i);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-gray-700/80 hover:bg-gray-700 text-[11px] font-semibold text-gray-300 hover:text-white transition-colors border border-gray-600"
                        title="Przywróć to wydarzenie do normalnej siatki godzinowej w kalendarzu"
                      >
                        Przywróć do planu
                      </button>
                    )}
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-gray-700/50"
                        title="Otwórz link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => unpinResource(courseId, i)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700/50 transition-colors"
                      title="Usuń notatkę"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ZADANIA ──────────────────────────── */}
      {activeTab === 'Zadania' && (
        <div className="space-y-2">
          {courseTasks.length === 0 ? (
            <p className="text-sm text-gray-600">Brak zadań dla tego przedmiotu.</p>
          ) : (
            courseTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800">
                <button onClick={() => toggleTask(task.id, true)} className="text-gray-500 hover:text-green-400 transition-colors">
                  <BookOpen size={15} />
                </button>
                <div className="flex-1">
                  <p className="text-sm text-white">{task.title}</p>
                  {task.deadline && (
                    <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {format(task.deadline?.toDate?.() || new Date(task.deadline), 'd MMMM yyyy', { locale: pl })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && (
        <CourseModal course={course} onClose={() => setShowEditModal(false)} />
      )}

      {/* Session Detail / Edit Modal */}
      {selectedSessionForModal && (
        <SessionDetailModal
          session={sessions.find((s) => s.id === selectedSessionForModal.id) || selectedSessionForModal}
          course={course}
          initialEditing={modalInitialEdit}
          onClose={() => {
            setSelectedSessionForModal(null);
            setModalInitialEdit(false);
          }}
        />
      )}
    </div>
  );
}

function MessageBubble({ msg, courseId, onPin, onDelete }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(msg));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-800/80 hover:bg-gray-750 border border-gray-750 transition-colors cursor-grab active:cursor-grabbing group shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-bold text-white">{msg.author}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
            msg.source === 'discord'
              ? 'bg-[#5865F2]/20 text-indigo-300 border border-[#5865F2]/40'
              : 'bg-blue-950 text-blue-300 border border-blue-800'
          }`}>
            {msg.source === 'discord' ? '🎮 Discord' : '🟦 Teams'}
          </span>
          {msg.channelName && (
            <span className="text-[10px] font-mono text-indigo-300/80">
              {msg.channelName}
            </span>
          )}
          <span className="text-[10px] text-gray-500">
            {msg.timestamp ? (typeof msg.timestamp === 'string' ? msg.timestamp.slice(0, 16).replace('T', ' ') : '') : ''}
          </span>
        </div>
        <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onPin(courseId, { type: 'link', title: msg.content?.slice(0, 80), url: msg.url || msg.content, source: msg.source, messageId: msg.id })}
          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-gray-700 transition-colors"
          title="Przypnij jako zasób przedmiotu"
        >
          <Pin size={14} />
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(msg.id)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="Usuń tę wiadomość"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
