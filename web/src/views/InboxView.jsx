import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Inbox, Search, Filter, Pin, MessageSquare, Plus, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import DiscordWidget from '../components/DiscordWidget';
import TeamsWidget from '../components/TeamsWidget';
import UpelWidget from '../components/UpelWidget';

export default function InboxView() {
  const { messages, courses, pinResource, selectedCourseId, addMessage, deleteMessage } = useData();

  // Active view: default to the full Discord Widget as requested by the user
  const [activeTab, setActiveTab] = useState('discord'); // 'discord' | 'messages'

  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'discord' | 'teams'
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedMsgId, setPinnedMsgId] = useState(null);

  // Optional announcement modal / form state (kept as secondary utility)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formCourseId, setFormCourseId] = useState(courses[0]?.id || '');
  const [formAuthor, setFormAuthor] = useState('Starosta / Student');
  const [formSource, setFormSource] = useState('discord');
  const [formContent, setFormContent] = useState('');
  const [savingMsg, setSavingMsg] = useState(false);

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (platformFilter !== 'all' && msg.source !== platformFilter) return false;
      if (courseFilter !== 'all' && msg.courseId !== courseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchContent = (msg.content || '').toLowerCase().includes(q);
        const matchAuthor = (msg.author || '').toLowerCase().includes(q);
        if (!matchContent && !matchAuthor) return false;
      }
      return true;
    });
  }, [messages, platformFilter, courseFilter, searchQuery]);

  const handlePin = async (msg) => {
    if (!msg.courseId && courses.length > 0) {
      const targetCourseId = courses[0].id;
      await pinResource(targetCourseId, {
        type: 'message',
        title: msg.content?.slice(0, 80) || 'Wiadomość',
        url: msg.url || '',
        source: msg.source || 'inbox',
        messageId: msg.id,
      });
    } else if (msg.courseId) {
      await pinResource(msg.courseId, {
        type: 'message',
        title: msg.content?.slice(0, 80) || 'Wiadomość',
        url: msg.url || '',
        source: msg.source || 'inbox',
        messageId: msg.id,
      });
    }
    setPinnedMsgId(msg.id);
    setTimeout(() => setPinnedMsgId(null), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 space-y-3 sm:space-y-4 flex flex-col h-full w-full max-w-full min-w-0">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-2xl p-3.5 sm:p-4 shadow-sm w-full max-w-full min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl flex-shrink-0">🌐</span>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Platformy uczelniane</h1>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            Discord rocznika, Microsoft Teams, platforma UPeL AGH oraz wiadomości
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-gray-950/80 p-1 rounded-xl border border-gray-800 overflow-x-auto no-scrollbar max-w-full flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'discord'
                ? 'bg-[#5865F2] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🎮</span>
            <span>Discord</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'teams'
                ? 'bg-[#6264A7] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>👥</span>
            <span>MS Teams</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'upel'
                ? 'bg-orange-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🎓</span>
            <span>UPeL AGH</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'messages'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Inbox size={13} />
            <span>Zapisane {messages.length > 0 ? `(${messages.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: DISCORD WIDGET ──────────────────── */}
      {activeTab === 'discord' && (
        <div className="flex-1">
          <DiscordWidget currentCourseId={selectedCourseId} />
        </div>
      )}

      {/* ── TAB 2: TEAMS WIDGET ────────────────────── */}
      {activeTab === 'teams' && (
        <div className="flex-1">
          <TeamsWidget currentCourseId={selectedCourseId} />
        </div>
      )}

      {/* ── TAB 3: UPEL WIDGET ─────────────────────── */}
      {activeTab === 'upel' && (
        <div className="flex-1">
          <UpelWidget currentCourseId={selectedCourseId} />
        </div>
      )}

      {/* ── TAB 2: SAVED MESSAGES ──────────────────── */}
      {activeTab === 'messages' && (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/80 border border-gray-800 rounded-xl p-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-750 rounded-lg px-2.5 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj w treści lub autorze..."
                  className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-36 sm:w-48"
                />
              </div>

              {/* Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-gray-800 border border-gray-750 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">Wszystkie źródła</option>
                <option value="discord">🎮 Discord</option>
                <option value="teams">🟦 Microsoft Teams</option>
              </select>

              {/* Course Filter */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="bg-gray-800 border border-gray-750 text-xs text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none max-w-[200px] truncate"
              >
                <option value="all">Wszystkie przedmioty</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Add announcement button */}
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border border-gray-700 text-xs font-medium transition-colors"
            >
              <Plus size={13} />
              <span>{showAddForm ? 'Zwiń formularz' : 'Zapisz nową notatkę'}</span>
            </button>
          </div>

          {/* Optional Form */}
          {showAddForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!formContent.trim()) return;
                setSavingMsg(true);
                try {
                  const selectedC = courses.find((c) => c.id === formCourseId);
                  await addMessage({
                    courseId: formCourseId || null,
                    content: formContent.trim(),
                    author: formAuthor.trim() || 'Starosta',
                    source: formSource,
                    channelName: selectedC?.discordChannelName || null,
                    url: selectedC?.discordUrl || null,
                    timestamp: new Date().toISOString(),
                  });
                  setFormContent('');
                  setShowAddForm(false);
                } catch (err) {
                  console.error('Błąd dodawania wiadomości:', err);
                } finally {
                  setSavingMsg(false);
                }
              }}
              className="p-4 rounded-xl bg-gray-900 border border-indigo-500/50 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📢</span> Zapisz ogłoszenie lub ważny link
                </span>
                <span className="text-[10px] text-gray-400">Pojawi się w skrzynce i wybranym przedmiocie</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Przedmiot:</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">(Ogólne — cały rok)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.discordChannelName ? `(${c.discordChannelName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Autor:</label>
                  <input
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="np. Starosta, Prowadzący"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Platforma:</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="discord">🎮 Discord (Teleinformatyka magisterka 2025/6)</option>
                    <option value="teams">🟦 Microsoft Teams</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Treść ogłoszenia:</label>
                <textarea
                  rows={3}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Wklej treść wiadomości, termin kolokwium, link do materiałów lub ogłoszenie..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={savingMsg || !formContent.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition-colors disabled:opacity-50"
                >
                  {savingMsg ? 'Zapisuję...' : 'Zapisz'}
                </button>
              </div>
            </form>
          )}

          {/* Messages List */}
          <div className="space-y-2 flex-1">
            {filteredMessages.length === 0 ? (
              <div className="py-14 text-center bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 space-y-2">
                <MessageSquare size={32} className="mx-auto text-gray-600 mb-1" />
                <p className="text-sm font-semibold text-white">Brak zapisanych wiadomości</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Przełącz na zakładkę <b>Widget Discorda</b> powyżej, aby przeglądać kanały przedmiotów i dołączyć do rozmów.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const course = getCourse(msg.courseId);
                return (
                  <div
                    key={msg.id}
                    className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 hover:border-gray-700 transition-colors shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-white">{msg.author || 'Anonim'}</span>
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
                        {course && (
                          <span className="text-[10px] text-gray-400 font-medium">
                            w {course.name}
                          </span>
                        )}
                        {msg.timestamp && (
                          <span className="text-[10px] text-gray-500">
                            {typeof msg.timestamp === 'string' ? msg.timestamp.slice(0, 16).replace('T', ' ') : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => handlePin(msg)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-800 transition-colors"
                        title="Przypnij tę wiadomość jako zasób do przedmiotu"
                      >
                        <Pin size={14} className={pinnedMsgId === msg.id ? 'text-amber-400' : ''} />
                      </button>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                        title="Usuń tę wiadomość"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
