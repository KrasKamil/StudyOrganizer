import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { COURSE_TYPES, getCourseTypeConfig } from '../utils/courseMatcher';

export default function AddCourseModal({ onClose }) {
  const { addCourse } = useData();
  const [form, setForm] = useState({
    name: '',
    type: 'lecture',
    upelUrl: '',
    teamsUrl: '',
  });
  const [saving, setSaving] = useState(false);

  const selectedType = getCourseTypeConfig(form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await addCourse({
      name: form.name.trim(),
      type: form.type,
      color: selectedType?.color,
      upelUrl: form.upelUrl || null,
      teamsUrl: form.teamsUrl || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Dodaj przedmiot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nazwa przedmiotu *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="np. Sieci Komputerowe"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Typ zajęć (rodzaj USOS: CWA, CWL, CWP, WYK...)</label>
            <div className="grid grid-cols-2 gap-2">
              {COURSE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-2 py-2 rounded-lg text-xs border transition-colors flex items-center justify-between ${
                    form.type === t.value
                      ? 'border-zinc-500 bg-zinc-800 text-white shadow-sm ring-1 ring-white/20'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UPeL URL */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Link do UPeLa (opcjonalnie)</label>
            <input
              value={form.upelUrl}
              onChange={(e) => setForm({ ...form, upelUrl: e.target.value })}
              placeholder="https://upel.agh.edu.pl/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Teams Direct Link */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Link do zespołu / plików Teams (opcjonalnie)</label>
            <input
              value={form.teamsUrl}
              onChange={(e) => setForm({ ...form, teamsUrl: e.target.value })}
              placeholder="https://teams.microsoft.com/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Wklej link do kanału lub zakładki 'Pliki' z Teamsa – będziesz mieć bezpośredni skrót bez szukania.</p>
          </div>

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
              disabled={saving || !form.name.trim()}
              className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Zapisuję...' : 'Dodaj przedmiot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
