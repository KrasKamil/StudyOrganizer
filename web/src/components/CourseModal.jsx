import React, { useState, useMemo } from 'react';
import { X, ExternalLink, Link, Zap, Trash2, Check, Sparkles } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import {
  findMatchingSessionsForCourse,
  extractSuggestedCoursesFromSessions,
  COURSE_TYPES,
  getCourseTypeConfig,
  getCourseSubsections,
} from '../utils/courseMatcher';

export default function CourseModal({ course = null, onClose }) {
  const isEditing = !!course;
  const { courses, sessions, addCourse, updateCourse, deleteCourse, linkCourseSessions } = useData();

  const [form, setForm] = useState({
    name: course?.name || '',
    type: course?.type || 'lecture',
    color: course?.color || '#3B82F6',
    upelUrl: course?.upelUrl || '',
    upelWykUrl: course?.upelWykUrl || course?.upelUrl || '',
    upelLabUrl: course?.upelLabUrl || '',
    upelProjUrl: course?.upelProjUrl || '',
    teamsUrl: course?.teamsUrl || '',
    discordChannelName: course?.discordChannelName || '',
    discordUrl: course?.discordUrl || '',
    discordServerName: course?.discordServerName || 'Teleinformatyka magisterka 2025/6',
  });

  const [autoLink, setAutoLink] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Suggestions extracted from USOS calendar sessions for new courses
  const suggestions = useMemo(() => {
    if (isEditing) return [];
    return extractSuggestedCoursesFromSessions(sessions, courses);
  }, [isEditing, sessions, courses]);

  // Find matching sessions in real time based on entered name
  const matchingSessions = useMemo(() => {
    if (!form.name.trim()) return [];
    return findMatchingSessionsForCourse(sessions, form.name.trim());
  }, [sessions, form.name]);

  const matchingSubsections = useMemo(() => {
    return getCourseSubsections(matchingSessions);
  }, [matchingSessions]);

  const unlinkedCount = useMemo(() => {
    return matchingSessions.filter((s) => s.courseId !== course?.id).length;
  }, [matchingSessions, course]);

  const selectedType = getCourseTypeConfig(form.type);

  const handleApplySuggestion = (sug) => {
    const matchedType = getCourseTypeConfig(sug.type);
    setForm((prev) => ({
      ...prev,
      name: sug.name,
      type: sug.type || 'lecture',
      color: sug.color || matchedType.color || prev.color,
      teamsUrl: sug.teamsUrl || prev.teamsUrl,
      upelUrl: sug.upelUrl || prev.upelUrl,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      let targetCourseId = course?.id;

      const effectiveGeneralUpel = form.upelWykUrl?.trim() || form.upelLabUrl?.trim() || form.upelUrl?.trim() || null;

      if (isEditing) {
        await updateCourse(course.id, {
          name: form.name.trim(),
          type: form.type,
          color: form.color || selectedType.color,
          upelUrl: effectiveGeneralUpel,
          upelWykUrl: form.upelWykUrl?.trim() || null,
          upelLabUrl: form.upelLabUrl?.trim() || null,
          upelProjUrl: form.upelProjUrl?.trim() || null,
          teamsUrl: form.teamsUrl?.trim() || null,
          discordChannelName: form.discordChannelName?.trim() || null,
          discordUrl: form.discordUrl?.trim() || null,
          discordServerName: form.discordServerName?.trim() || 'Teleinformatyka magisterka 2025/6',
        });
      } else {
        targetCourseId = await addCourse({
          name: form.name.trim(),
          type: form.type,
          color: form.color || selectedType.color,
          upelUrl: effectiveGeneralUpel,
          upelWykUrl: form.upelWykUrl?.trim() || null,
          upelLabUrl: form.upelLabUrl?.trim() || null,
          upelProjUrl: form.upelProjUrl?.trim() || null,
          teamsUrl: form.teamsUrl?.trim() || null,
          discordChannelName: form.discordChannelName?.trim() || null,
          discordUrl: form.discordUrl?.trim() || null,
          discordServerName: form.discordServerName?.trim() || 'Teleinformatyka magisterka 2025/6',
        });
      }

      // Auto-link matching sessions if enabled
      if (autoLink && targetCourseId && matchingSessions.length > 0) {
        const sessionIds = matchingSessions.map((s) => s.id);
        await linkCourseSessions(targetCourseId, sessionIds);
      }

      onClose();
    } catch (err) {
      console.error('Error saving course:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!course) return;
    await deleteCourse(course.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-850">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {isEditing ? '✏️' : '🎓'}
            </span>
            <h2 className="text-sm font-bold text-white">
              {isEditing ? `Edytuj przedmiot: ${course.name}` : 'Dodaj nowy przedmiot'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Smart Suggestions from USOS Calendar */}
          {!isEditing && suggestions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                  <Sparkles size={14} className="text-blue-400" />
                  <span>Wykryte przedmioty z Twojego planu USOS (kliknij, by uzupełnić):</span>
                </div>
                <span className="text-[10px] text-blue-400/80 font-medium">
                  {suggestions.length} wykrytych
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySuggestion(sug)}
                    className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-blue-500 text-left transition-all hover:scale-[1.02] shadow-sm group"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="text-xs font-bold text-white group-hover:text-blue-300">
                        {sug.name}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-gray-900 px-1.5 py-0.5 rounded">
                        {sug.totalSessions || sug.sessions?.length} zajęć
                      </span>
                    </div>

                    {/* Detected subsections badges (WYK, CWL, CWP...) */}
                    {sug.subsections?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {sug.subsections.map((sub) => (
                          <span
                            key={sub.code}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
                            style={{
                              backgroundColor: `${sub.color}25`,
                              color: sub.color,
                              border: `1px solid ${sub.color}55`,
                            }}
                          >
                            {sub.code}: {sub.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form id="course-form" onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                Nazwa przedmiotu *
              </label>
              <input
                autoFocus={!isEditing}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Systemy Wbudowane, Sieci Komputerowe..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                Typ zajęć (rodzaj USOS: CWA, CWL, CWP, WYK...)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {COURSE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value, color: t.color })}
                    className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                      form.type === t.value
                        ? 'border-zinc-500 bg-zinc-800 text-white shadow-sm ring-1 ring-white/20'
                        : 'border-gray-750 bg-gray-800/60 text-gray-400 hover:border-gray-650 hover:text-gray-300'
                    }`}
                  >
                    <span className="font-bold">{t.label}</span>
                    <span className="text-[9px] text-gray-400">{t.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* UPeL Platform Links - Separation between Lecture and Labs */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-950/30 via-gray-900 to-gray-900 border border-orange-800/70 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-orange-900/50 pb-2">
                <label className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                  <Link size={14} /> Kursy na platformie UPeL (AGH)
                </label>
                <span className="text-[10px] text-orange-400/90 font-medium bg-orange-950/80 px-2 py-0.5 rounded border border-orange-800/80">
                  Rozdzielenie: Wykład vs Laby
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Jeśli masz różnych prowadzących i dwa osobne kursy na UPeL, wklej linki poniżej. Aplikacja automatycznie dopasuje odpowiedni UPeL do zajęć (wykład / laby)!
              </p>

              {/* Wykład UPeL */}
              <div className="space-y-1 bg-gray-900/80 p-2.5 rounded-lg border border-blue-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-300 flex items-center gap-1">
                    <span>📘</span> UPeL — Wykład (lub ogólny):
                  </span>
                  {form.upelWykUrl && (
                    <a
                      href={form.upelWykUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 underline font-semibold"
                    >
                      <ExternalLink size={10} /> Testuj
                    </a>
                  )}
                </div>
                <input
                  value={form.upelWykUrl}
                  onChange={(e) => setForm({ ...form, upelWykUrl: e.target.value, upelUrl: e.target.value })}
                  placeholder="https://upel.agh.edu.pl/course/view.php?id=... (Wykład)"
                  className="w-full bg-gray-950 border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Laby UPeL */}
              <div className="space-y-1 bg-gray-900/80 p-2.5 rounded-lg border border-emerald-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                    <span>📗</span> UPeL — Laboratoria (laby):
                  </span>
                  {form.upelLabUrl && (
                    <a
                      href={form.upelLabUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 underline font-semibold"
                    >
                      <ExternalLink size={10} /> Testuj
                    </a>
                  )}
                </div>
                <input
                  value={form.upelLabUrl}
                  onChange={(e) => setForm({ ...form, upelLabUrl: e.target.value })}
                  placeholder="https://upel.agh.edu.pl/course/view.php?id=... (Laboratoria)"
                  className="w-full bg-gray-950 border border-emerald-900/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Projekt UPeL */}
              <div className="space-y-1 bg-gray-900/80 p-2.5 rounded-lg border border-amber-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                    <span>📙</span> UPeL — Projekt (opcjonalnie):
                  </span>
                  {form.upelProjUrl && (
                    <a
                      href={form.upelProjUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 underline font-semibold"
                    >
                      <ExternalLink size={10} /> Testuj
                    </a>
                  )}
                </div>
                <input
                  value={form.upelProjUrl}
                  onChange={(e) => setForm({ ...form, upelProjUrl: e.target.value })}
                  placeholder="https://upel.agh.edu.pl/course/view.php?id=... (Projekt)"
                  className="w-full bg-gray-955 border border-amber-900/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Teams Meeting / Channel Link */}
            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-850/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                  <Link size={13} /> Link do spotkań / zespołu Microsoft Teams
                </label>
                {form.teamsUrl && (
                  <a
                    href={form.teamsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 underline font-semibold"
                  >
                    <ExternalLink size={10} /> Testuj link
                  </a>
                )}
              </div>
              <input
                value={form.teamsUrl}
                onChange={(e) => setForm({ ...form, teamsUrl: e.target.value })}
                placeholder="https://teams.microsoft.com/l/team/... lub link do spotkania"
                className="w-full bg-gray-900 border border-blue-900/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-gray-400">
                Umożliwi natychmiastowe dołączanie do wykładów zdalnych i folderu z plikami bez szukania w Teams.
              </p>
            </div>

            {/* Discord Channel & Server Link */}
            <div className="p-3 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>🎮</span> Kanał Discord na serwerze <em>Teleinformatyka magisterka 2025/6</em>
                </label>
                {form.discordUrl && (
                  <a
                    href={form.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline font-semibold"
                  >
                    <ExternalLink size={10} /> Testuj w Discord
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Nazwa kanału (np. #deep-learning):</label>
                  <input
                    value={form.discordChannelName}
                    onChange={(e) => setForm({ ...form, discordChannelName: e.target.value })}
                    placeholder="#nazwa-kanału"
                    className="w-full bg-gray-900 border border-indigo-800/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Link do kanału na Discordzie:</label>
                  <input
                    value={form.discordUrl}
                    onChange={(e) => setForm({ ...form, discordUrl: e.target.value })}
                    placeholder="https://discord.com/channels/... lub discord://..."
                    className="w-full bg-gray-900 border border-indigo-800/60 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">
                W Discordzie kliknij prawym przyciskiem myszy na kanał przedmiotu i wybierz <b>Kopiuj link do kanału</b>. Wtedy kliknięcie w aplikacji od razu otworzy ten kanał.
              </p>
            </div>

            {/* ⚡ Semi-automatic linking with Calendar Sessions */}
            {form.name.trim().length >= 3 && (
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/60 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-400" />
                    Półautomatyczne powiązanie z zajęciami USOS
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-200 border border-indigo-700">
                    {matchingSessions.length} terminów w planie
                  </span>
                </div>

                <p className="text-[11px] text-gray-300">
                  {matchingSessions.length > 0 ? (
                    <>
                      Znaleziono <strong>{matchingSessions.length}</strong> pasujących zajęć w Twoim kalendarzu
                      {unlinkedCount > 0 && ` (${unlinkedCount} jeszcze nieprzypisanych)`}.
                    </>
                  ) : (
                    'Wpisz nazwę zbliżoną do nazwy w USOS, by automatycznie powiązać zajęcia.'
                  )}
                </p>

                {matchingSubsections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] text-indigo-300 font-semibold mr-1">Podsekcje w wraperze:</span>
                    {matchingSubsections.map((sub) => (
                      <span
                        key={sub.code}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${sub.color}25`,
                          color: sub.color,
                          border: `1px solid ${sub.color}55`,
                        }}
                      >
                        {sub.label} ({sub.count})
                      </span>
                    ))}
                  </div>
                )}

                {matchingSessions.length > 0 && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoLink}
                      onChange={(e) => setAutoLink(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-gray-900 border-gray-700 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-white">
                      Automatycznie powiąż te {matchingSessions.length} zajęć z tym przedmiotem
                    </span>
                  </label>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-gray-850">
          <div>
            {isEditing && (
              <>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-semibold"
                  >
                    <Trash2 size={13} /> Usuń przedmiot
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-red-300 font-bold">Na pewno?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px]"
                    >
                      Tak, usuń
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-0.5 rounded text-gray-400 hover:text-white text-[10px]"
                    >
                      Nie
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Anuluj
            </button>
            <button
              form="course-form"
              type="submit"
              disabled={saving || !form.name.trim()}
              className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check size={13} />
              {saving ? 'Zapisuję...' : isEditing ? 'Zapisz zmiany' : 'Dodaj i powiąż'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
