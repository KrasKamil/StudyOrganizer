import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Timestamp } from 'firebase/firestore';

const PRIORITIES = [
  { value: 'high', label: '🔴 Pilne' },
  { value: 'medium', label: '🟡 Średnie' },
  { value: 'low', label: '🟢 Niskie' },
];

export default function AddTaskModal({ onClose }) {
  const { addTask, courses } = useData();
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    deadline: '',
    priority: 'medium',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await addTask({
      title: form.title.trim(),
      courseId: form.courseId || null,
      deadline: form.deadline ? Timestamp.fromDate(new Date(form.deadline)) : null,
      priority: form.priority,
      note: form.note,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Nowe zadanie</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Zadanie *</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="np. Zrobić projekt z AiSD do piątku"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Przedmiot</label>
              <select
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">— Brak —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Priorytet</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
                    form.priority === p.value
                      ? 'border-zinc-500 bg-zinc-800 text-white shadow-sm ring-1 ring-white/20'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notatka (opcjonalnie)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Dodatkowe info, link..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-zinc-500 resize-none"
            />
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
              disabled={saving || !form.title.trim()}
              className="flex-1 py-2 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Zapisuję...' : 'Dodaj zadanie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
