import React, { useState } from 'react';
import { X, Link2, ExternalLink } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Timestamp } from 'firebase/firestore';

const MODES = [
  { value: 'online', label: '🖥️ Zdalne (Teams)' },
  { value: 'onsite', label: '🏛️ Stacjonarne (AGH)' },
  { value: 'unknown', label: '❓ Nie wiem jeszcze' },
];

// Known AGH buildings for quick-pick
const AGH_BUILDINGS = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'D17', 'C2', 'C3', 'WEAIiIB', 'WIEiT', 'Aula'
];

export default function AddSessionModal({ onClose }) {
  const { addSession, courses } = useData();
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    category: 'academic',
    date: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endTime: '09:30',
    mode: 'unknown',
    location: '',
    teamsLink: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const [sh, sm] = form.startTime.split(':').map(Number);
    const [eh, em] = form.endTime.split(':').map(Number);
    const startDate = new Date(form.date);
    startDate.setHours(sh, sm, 0, 0);
    const endDate = new Date(form.date);
    endDate.setHours(eh, em, 0, 0);

    const selectedCourse = courses.find((c) => c.id === form.courseId);
    const isAcademic = form.category === 'academic';

    await addSession({
      courseId: isAcademic ? (form.courseId || null) : null,
      title: form.title.trim() || selectedCourse?.name || (isAcademic ? 'Zajęcia' : 'Wydarzenie prywatne'),
      category: form.category,
      start: Timestamp.fromDate(startDate),
      end: Timestamp.fromDate(endDate),
      mode: form.mode,
      location: form.mode === 'onsite' ? form.location : null,
      teamsLink: form.mode === 'online' ? form.teamsLink : null,
      source: 'manual',
    });

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Dodaj zajęcia / wydarzenie</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, category: 'academic' })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                form.category === 'academic'
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm ring-1 ring-white/20'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <span>🎓 Zajęcia uczelniane</span>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, category: 'personal', courseId: '' })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                form.category === 'personal'
                  ? 'bg-slate-700/60 border-slate-500 text-white shadow'
                  : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              <span>🗓️ Wydarzenie prywatne</span>
            </button>
          </div>

          {/* Course picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Przedmiot</label>
            <select
              value={form.courseId}
              onChange={(e) => {
                const course = courses.find((c) => c.id === e.target.value);
                setForm({ ...form, courseId: e.target.value, title: course?.name || '' });
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">— Brak / własne —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tytuł *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="np. Wykład 3 — Protokoły TCP/IP"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Od</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Do</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Tryb zajęć</label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm({ ...form, mode: m.value })}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs border transition-colors ${
                    form.mode === m.value
                      ? 'border-zinc-500 bg-zinc-800 text-white shadow-sm ring-1 ring-white/20'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location (onsite) */}
          {form.mode === 'onsite' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Budynek / sala</label>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="np. B5 sala 203"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500 mb-2"
              />
              {/* Quick-pick AGH buildings */}
              <div className="flex flex-wrap gap-1">
                {AGH_BUILDINGS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setForm({ ...form, location: b })}
                    className="px-2 py-0.5 rounded text-xs bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams link (online) */}
          {form.mode === 'online' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Link do spotkania Teams</label>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={form.teamsLink}
                  onChange={(e) => setForm({ ...form, teamsLink: e.target.value })}
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Zapisuję...' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
