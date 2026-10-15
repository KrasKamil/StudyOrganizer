import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
  ExternalLink, BookOpen, GraduationCap, FileText, CheckCircle2,
  Plus, Edit3, Globe, RefreshCw, AlertTriangle, ChevronRight,
  Layers, Sparkles, FolderOpen, Award, MessageSquare
} from 'lucide-react';
import { getAllCourseUpelLinks } from '../utils/courseMatcher';

export default function UpelWidget({ currentCourseId = null, compact = false }) {
  const { courses, updateCourse, setSelectedCourseId } = useData();

  const [selectedCourseId, setLocalSelectedCourseId] = useState(null);
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'embedded' | 'all'
  const [editingUrls, setEditingUrls] = useState(false);
  const [savingUrls, setSavingUrls] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Form states for in-widget URL editing
  const [upelWykInput, setUpelWykInput] = useState('');
  const [upelLabInput, setUpelLabInput] = useState('');
  const [upelProjInput, setUpelProjInput] = useState('');

  // Default selection
  useEffect(() => {
    if (currentCourseId) {
      setLocalSelectedCourseId(currentCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      const withUpel = courses.find((c) => c.upelUrl || c.upelWykUrl || c.upelLabUrl);
      setLocalSelectedCourseId(withUpel ? withUpel.id : courses[0].id);
    }
  }, [currentCourseId, courses]);

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === selectedCourseId) || courses[0] || null;
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (activeCourse) {
      setUpelWykInput(activeCourse.upelWykUrl || activeCourse.upelUrl || '');
      setUpelLabInput(activeCourse.upelLabUrl || '');
      setUpelProjInput(activeCourse.upelProjUrl || '');
      setEditingUrls(false);
    }
  }, [activeCourse]);

  const courseUpelLinks = useMemo(() => {
    return getAllCourseUpelLinks(activeCourse);
  }, [activeCourse]);

  const primaryUpelUrl = useMemo(() => {
    if (!activeCourse) return 'https://upel.agh.edu.pl';
    return (
      activeCourse.upelWykUrl ||
      activeCourse.upelLabUrl ||
      activeCourse.upelProjUrl ||
      activeCourse.upelUrl ||
      'https://upel.agh.edu.pl'
    );
  }, [activeCourse]);

  const handleSaveUrls = async () => {
    if (!activeCourse) return;
    setSavingUrls(true);
    try {
      const effectiveGeneral = upelWykInput.trim() || upelLabInput.trim() || upelProjInput.trim() || null;
      await updateCourse(activeCourse.id, {
        upelWykUrl: upelWykInput.trim() || null,
        upelLabUrl: upelLabInput.trim() || null,
        upelProjUrl: upelProjInput.trim() || null,
        upelUrl: effectiveGeneral,
      });
      setEditingUrls(false);
    } catch (err) {
      console.warn('Błąd zapisu UPeL URL:', err);
    } finally {
      setSavingUrls(false);
    }
  };

  const openUrl = (url) => {
    window.open(url || 'https://upel.agh.edu.pl', '_blank', 'noopener,noreferrer');
  };

  const totalCoursesWithUpel = courses.filter(
    (c) => c.upelUrl || c.upelWykUrl || c.upelLabUrl || c.upelProjUrl
  ).length;

  return (
    <div className="rounded-2xl border border-orange-500/40 bg-[#171A21] text-gray-200 overflow-hidden shadow-2xl flex flex-col font-sans transition-all">
      {/* ── UPEL HEADER ── */}
      <div className="bg-[#1C202B] px-4 py-3 border-b border-[#2C3242] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] flex items-center justify-center font-black text-white text-lg shadow-inner flex-shrink-0 group hover:scale-105 transition-all">
            U
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-white text-sm truncate">
                UPeL AGH • Moodle
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-700/60 font-semibold">
                E-Learning
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Wydział Informatyki i Telekomunikacji</span>
              </span>
              <span>•</span>
              <span className="truncate">{totalCoursesWithUpel}/{courses.length} kursów UPeL</span>
            </div>
          </div>
        </div>

        {/* Tab switchers & open button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#101319] p-0.5 rounded-lg border border-[#2C3242] flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'hub'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <GraduationCap size={12} />
              <span>Portale & Laby</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('embedded')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'embedded'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe size={12} />
              <span>Wbudowany UPeL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'all'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={12} />
              <span>Katalog</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openUrl(primaryUpelUrl)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow transition-all hover:scale-[1.02]"
            title="Otwórz UPeL AGH w nowej karcie"
          >
            <span>Otwórz UPeL</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── TAB 1: HUB KURSÓW & ROZDZIAŁ LABY / WYKŁAD ── */}
      {activeTab === 'hub' && (
        <div className="flex flex-col md:flex-row min-h-[420px]">
          {/* Left Course List Sidebar */}
          <div className="w-full md:w-64 bg-[#1C202B] p-3 border-r border-[#2C3242] flex flex-col justify-between space-y-3">
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  <span>PRZEDMIOTY ({courses.length})</span>
                </div>
                <div className="space-y-1">
                  {courses.map((c) => {
                    const isSelected = c.id === selectedCourseId;
                    const hasWyk = Boolean(c.upelWykUrl || c.upelUrl);
                    const hasLab = Boolean(c.upelLabUrl);
                    const hasProj = Boolean(c.upelProjUrl);

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setLocalSelectedCourseId(c.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group ${
                          isSelected
                            ? 'bg-[#293040] text-white font-semibold ring-1 ring-orange-500'
                            : 'text-gray-400 hover:bg-[#222735] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: c.color }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hasWyk && <span className="text-[10px] px-1 rounded bg-blue-950 text-blue-300 font-bold">W</span>}
                          {hasLab && <span className="text-[10px] px-1 rounded bg-emerald-950 text-emerald-300 font-bold">L</span>}
                          {hasProj && <span className="text-[10px] px-1 rounded bg-amber-950 text-amber-300 font-bold">P</span>}
                          {!hasWyk && !hasLab && !hasProj && (
                            <span className="text-[10px] text-gray-600">Brak</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct university links */}
              <div className="pt-2 border-t border-[#2C3242]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  PORTALE UCZELNI
                </div>
                <div className="space-y-1 text-xs">
                  <a
                    href="https://upel.agh.edu.pl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-[#222735] hover:text-white transition-all"
                  >
                    <span>Strona główna UPeL</span>
                    <ExternalLink size={11} className="text-gray-500" />
                  </a>
                  <a
                    href="https://sylabusy.agh.edu.pl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-[#222735] hover:text-white transition-all"
                  >
                    <span>Sylabusy AGH</span>
                    <ExternalLink size={11} className="text-gray-500" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#2C3242] text-[10px] text-gray-400 flex items-center justify-between">
              <span>Logowanie przez AGH SSO (Wirtualna Uczelnia)</span>
            </div>
          </div>

          {/* Right Main Panel: Selected Course UPeL Portals */}
          <div className="flex-1 bg-[#171A21] p-5 flex flex-col justify-between space-y-4">
            {activeCourse ? (
              <div className="space-y-4">
                {/* Course Banner */}
                <div className="bg-[#1C202B] border border-[#2C3242] rounded-xl p-4 shadow-sm">
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
                          {courseUpelLinks.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-400 bg-orange-950/60 border border-orange-700/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} /> {courseUpelLinks.length} portale
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Kursy Moodle, materiały z wykładów, sprawozdania z laboratoriów i projekty
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingUrls(!editingUrls)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-orange-500/70 text-orange-300 hover:bg-orange-950/40 text-xs font-medium transition-all"
                      >
                        <Edit3 size={12} />
                        <span>{editingUrls ? 'Zwiń edycję' : 'Konfiguruj linki UPeL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Config Form (Separated Wykład / Laby / Projekt) */}
                  {editingUrls && (
                    <div className="mt-4 pt-3 border-t border-[#2C3242] space-y-3 bg-[#13161D] p-3 rounded-lg border">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={12} className="text-orange-400" />
                        <span>Rozdzielenie linków UPeL dla przedmiotu (Wykład vs Laby vs Projekt)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-blue-400 mb-1">
                            📘 UPeL Wykład:
                          </label>
                          <input
                            type="url"
                            value={upelWykInput}
                            onChange={(e) => setUpelWykInput(e.target.value)}
                            placeholder="https://upel.agh.edu.pl/course/view.php?id=..."
                            className="w-full bg-[#1C202B] border border-blue-600/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                            📗 UPeL Laboratorium:
                          </label>
                          <input
                            type="url"
                            value={upelLabInput}
                            onChange={(e) => setUpelLabInput(e.target.value)}
                            placeholder="https://upel.agh.edu.pl/course/view.php?id=..."
                            className="w-full bg-[#1C202B] border border-emerald-600/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                            📙 UPeL Projekt:
                          </label>
                          <input
                            type="url"
                            value={upelProjInput}
                            onChange={(e) => setUpelProjInput(e.target.value)}
                            placeholder="https://upel.agh.edu.pl/course/view.php?id=..."
                            className="w-full bg-[#1C202B] border border-amber-600/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingUrls(false)}
                          className="px-2.5 py-1 rounded-md text-xs text-gray-400 hover:text-white"
                        >
                          Anuluj
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveUrls}
                          disabled={savingUrls}
                          className="px-3.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {savingUrls ? 'Zapisuję...' : 'Zapisz linki'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Portals Cards: Separated by type */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                    Dostępne portale UPeL dla tego przedmiotu:
                  </h5>

                  {courseUpelLinks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {courseUpelLinks.map((portal) => (
                        <div
                          key={portal.type}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                            portal.type === 'lab'
                              ? 'bg-emerald-950/20 border-emerald-700/50 hover:border-emerald-500'
                              : portal.type === 'project'
                              ? 'bg-amber-950/20 border-amber-700/50 hover:border-amber-500'
                              : 'bg-blue-950/20 border-blue-700/50 hover:border-blue-500'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xl">{portal.icon}</span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                                style={{
                                  backgroundColor: `${portal.color}22`,
                                  color: portal.color,
                                  border: `1px solid ${portal.color}55`,
                                }}
                              >
                                {portal.shortLabel}
                              </span>
                            </div>
                            <h6 className="font-bold text-white text-sm">{portal.label}</h6>
                            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 font-mono">
                              {portal.url}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openUrl(portal.url)}
                            className="w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow hover:scale-[1.02]"
                            style={{ backgroundColor: portal.color }}
                          >
                            <span>Otwórz na UPeL</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#1C202B] border border-dashed border-[#2C3242] text-center space-y-2">
                      <p className="text-xs text-gray-400">
                        Nie dodano jeszcze bezpośrednich linków do kursów UPeL dla tego przedmiotu.
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingUrls(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600/20 border border-orange-500 text-orange-300 text-xs font-semibold hover:bg-orange-600/30 transition-all"
                      >
                        <Plus size={12} />
                        <span>Dodaj linki UPeL (Wykład / Laby)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Academic Action Shortcuts */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                  <div
                    onClick={() => openUrl(primaryUpelUrl)}
                    className="p-3 rounded-xl bg-[#1C202B] border border-[#2C3242] hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="text-base mb-1">📥</div>
                    <div className="text-xs font-bold text-white">Oddaj zadanie</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Sprawozdania i pliki</div>
                  </div>

                  <div
                    onClick={() => openUrl(primaryUpelUrl)}
                    className="p-3 rounded-xl bg-[#1C202B] border border-[#2C3242] hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="text-base mb-1">📚</div>
                    <div className="text-xs font-bold text-white">Materiały & Slajdy</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Wykłady i skrypty</div>
                  </div>

                  <div
                    onClick={() => openUrl(primaryUpelUrl)}
                    className="p-3 rounded-xl bg-[#1C202B] border border-[#2C3242] hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="text-base mb-1">📊</div>
                    <div className="text-xs font-bold text-white">Oceny i Punkty</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Dziennik ocen Moodle</div>
                  </div>

                  <div
                    onClick={() => openUrl('https://upel.agh.edu.pl/my')}
                    className="p-3 rounded-xl bg-[#1C202B] border border-[#2C3242] hover:border-orange-500 transition-all cursor-pointer group"
                  >
                    <div className="text-base mb-1">🏛️</div>
                    <div className="text-xs font-bold text-white">Pulpit UPeL</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Wszystkie Twoje kursy</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                Wybierz przedmiot z listy
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: WBUDOWANY UPEL (LIVE EMBEDDED IFRAME) ── */}
      {activeTab === 'embedded' && (
        <div className="flex flex-col h-[560px] bg-[#101319]">
          {/* Browser Address Bar */}
          <div className="bg-[#1C202B] px-4 py-2 border-b border-[#2C3242] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-orange-400">🔒</span>
              <span className="bg-[#101319] border border-[#2C3242] rounded-lg px-2.5 py-1 text-gray-300 font-mono text-[11px] flex-1 truncate">
                {primaryUpelUrl}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIframeKey((k) => k + 1)}
                className="p-1.5 rounded-lg bg-[#293040] hover:bg-[#323B4E] text-gray-300 transition-all"
                title="Odśwież ramkę"
              >
                <RefreshCw size={12} />
              </button>
              <button
                type="button"
                onClick={() => openUrl(primaryUpelUrl)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold transition-all shadow"
              >
                <span>Otwórz w oknie</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>

          {/* Fallback Notice for AGH Moodle X-Frame-Options */}
          <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/40 flex items-center justify-between text-[11px] text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
              <span>
                Jeśli strona UPeL wyświetla się jako pusta lub blokuje logowanie SSO (polityka bezpieczeństwa X-Frame-Options uczelni), kliknij przycisk „Otwórz w oknie”.
              </span>
            </div>
            <button
              type="button"
              onClick={() => openUrl(primaryUpelUrl)}
              className="underline font-bold text-amber-300 hover:text-white ml-2 flex-shrink-0"
            >
              Otwórz stronę główną
            </button>
          </div>

          {/* Embedded Frame */}
          <div className="flex-1 relative bg-white">
            <iframe
              key={iframeKey}
              src={primaryUpelUrl}
              title="UPeL AGH Embedded"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      )}

      {/* ── TAB 3: KATALOG WSZYSTKICH KURSÓW (ALL) ── */}
      {activeTab === 'all' && (
        <div className="p-5 space-y-3 min-h-[380px]">
          <div className="text-xs text-gray-400">
            Zestawienie linków UPeL dla wszystkich przedmiotów na ten semestr:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map((c) => {
              const links = getAllCourseUpelLinks(c);
              return (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-[#1C202B] border border-[#2C3242] hover:border-orange-500 transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{c.name}</h5>
                      <span className="text-[11px] text-gray-400">
                        {links.length > 0 ? `${links.length} skonfigurowanych portali` : 'Brak portali'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2C3242]">
                    {links.length > 0 ? (
                      links.map((l) => (
                        <button
                          key={l.type}
                          type="button"
                          onClick={() => openUrl(l.url)}
                          className="px-2 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1 transition-all hover:scale-105"
                          style={{ backgroundColor: l.color }}
                        >
                          <span>{l.shortLabel}</span>
                          <ExternalLink size={9} />
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSelectedCourseId(c.id);
                          setActiveTab('hub');
                          setEditingUrls(true);
                        }}
                        className="px-2 py-0.5 rounded border border-dashed border-gray-600 text-gray-400 hover:text-white text-[10px]"
                      >
                        + Dodaj UPeL
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
