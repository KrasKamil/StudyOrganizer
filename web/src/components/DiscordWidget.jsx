import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import {
  ExternalLink, Hash, Volume2, Users, Radio, Settings,
  ChevronDown, ShieldCheck, RefreshCw,
  Send, Pin, Check, Plus, Copy, Key, MessageSquare, AlertCircle, Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function DiscordWidget({
  currentCourseId = null,
  compact = false,
  inFloatingWindow = false,
  onSelectCourse = null,
}) {
  const { courses, setSelectedCourseId, messages = [], addMessage, pinResource } = useData();

  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'live_widget' | 'settings'
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [serverId, setServerId] = useState(() => localStorage.getItem('discordServerId') || '');
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('discordServerUrl') || '');
  const [botToken, setBotToken] = useState(() => localStorage.getItem('discordBotToken') || '');
  const [showServerSettings, setShowServerSettings] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [messageFilter, setMessageFilter] = useState('all'); // 'all' | 'announcements' | 'links'

  // Input & Modal states
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [pinnedMsgId, setPinnedMsgId] = useState(null);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [copiedChannel, setCopiedChannel] = useState(false);

  // Add Announcement Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAuthor, setImportAuthor] = useState('');
  const [importRole, setImportRole] = useState('Admin');
  const [importContent, setImportContent] = useState('');
  const [savingImport, setSavingImport] = useState(false);

  // Discord Bot API live messages (optional if user configures a bot token)
  const [liveApiLoading, setLiveApiLoading] = useState(false);
  const [liveApiStatus, setLiveApiStatus] = useState(null);
  const [liveDiscordMessages, setLiveDiscordMessages] = useState({});

  const messagesEndRef = useRef(null);

  // Generate channel list based on semester courses
  const courseChannels = useMemo(() => {
    return courses.map((c) => {
      const channelSlug = c.discordChannelName || `#${slugify(c.name)}`;
      return {
        id: c.id,
        name: channelSlug.startsWith('#') ? channelSlug : `#${channelSlug}`,
        course: c,
        type: 'text',
        url: c.discordUrl || null,
        isCourseChannel: true,
      };
    });
  }, [courses]);

  // General server channels for the study program
  const generalChannels = useMemo(() => [
    { id: 'gen-announcements', name: '#ogłoszenia-starosty', type: 'text', icon: '📢', desc: 'Ważne oficjalne komunikaty starosty dla całego roku' },
    { id: 'gen-materials', name: '#materiały-i-dyski', type: 'text', icon: '📁', desc: 'Współdzielone notatki, opracowania, Google Drive i skrypty' },
    { id: 'gen-exams', name: '#terminy-i-egzaminy', type: 'text', icon: '📅', desc: 'Kalendarz zaliczeń, kolokwiów i obron projektów' },
    { id: 'gen-general', name: '#ogólny', type: 'text', icon: '💬', desc: 'Wspólny kanał rocznika — dyskusje i pytania' },
    { id: 'voice-room1', name: 'Pokój do nauki 1', type: 'voice', icon: '🔊', desc: 'Kanał głosowy do wspólnych projektów' },
  ], []);

  // Set default selected channel
  useEffect(() => {
    if (currentCourseId) {
      setSelectedChannelId(currentCourseId);
    } else if (courseChannels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(courseChannels[0].id);
    }
  }, [currentCourseId, courseChannels]);

  const activeChannel = useMemo(() => {
    return courseChannels.find((c) => c.id === selectedChannelId) ||
           generalChannels.find((c) => c.id === selectedChannelId) ||
           courseChannels[0] || generalChannels[0];
  }, [courseChannels, generalChannels, selectedChannelId]);

  // Derive ONLY real user announcements / messages (NO fake chatter)
  const channelMessages = useMemo(() => {
    if (!activeChannel) return [];

    const chKey = activeChannel.id;

    // Optional live fetched messages from Discord API if bot configured
    const liveApiMsgs = (liveDiscordMessages[chKey] || []).map((m) => ({
      id: m.id,
      author: m.author?.username || 'Użytkownik Discord',
      role: 'Discord',
      avatarColor: '#5865F2',
      content: m.content || '',
      timestamp: m.timestamp ? format(new Date(m.timestamp), 'HH:mm (d MMM)', { locale: pl }) : 'Niedawno',
      isLiveApi: true,
    }));

    // Real messages from DataContext / Firestore
    const userMsgs = (messages || [])
      .filter((m) => {
        if (activeChannel.isCourseChannel) {
          return m.courseId === activeChannel.course?.id || m.channelName === activeChannel.name;
        }
        return m.channelName === activeChannel.name || (!m.courseId && m.channelName === activeChannel.id);
      })
      .map((m) => {
        let timeStr = 'Niedawno';
        try {
          const d = m.createdAt?.toDate?.() || new Date(m.timestamp || m.createdAt || Date.now());
          timeStr = format(d, 'HH:mm (d MMM)', { locale: pl });
        } catch {}

        return {
          id: m.id,
          author: m.author || 'Notatka',
          role: m.role || (m.author?.includes('Starosta') ? 'Admin' : 'Student'),
          avatarColor: m.role === 'Admin' ? '#5865F2' : '#10B981',
          content: m.content,
          timestamp: timeStr,
          rawMsg: m,
        };
      });

    let combined = [...liveApiMsgs, ...userMsgs];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      combined = combined.filter((m) =>
        m.content.toLowerCase().includes(q) || m.author.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (messageFilter === 'links') {
      combined = combined.filter((m) => /https?:\/\//i.test(m.content));
    } else if (messageFilter === 'announcements') {
      combined = combined.filter((m) => m.role === 'Admin' || m.role === 'Prowadzący' || /📢|WAŻNE|Uwaga|Termin/i.test(m.content));
    }

    return combined;
  }, [activeChannel, messages, liveDiscordMessages, searchTerm, messageFilter]);

  // Handle switching channel & notify parent
  const handleSelectChannel = (channelId) => {
    setSelectedChannelId(channelId);
    const foundCourse = courseChannels.find((c) => c.id === channelId)?.course;
    if (foundCourse && onSelectCourse) {
      onSelectCourse(foundCourse);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChannel || sendingMessage) return;

    const text = inputText.trim();
    setInputText('');
    setSendingMessage(true);

    try {
      if (addMessage) {
        await addMessage({
          courseId: activeChannel.course?.id || null,
          channelName: activeChannel.name,
          content: text,
          author: 'Moja notatka',
          role: 'Student',
          source: 'discord',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Błąd zapisywania notatki:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleImportMessageSubmit = async (e) => {
    e?.preventDefault();
    if (!importContent.trim() || !activeChannel || savingImport) return;

    setSavingImport(true);
    try {
      if (addMessage) {
        await addMessage({
          courseId: activeChannel.course?.id || null,
          channelName: activeChannel.name,
          content: importContent.trim(),
          author: importAuthor.trim() || 'Ogłoszenie z Discorda',
          role: importRole,
          source: 'discord_imported',
          timestamp: new Date().toISOString(),
        });
      }
      setImportContent('');
      setImportAuthor('');
      setShowImportModal(false);
    } catch (err) {
      console.warn('Błąd zapisywania ogłoszenia:', err);
    } finally {
      setSavingImport(false);
    }
  };

  const handlePinMessage = async (msg) => {
    if (!pinResource) return;
    const targetCourseId = activeChannel.course?.id || (courses.length > 0 ? courses[0].id : null);
    if (!targetCourseId) return;

    try {
      await pinResource(targetCourseId, {
        type: 'message',
        title: msg.content.slice(0, 90),
        url: '',
        source: 'discord',
        author: msg.author,
        pinnedAt: new Date().toISOString(),
      });
      setPinnedMsgId(msg.id);
      setTimeout(() => setPinnedMsgId(null), 2500);
    } catch (err) {
      console.warn('Błąd przypinania wiadomości:', err);
    }
  };

  const handleCopyMessage = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleCopyChannelName = (name) => {
    navigator.clipboard.writeText(name);
    setCopiedChannel(true);
    setTimeout(() => setCopiedChannel(false), 2000);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('discordServerId', serverId.trim());
    localStorage.setItem('discordServerUrl', serverUrl.trim());
    localStorage.setItem('discordBotToken', botToken.trim());
    setShowServerSettings(false);
  };

  const openInDiscord = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (serverUrl) {
      window.open(serverUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open('discord://', '_blank');
    }
  };

  return (
    <div
      className={`bg-[#313338] text-gray-200 flex flex-col font-sans transition-all overflow-hidden ${
        inFloatingWindow
          ? 'h-full flex-1 rounded-none border-0'
          : 'rounded-2xl border border-[#5865F2]/40 shadow-2xl'
      }`}
    >
      {/* ── DISCORD HUB HEADER ── */}
      <div className="bg-[#2B2D31] px-4 py-3 border-b border-[#1F2023] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#5865F2] flex items-center justify-center font-bold text-white text-lg shadow-inner flex-shrink-0">
            <MessageSquare size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                Discord Hub — Rocznik & Przedmioty
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#23A55A]/20 text-[#23A55A] border border-[#23A55A]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#23A55A] inline-block animate-pulse" />
                AKTYWNY
              </span>
            </div>
            <p className="text-xs text-[#949BA4] truncate">
              Oficjalne kanały, ogłoszenia i bezpośrednie linki do aplikacji Discord
            </p>
          </div>
        </div>

        {/* Global Hub Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'channels'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#383A40] text-[#949BA4] hover:text-white'
            }`}
          >
            Kanały & Ogłoszenia
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live_widget')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'live_widget'
                ? 'bg-[#5865F2] text-white shadow-sm'
                : 'bg-[#383A40] text-[#949BA4] hover:text-white'
            }`}
            title="Podgląd widgetu serwera Discord na żywo"
          >
            <Radio size={13} className={serverId ? 'text-emerald-400' : ''} />
            <span className="hidden sm:inline">Podgląd na żywo</span>
            <span className="sm:hidden">Widżet</span>
          </button>

          <button
            type="button"
            onClick={() => setShowServerSettings(!showServerSettings)}
            className="p-1.5 rounded-lg bg-[#383A40] hover:bg-[#4E5058] text-[#949BA4] hover:text-white transition-all"
            title="Ustawienia serwera Discord"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            onClick={() => openInDiscord()}
            className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            title="Uruchom aplikację Discord na komputerze"
          >
            <span>Otwórz Discorda</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* ── SETTINGS DRAWER ── */}
      {showServerSettings && (
        <div className="bg-[#2B2D31] border-b border-[#3F4147] p-4 space-y-3 flex-shrink-0 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings size={13} className="text-[#5865F2]" />
              <span>Konfiguracja połączenia z Discordem</span>
            </h4>
            <button onClick={() => setShowServerSettings(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-[#949BA4] mb-1 font-medium">Link do serwera lub zaproszenie (URL):</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://discord.gg/... lub discord://..."
                className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#949BA4] mb-1 font-medium">ID Serwera (do widgetu podglądu na żywo):</label>
              <input
                type="text"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
                placeholder="np. 123456789012345678"
                className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowServerSettings(false)}
              className="px-3 py-1 rounded-lg bg-[#383A40] text-gray-300 text-xs font-semibold"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow"
            >
              Zapisz ustawienia
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 1: CHANNELS & REAL ANNOUNCEMENTS ── */}
      {activeTab === 'channels' && (
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[380px]">
          {/* Left Sidebar: Channels List */}
          <div className="w-full md:w-64 bg-[#2B2D31] border-b md:border-b-0 md:border-r border-[#1F2023] flex flex-col justify-between p-2.5 space-y-3 overflow-y-auto flex-shrink-0">
            <div className="space-y-4">
              {/* Category 1: Kanały Przedmiotów */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#949BA4] px-2 mb-1.5">
                  <span className="flex items-center gap-1">
                    <ChevronDown size={11} /> KANAŁY PRZEDMIOTÓW
                  </span>
                  <span className="text-[9px] bg-[#1E1F22] px-1.5 py-0.2 rounded text-gray-400">
                    {courseChannels.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {courseChannels.map((ch) => {
                    const isSelected = ch.id === selectedChannelId;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleSelectChannel(ch.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#404249] text-white font-semibold'
                            : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Hash size={14} className={isSelected ? 'text-white' : 'text-[#80848E]'} />
                          <span className="truncate">{ch.name.replace(/^#/, '')}</span>
                        </div>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ch.course?.color || '#5865F2' }}
                          title={`Przedmiot: ${ch.course?.name}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category 2: Kanały Ogólne */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#949BA4] px-2 mb-1.5">
                  <span className="flex items-center gap-1">
                    <ChevronDown size={11} /> KANAŁY OGÓLNE
                  </span>
                </div>
                <div className="space-y-0.5">
                  {generalChannels.map((ch) => {
                    const isSelected = ch.id === selectedChannelId;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => handleSelectChannel(ch.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#404249] text-white font-semibold'
                            : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {ch.type === 'voice' ? (
                            <Volume2 size={14} className="text-[#23A55A]" />
                          ) : (
                            <Hash size={14} className={isSelected ? 'text-white' : 'text-[#80848E]'} />
                          )}
                          <span className="truncate">{ch.name.replace(/^#/, '')}</span>
                        </div>
                        <span className="text-xs">{ch.icon}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Discord App Link Footer */}
            <div className="pt-2 border-t border-[#35373C] text-[11px] text-[#949BA4] flex items-center justify-between">
              <span>Aplikacja Discord</span>
              <button
                type="button"
                onClick={() => openInDiscord()}
                className="text-[#5865F2] hover:text-white font-semibold flex items-center gap-1"
              >
                <span>Uruchom</span>
                <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* Right Main Channel Hub */}
          <div className="flex-1 bg-[#313338] flex flex-col justify-between overflow-hidden min-w-0">
            {/* Active Channel Header */}
            <div className="bg-[#313338] px-4 py-2.5 border-b border-[#26282C] flex flex-wrap items-center justify-between gap-2 shadow-sm z-10 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Hash size={20} className="text-[#80848E] flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">
                      {activeChannel?.name?.replace(/^#/, '') || 'ogólny'}
                    </h4>
                    {activeChannel?.course && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#2B2D31] text-gray-300 border border-[#383A40] truncate max-w-xs font-medium">
                        {activeChannel.course.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#949BA4] truncate">
                    {activeChannel?.course
                      ? `Ważne ogłoszenia, linki do dysków i terminy dla ${activeChannel.course.name}`
                      : activeChannel?.desc || 'Wspólny kanał rocznika'}
                  </p>
                </div>
              </div>

              {/* Actions for current channel */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Search in announcements */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Szukaj..."
                    className="w-24 sm:w-36 bg-[#1E1F22] border border-[#383A40] rounded-lg px-2 py-1 text-[11px] text-white placeholder-[#80848E] focus:outline-none focus:w-44 transition-all"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-1 text-[#80848E] hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Copy channel name button */}
                <button
                  type="button"
                  onClick={() => handleCopyChannelName(activeChannel?.name)}
                  className="px-2.5 py-1 rounded bg-[#383A40] hover:bg-[#4E5058] text-gray-200 text-xs font-medium transition-all flex items-center gap-1"
                  title="Kopiuj nazwę kanału"
                >
                  {copiedChannel ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span className="hidden sm:inline">{copiedChannel ? 'Skopiowano' : 'Kopiuj'}</span>
                </button>

                {/* Import / Paste message button */}
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="px-2.5 py-1 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition-all flex items-center gap-1 shadow"
                  title="Wklej ogłoszenie z Discorda do tego kanału"
                >
                  <Plus size={12} />
                  <span>Wklej ogłoszenie</span>
                </button>

                {/* Launch Discord app button */}
                <button
                  type="button"
                  onClick={() => openInDiscord(activeChannel?.url)}
                  className="px-2.5 py-1 rounded bg-[#383A40] hover:bg-[#4E5058] text-gray-200 text-xs font-semibold transition-all flex items-center gap-1"
                  title="Otwórz w aplikacji Discord"
                >
                  <span>Aplikacja</span>
                  <ExternalLink size={11} />
                </button>
              </div>
            </div>

            {/* Filter pills bar */}
            <div className="bg-[#2B2D31]/80 px-4 py-1.5 border-b border-[#26282C] flex items-center justify-between text-[11px] flex-shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[#80848E] text-[10px] mr-1 hidden sm:inline">Widok:</span>
                {[
                  { id: 'all', label: 'Wszystkie wpisy' },
                  { id: 'announcements', label: '📢 Ogłoszenia' },
                  { id: 'links', label: '🔗 Linki i dyski' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMessageFilter(f.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      messageFilter === f.id
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[#383A40] text-[#949BA4] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-400">
                Zapisane: <strong className="text-gray-200">{channelMessages.length}</strong>
              </span>
            </div>

            {/* Modal: Wklej wiadomość / ogłoszenie z Discorda */}
            {showImportModal && (
              <div className="p-3.5 bg-[#2B2D31] border-b border-[#3F4147] space-y-2 flex-shrink-0 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-white font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>📥</span>
                    <span>Wklej ogłoszenie z kanału {activeChannel?.name}</span>
                  </span>
                  <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
                </div>

                <form onSubmit={handleImportMessageSubmit} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#949BA4] mb-0.5">Autor wiadomości (np. Starosta, Prowadzący):</label>
                      <input
                        value={importAuthor}
                        onChange={(e) => setImportAuthor(e.target.value)}
                        placeholder="np. Starosta [TI], Prowadzący..."
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#949BA4] mb-0.5">Typ wpisu:</label>
                      <select
                        value={importRole}
                        onChange={(e) => setImportRole(e.target.value)}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                      >
                        <option value="Admin">📢 Ogłoszenie / Ważny komunikat</option>
                        <option value="Prowadzący">👨‍🏫 Od prowadzącego</option>
                        <option value="Student">📝 Notatka / Link do materiałów</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#949BA4] mb-0.5">Treść wiadomości (wklej z Discorda):</label>
                    <textarea
                      rows={3}
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                      placeholder="Wklej treść wiadomości, ogłoszenia, link do Dysku Google, repozytorium..."
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-lg p-2 text-xs text-white placeholder-[#80848E] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-3 py-1 rounded-lg bg-[#383A40] text-gray-300 text-xs font-semibold"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={savingImport || !importContent.trim()}
                      className="px-4 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {savingImport ? 'Zapisuję...' : 'Dodaj wpis'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Message Feed (Real Data Only) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {channelMessages.length === 0 ? (
                /* Clean Empty State */
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#2B2D31] border border-[#3F4147] flex items-center justify-center text-[#5865F2] shadow-sm">
                    <Hash size={28} />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-sm font-bold text-white">
                      Brak zapisanych wpisów na kanale {activeChannel?.name}
                    </h4>
                    <p className="text-xs text-[#949BA4] leading-relaxed">
                      Możesz wkleić tutaj ważne terminy kolokwiów, linki do Dysków Google, repozytoriów GitHub lub ogłoszenia starosty z Discorda, aby mieć je pod ręką.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs transition-all shadow-md"
                  >
                    <Plus size={13} />
                    <span>Wklej ogłoszenie z Discorda</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {channelMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-xl bg-[#2B2D31] border border-[#3F4147] hover:border-[#5865F2]/50 transition-all space-y-2 group shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ backgroundColor: msg.avatarColor || '#5865F2' }}
                          >
                            {(msg.author || 'D')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-white truncate">{msg.author}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E1F22] text-[#949BA4]">
                            {msg.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#949BA4] flex-shrink-0">{msg.timestamp}</span>
                      </div>

                      <div className="text-xs text-[#DBDEE1] leading-relaxed whitespace-pre-wrap break-words">
                        {renderMessageWithLinks(msg.content)}
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-1 border-t border-[#383A40]/50 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handlePinMessage(msg)}
                          className="px-2 py-0.8 text-[#949BA4] hover:text-amber-300 hover:bg-[#35373C] rounded transition-all flex items-center gap-1"
                          title="Przypnij do materiałów przedmiotu"
                        >
                          {pinnedMsgId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Pin size={12} />}
                          <span>{pinnedMsgId === msg.id ? 'Przypięto!' : 'Przypnij'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="px-2 py-0.8 text-[#949BA4] hover:text-white hover:bg-[#35373C] rounded transition-all flex items-center gap-1"
                          title="Kopiuj treść"
                        >
                          {copiedMsgId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedMsgId === msg.id ? 'Skopiowano' : 'Kopiuj'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Add Input Bar */}
            <div className="p-3 bg-[#313338] border-t border-[#26282C] flex-shrink-0">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <div className="w-full bg-[#383A40] rounded-xl flex items-center px-3 py-2 gap-2 border border-transparent focus-within:border-[#5865F2]/60 transition-all">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="w-6 h-6 rounded-full bg-[#4E5058] flex items-center justify-center text-gray-300 flex-shrink-0 cursor-pointer hover:text-white"
                    title="Wklej ogłoszenie z Discorda"
                  >
                    <Plus size={14} />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Dodaj notatkę lub link do ${activeChannel?.name || '#ogólny'}...`}
                    className="flex-1 bg-transparent text-xs text-white placeholder-[#80848E] focus:outline-none min-w-0"
                    disabled={sendingMessage}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sendingMessage}
                    className="px-3 py-1 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1 shadow flex-shrink-0"
                  >
                    <Send size={12} />
                    <span className="hidden sm:inline">Zapisz</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LIVE DISCORD SERVER WIDGET (IFRAME EMBED) ── */}
      {activeTab === 'live_widget' && (
        <div className="p-4 sm:p-6 bg-[#313338] space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3F4147]">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio size={16} className="text-[#23A55A] animate-pulse" />
                <span>Oficjalny widget serwera Discord</span>
              </h4>
              <p className="text-xs text-[#949BA4]">
                Wyświetla aktywnych członków, kanały głosowe i podgląd na żywo serwera
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowServerSettings(true)}
              className="px-3 py-1.5 rounded-lg bg-[#2B2D31] hover:bg-[#35373C] text-xs font-semibold text-[#5865F2] border border-[#3F4147] transition-colors"
            >
              {serverId ? `ID serwera: ${serverId.slice(0, 8)}...` : '+ Wprowadź Server ID'}
            </button>
          </div>

          {/* Iframe widget if serverId is provided */}
          {serverId ? (
            <div className="rounded-xl overflow-hidden border border-[#3F4147] bg-[#2B2D31] shadow-lg">
              <iframe
                title="Discord Server Widget"
                src={`https://discord.com/widget?id=${serverId}&theme=dark`}
                width="100%"
                height="420"
                allowTransparency="true"
                frameBorder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                className="w-full bg-[#2B2D31]"
              />
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-[#2B2D31] border border-[#35373C] text-center space-y-3">
              <Radio size={36} className="mx-auto text-[#5865F2]" />
              <p className="text-sm font-semibold text-white">Wprowadź ID serwera Discord</p>
              <p className="text-xs text-[#949BA4] max-w-md mx-auto leading-relaxed">
                W ustawieniach swojego serwera Discord włącz opcję <strong>Widżet serwera</strong> i skopiuj jego identyfikator (Server ID). Po wklejeniu zobaczysz tu na żywo listę osób online i kanały głosowe.
              </p>
              <button
                type="button"
                onClick={() => setShowServerSettings(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold transition-all shadow"
              >
                <Settings size={13} />
                <span>Wprowadź ID serwera</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Convert links inside text into clickable elements
function renderMessageWithLinks(text = '') {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00A8FC] hover:underline break-all inline-flex items-center gap-0.5 font-medium"
        >
          <span>{part}</span>
          <ExternalLink size={10} className="inline ml-0.5" />
        </a>
      );
    }
    return part;
  });
}

function slugify(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}
