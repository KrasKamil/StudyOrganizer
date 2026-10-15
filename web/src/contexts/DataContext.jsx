import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { fetchGoogleCalendarEvents } from '../services/googleCalendar';
import {
  SEMESTER_2_PRESET_COURSES,
  normalizeCourseName,
  findMatchingSessionsForCourse,
  matchesCourse,
} from '../utils/courseMatcher';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, googleToken, refreshGoogleToken } = useAuth();
  const [courses, setCourses] = useState([]);
  // Load cached manual sessions from localStorage so user-added events never disappear
  const [firestoreSessions, setFirestoreSessions] = useState(() => {
    try {
      const cached = localStorage.getItem('study_manual_sessions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Load cached Google Calendar events from localStorage so calendar never goes blank
  const [googleSessions, setGoogleSessions] = useState(() => {
    try {
      const cached = localStorage.getItem('study_gcal_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Initialize overrides from localStorage for instant offline/zero-latency reaction
  const [sessionOverrides, setSessionOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('study_session_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState(() => {
    try {
      const cached = localStorage.getItem('study_messages');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  // ── PREFERENCES: Theme & Calendar View ──
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  const [calendarDaysMode, setCalendarDaysModeState] = useState(() => {
    return localStorage.getItem('pref_calendarDaysMode') || 'workdays'; // 'workdays' (5 dni) | 'full' (7 dni)
  });

  const [calendarCategoryFilter, setCalendarCategoryFilterState] = useState(() => {
    return localStorage.getItem('pref_calendarCategoryFilter') || 'all'; // 'all' | 'academic' | 'personal'
  });

  const [calendarCourseFilter, setCalendarCourseFilterState] = useState(() => {
    return localStorage.getItem('pref_calendarCourseFilter') || 'all';
  });

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  const setCalendarDaysMode = useCallback((mode) => {
    setCalendarDaysModeState(mode);
    localStorage.setItem('pref_calendarDaysMode', mode);
  }, []);

  const setCalendarCategoryFilter = useCallback((cat) => {
    setCalendarCategoryFilterState(cat);
    localStorage.setItem('pref_calendarCategoryFilter', cat);
  }, []);

  const setCalendarCourseFilter = useCallback((cId) => {
    setCalendarCourseFilterState(cId);
    localStorage.setItem('pref_calendarCourseFilter', cId);
  }, []);

  // Sync Google Calendar directly with automatic token refresh on expiry
  const syncGoogleCalendar = useCallback(async (interactive = false) => {
    let tokenToUse = googleToken;

    if (!tokenToUse) {
      if (!interactive) return; // Do not trigger popup without user gesture
      try {
        tokenToUse = await refreshGoogleToken();
      } catch {
        console.warn('Nie można pobrać tokenu Google (anulowano lub zablokowano popup).');
        return;
      }
    }

    if (!tokenToUse) return;

    setSyncingGoogle(true);
    try {
      let gEvents;
      try {
        gEvents = await fetchGoogleCalendarEvents(tokenToUse);
      } catch (firstErr) {
        // If token expired (401 / invalid credentials), refresh if user clicked
        if (/credential|token|401|auth/i.test(firstErr?.message || '')) {
          if (!interactive) {
            console.warn('Google token wygasł. Kliknij "Synchronizuj", aby odnowić dostęp.');
            return;
          }
          try {
            const freshToken = await refreshGoogleToken();
            if (freshToken) {
              gEvents = await fetchGoogleCalendarEvents(freshToken);
            } else {
              return;
            }
          } catch {
            return;
          }
        } else {
          throw firstErr;
        }
      }

      if (gEvents) {
        setGoogleSessions(gEvents);
        try {
          localStorage.setItem('study_gcal_cache', JSON.stringify(gEvents));
        } catch {}
        console.log(`Pobrano ${gEvents.length} wydarzeń z Google Calendar`);
      }
    } catch (err) {
      console.warn('Błąd pobierania Google Calendar:', err);
    } finally {
      setSyncingGoogle(false);
    }
  }, [googleToken, refreshGoogleToken]);

  const lastSyncedTokenRef = useRef(null);

  // Initial fetch when token is present (only once per token, avoids 401 retry loops)
  useEffect(() => {
    if (googleToken && lastSyncedTokenRef.current !== googleToken) {
      lastSyncedTokenRef.current = googleToken;
      syncGoogleCalendar(false);
    }
  }, [googleToken, syncGoogleCalendar]);

  // Combine Firestore manual sessions and Google Calendar sessions + apply overrides
  const sessions = [...firestoreSessions, ...googleSessions]
    .map((s) => {
      const override = sessionOverrides[s.id] || (s.gcalId && sessionOverrides[s.gcalId]);
      const merged = override ? { ...s, ...override } : s;
      // Safeguard: Personal events must never be attached to a university course
      if (merged.category === 'personal' && merged.courseId) {
        return { ...merged, courseId: null };
      }
      // Auto-link to matching course if courseId is missing for academic events
      let effectiveCourseId = merged.courseId;
      if (!effectiveCourseId && merged.category !== 'personal') {
        const matchedCourse = courses.find((c) => matchesCourse(merged.title, c.name));
        if (matchedCourse) {
          effectiveCourseId = matchedCourse.id;
        }
      }
      return { ...merged, courseId: effectiveCourseId };
    })
    .filter((s) => !s.isHidden)
    .sort((a, b) => {
      const timeA = a.start?.toDate?.()?.getTime() || new Date(a.start || 0).getTime();
      const timeB = b.start?.toDate?.()?.getTime() || new Date(b.start || 0).getTime();
      return timeA - timeB;
    });

  useEffect(() => {
    if (!user) {
      setCourses([]);
      setSessions([]);
      setTasks([]);
      setMessages([]);
      setLoading(false);
      return;
    }

    const uid = user.uid;
    const unsubs = [];

    // Real-time listener: Courses (no composite index needed)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'courses'), where('uid', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setCourses(list);
        },
        (err) => console.warn('Courses snapshot error:', err)
      )
    );

    // Real-time listener: Sessions (no composite index needed)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'sessions'), where('uid', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setFirestoreSessions(list);
          try {
            localStorage.setItem('study_manual_sessions', JSON.stringify(list));
          } catch {}
          setLoading(false);
        },
        (err) => {
          console.warn('Sessions snapshot error:', err);
          setLoading(false);
        }
      )
    );

    // Real-time listener: Tasks (no composite index needed)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'tasks'), where('uid', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            if (a.done !== b.done) return a.done ? 1 : -1;
            const timeA = a.deadline?.toDate?.()?.getTime() || new Date(a.deadline || 0).getTime();
            const timeB = b.deadline?.toDate?.()?.getTime() || new Date(b.deadline || 0).getTime();
            return timeA - timeB;
          });
          setTasks(list);
        },
        (err) => console.warn('Tasks snapshot error:', err)
      )
    );

    // Real-time listener: Session Overrides (cancellations, room changes, notes)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'session_overrides'), where('uid', '==', uid)),
        (snap) => {
          setSessionOverrides((prev) => {
            const next = { ...prev };
            snap.docs.forEach((d) => {
              const data = d.data();
              if (data.sessionId) {
                next[data.sessionId] = { ...(next[data.sessionId] || {}), ...data };
                // Also map unprefixed/prefixed so lookup by s.id or s.gcalId always succeeds
                if (data.sessionId.startsWith('gcal_')) {
                  const raw = data.sessionId.slice(5);
                  next[raw] = { ...(next[raw] || {}), ...data };
                } else {
                  next[`gcal_${data.sessionId}`] = { ...(next[`gcal_${data.sessionId}`] || {}), ...data };
                }
              }
            });
            try {
              localStorage.setItem('study_session_overrides', JSON.stringify(next));
            } catch {}
            return next;
          });
        },
        (err) => console.warn('Session overrides snapshot error:', err)
      )
    );

    // Real-time listener: Messages (Discord & Teams announcements)
    unsubs.push(
      onSnapshot(
        query(collection(db, 'messages'), where('uid', '==', uid)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.()?.getTime() || new Date(a.timestamp || 0).getTime();
            const timeB = b.createdAt?.toDate?.()?.getTime() || new Date(b.timestamp || 0).getTime();
            return timeB - timeA; // newest first
          });
          setMessages(list);
          try {
            localStorage.setItem('study_messages', JSON.stringify(list));
          } catch {}
        },
        (err) => console.warn('Messages snapshot error:', err)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [user]);

  // Automatic migration/sync: If user is logged in, ensure any local overrides/tasks from localStorage
  // are pushed to Firestore so they are immediately available on all devices (PC & mobile).
  const syncLocalDataToFirestore = useCallback(async () => {
    if (!user?.uid) return;
    try {
      // 1. Session Overrides (cancellations, studentNotes, customSlotTime, topicsToSend)
      const rawOverrides = localStorage.getItem('study_session_overrides');
      if (rawOverrides) {
        const parsed = JSON.parse(rawOverrides);
        for (const [sessionId, data] of Object.entries(parsed)) {
          if (!data || typeof data !== 'object') continue;
          const safeDocId = `${user.uid}_${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const allowedFields = [
            'title', 'start', 'end', 'category', 'mode',
            'location', 'teamsLink', 'upelUrl', 'courseId', 'studentNotes', 'note',
            'customSlotTime', 'customSlotDuration', 'customSlotMode', 'customSlotLocation',
            'topicsToSend', 'isCancelled', 'isHidden', 'isConvertedToNote'
          ];
          const cleanDoc = { uid: user.uid, sessionId };
          allowedFields.forEach((f) => {
            if (data[f] !== undefined) cleanDoc[f] = data[f];
          });
          cleanDoc.updatedAt = serverTimestamp();
          await setDoc(doc(db, 'session_overrides', safeDocId), cleanDoc, { merge: true }).catch(() => {});
        }
      }

      // 2. Manual Sessions
      const rawSessions = localStorage.getItem('study_manual_sessions');
      if (rawSessions) {
        const parsedSessions = JSON.parse(rawSessions);
        for (const s of parsedSessions) {
          if (!s || !s.title) continue;
          const sId = s.id || `session_${Date.now()}`;
          const cleanSession = {
            uid: user.uid,
            title: s.title,
            courseId: s.courseId || null,
            start: s.start instanceof Date || s.start?.toDate ? s.start : (s.start || new Date().toISOString()),
            end: s.end instanceof Date || s.end?.toDate ? s.end : (s.end || new Date().toISOString()),
            mode: s.mode || 'onsite',
            location: s.location || null,
            teamsLink: s.teamsLink || null,
            upelUrl: s.upelUrl || null,
            source: s.source || 'manual',
            isCancelled: Boolean(s.isCancelled),
            updatedAt: serverTimestamp()
          };
          await setDoc(doc(db, 'sessions', sId), cleanSession, { merge: true }).catch(() => {});
        }
      }

      // 3. Tasks
      const rawTasks = localStorage.getItem('study_tasks');
      if (rawTasks) {
        const parsedTasks = JSON.parse(rawTasks);
        for (const t of parsedTasks) {
          if (!t || !t.title) continue;
          const tId = t.id || `task_${Date.now()}`;
          const cleanTask = {
            uid: user.uid,
            title: t.title,
            courseId: t.courseId || null,
            sessionId: t.sessionId || null,
            sessionTitle: t.sessionTitle || null,
            deadline: t.deadline instanceof Date || t.deadline?.toDate ? t.deadline : (t.deadline || null),
            priority: t.priority || 'medium',
            note: t.note || null,
            done: Boolean(t.done),
            updatedAt: serverTimestamp()
          };
          await setDoc(doc(db, 'tasks', tId), cleanTask, { merge: true }).catch(() => {});
        }
      }
      console.log('✅ Synchronizacja danych lokalnych z Cloud Firestore zakończona');
    } catch (err) {
      console.warn('Auto-sync error:', err);
    }
  }, [user]);

  // Run auto-sync once on login
  useEffect(() => {
    if (user?.uid) {
      syncLocalDataToFirestore();
    }
  }, [user, syncLocalDataToFirestore]);

  // ─── COURSES ──────────────────────────────────────────────────────────────

  const addCourse = useCallback(
    async ({
      name,
      color,
      type,
      discordChannelId,
      discordChannelName,
      discordUrl,
      discordServerName,
      teamsChannelId,
      teamsUrl,
      upelUrl,
      upelWykUrl,
      upelLabUrl,
      upelProjUrl,
    }) => {
      const docRef = await addDoc(collection(db, 'courses'), {
        uid: user.uid,
        name,
        color: color || '#3B82F6',
        type: type || 'lecture', // lecture | lab | project | exercise
        discordChannelId: discordChannelId || null,
        discordChannelName: discordChannelName || null,
        discordUrl: discordUrl || null,
        discordServerName: discordServerName || 'Teleinformatyka magisterka 2025/6',
        teamsChannelId: teamsChannelId || null,
        teamsUrl: teamsUrl || null,
        upelUrl: upelUrl || null,
        upelWykUrl: upelWykUrl || null,
        upelLabUrl: upelLabUrl || null,
        upelProjUrl: upelProjUrl || null,
        resources: [], // pinned links/files
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [user]
  );

  const updateCourse = useCallback(async (courseId, updates) => {
    await updateDoc(doc(db, 'courses', courseId), { ...updates, updatedAt: serverTimestamp() });
  }, []);

  const deleteCourse = useCallback(async (courseId) => {
    await deleteDoc(doc(db, 'courses', courseId));
  }, []);


  // ─── SESSIONS (schedule) ──────────────────────────────────────────────────

  const addSession = useCallback(
    async ({
      courseId,
      title,
      start,
      end,
      mode,
      location,
      teamsLink,
      source,
      category,
      isCancelled,
      note,
      studentNotes,
    }) => {
      const tempId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      let startDate = start;
      if (start?.toDate) {
        startDate = start.toDate();
      } else if (typeof start === 'string' || typeof start === 'number') {
        startDate = new Date(start);
      }
      let endDate = end;
      if (end?.toDate) {
        endDate = end.toDate();
      } else if (typeof end === 'string' || typeof end === 'number') {
        endDate = new Date(end);
      }

      const newSessionObj = {
        id: tempId,
        uid: user?.uid || 'local',
        courseId: courseId || null,
        title: title || 'Zajęcia',
        start: startDate instanceof Date && !isNaN(startDate.getTime()) ? startDate.toISOString() : start,
        end: endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate.toISOString() : end,
        mode: mode || 'unknown', // 'online' | 'onsite' | 'unknown'
        location: location || null,
        teamsLink: teamsLink || null,
        source: source || 'manual',
        category: category || 'academic',
        isCancelled: Boolean(isCancelled),
        note: note || '',
        studentNotes: studentNotes || '',
        createdAt: new Date().toISOString(),
      };

      // 1. Instant optimistic local update
      setFirestoreSessions((prev) => {
        const next = [newSessionObj, ...prev.filter((s) => s.id !== tempId)];
        try {
          localStorage.setItem('study_manual_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Background Firestore sync
      if (user?.uid) {
        try {
          const docRef = await addDoc(collection(db, 'sessions'), {
            uid: user.uid,
            courseId: courseId || null,
            title: title || 'Zajęcia',
            start: start instanceof Date || start?.toDate ? start : Timestamp.fromDate(new Date(start)),
            end: end instanceof Date || end?.toDate ? end : Timestamp.fromDate(new Date(end)),
            mode: mode || 'unknown',
            location: location || null,
            teamsLink: teamsLink || null,
            source: source || 'manual',
            category: category || 'academic',
            isCancelled: Boolean(isCancelled),
            note: note || '',
            studentNotes: studentNotes || '',
            createdAt: serverTimestamp(),
          });
          // Update temp ID to actual Firestore doc ID
          setFirestoreSessions((prev) => {
            const next = prev.map((s) => (s.id === tempId ? { ...s, id: docRef.id } : s));
            try {
              localStorage.setItem('study_manual_sessions', JSON.stringify(next));
            } catch {}
            return next;
          });
          return docRef.id;
        } catch (err) {
          console.warn('Failed to sync session to firestore, kept locally:', err);
        }
      }
      return tempId;
    },
    [user]
  );

  // Update session (instant state update + localStorage + Firestore background sync)
  const updateSession = useCallback(
    async (sessionId, updates) => {
      // 1. Instant local state update
      const serializedUpdates = { ...updates };
      if (serializedUpdates.start instanceof Date) serializedUpdates.start = serializedUpdates.start.toISOString();
      if (serializedUpdates.end instanceof Date) serializedUpdates.end = serializedUpdates.end.toISOString();

      // If this session is in firestoreSessions, update it directly too
      setFirestoreSessions((prev) => {
        const exists = prev.some((s) => s.id === sessionId);
        if (!exists) return prev;
        const next = prev.map((s) => (s.id === sessionId ? { ...s, ...serializedUpdates } : s));
        try {
          localStorage.setItem('study_manual_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Update overrides under both key variants (with and without gcal_ prefix)
      setSessionOverrides((prev) => {
        const next = {
          ...prev,
          [sessionId]: { ...(prev[sessionId] || {}), ...serializedUpdates },
        };
        if (sessionId.startsWith('gcal_')) {
          const rawId = sessionId.slice(5);
          next[rawId] = { ...(next[rawId] || {}), ...serializedUpdates };
        } else {
          next[`gcal_${sessionId}`] = { ...(next[`gcal_${sessionId}`] || {}), ...serializedUpdates };
        }
        try {
          localStorage.setItem('study_session_overrides', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Background Firestore sync
      if (user) {
        try {
          // If manual session in firestoreSessions, update the session doc
          const isManual = firestoreSessions.some((s) => s.id === sessionId);
          if (isManual) {
            await updateDoc(doc(db, 'sessions', sessionId), {
              ...serializedUpdates,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }

          // Whitelist allowed fields for session_overrides according to security rules
          const allowedFields = [
            'title', 'start', 'end', 'category', 'mode',
            'location', 'teamsLink', 'upelUrl', 'courseId', 'studentNotes', 'note',
            'customSlotTime', 'customSlotDuration', 'customSlotMode', 'customSlotLocation',
            'topicsToSend', 'isCancelled', 'isHidden', 'isConvertedToNote'
          ];
          const cleanDoc = { uid: user.uid, sessionId };
          allowedFields.forEach((f) => {
            if (serializedUpdates[f] !== undefined) {
              cleanDoc[f] = serializedUpdates[f];
            }
          });
          cleanDoc.updatedAt = serverTimestamp();

          // Create safe Firestore doc ID (strip any special characters from Google Calendar ID)
          const safeDocId = `${user.uid}_${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          await setDoc(doc(db, 'session_overrides', safeDocId), cleanDoc, { merge: true });
        } catch (err) {
          console.warn('Could not sync session override to Firestore (stored locally in localStorage):', err);
        }
      }
    },
    [user, firestoreSessions]
  );

  // Bulk link multiple calendar sessions to a course
  const linkCourseSessions = useCallback(
    async (courseId, sessionIds = []) => {
      for (const sid of sessionIds) {
        await updateSession(sid, { courseId });
      }
    },
    [updateSession]
  );

  // Pre-seed or link user's 8 specific Semester 2 courses and electives
  const initializeSemester2Courses = useCallback(async () => {
    if (!user) return [];
    const results = [];

    for (const preset of SEMESTER_2_PRESET_COURSES) {
      const norm = normalizeCourseName(preset.name);
      let target = courses.find((c) => {
        const cNorm = normalizeCourseName(c.name);
        return cNorm === norm || cNorm.includes(norm) || norm.includes(cNorm);
      });

      let courseId = target?.id;
      if (!courseId) {
        courseId = await addCourse({
          name: preset.name,
          color: preset.color,
          type: preset.type,
          upelUrl: null,
          teamsUrl: null,
        });
      } else if (target && target.type !== preset.type && preset.type === 'lektorat') {
        await updateCourse(courseId, { type: 'lektorat', color: preset.color });
      }

      // Link any sessions in calendar that match
      const matching = findMatchingSessionsForCourse(sessions, preset.name);
      if (matching.length > 0 && courseId) {
        await linkCourseSessions(courseId, matching.map((s) => s.id));
      }

      results.push({ id: courseId, name: preset.name, count: matching.length });
    }

    return results;
  }, [user, courses, sessions, addCourse, linkCourseSessions]);

  // Delete or hide session with confirmation (instant update + localStorage + Firestore)
  const deleteSession = useCallback(
    async (sessionId) => {
      // 1. Remove from manual sessions if present
      setFirestoreSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        try {
          localStorage.setItem('study_manual_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 2. Hide via overrides for Google calendar or manual sessions
      setSessionOverrides((prev) => {
        const next = {
          ...prev,
          [sessionId]: { ...(prev[sessionId] || {}), isHidden: true },
        };
        if (sessionId.startsWith('gcal_')) {
          const rawId = sessionId.slice(5);
          next[rawId] = { ...(next[rawId] || {}), isHidden: true };
        } else {
          next[`gcal_${sessionId}`] = { ...(next[`gcal_${sessionId}`] || {}), isHidden: true };
        }
        try {
          localStorage.setItem('study_session_overrides', JSON.stringify(next));
        } catch {}
        return next;
      });

      // 3. Background Firestore sync
      if (user) {
        try {
          // If manual doc exists, delete it
          deleteDoc(doc(db, 'sessions', sessionId)).catch(() => {});

          const safeDocId = `${user.uid}_${sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          await setDoc(
            doc(db, 'session_overrides', safeDocId),
            { uid: user.uid, sessionId, isHidden: true, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } catch (err) {
          console.warn('Could not sync delete to Firestore (stored locally in localStorage):', err);
        }
      }
    },
    [user]
  );

  // ─── TASKS ────────────────────────────────────────────────────────────────

  const addTask = useCallback(
    async ({ title, courseId, sessionId, sessionTitle, deadline, priority, note }) => {
      await addDoc(collection(db, 'tasks'), {
        uid: user.uid,
        title,
        courseId: courseId || null,
        sessionId: sessionId || null,
        sessionTitle: sessionTitle || null,
        deadline: deadline || null,
        priority: priority || 'medium', // 'high' | 'medium' | 'low'
        note: note || '',
        done: false,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );

  const toggleTask = useCallback(async (taskId, done) => {
    await updateDoc(doc(db, 'tasks', taskId), {
      done,
      doneAt: done ? serverTimestamp() : null,
    });
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    await deleteDoc(doc(db, 'tasks', taskId));
  }, []);

  // ─── MESSAGES (Discord & Teams announcements) ──────────────────────────────

  const addMessage = useCallback(
    async ({ courseId, content, author, source = 'discord', channelName, url, timestamp }) => {
      const docRef = await addDoc(collection(db, 'messages'), {
        uid: user.uid,
        courseId: courseId || null,
        content: content.trim(),
        author: author?.trim() || 'Anonim',
        source: source || 'discord',
        channelName: channelName || null,
        url: url || null,
        timestamp: timestamp || new Date().toISOString(),
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [user]
  );

  const deleteMessage = useCallback(async (messageId) => {
    await deleteDoc(doc(db, 'messages', messageId));
  }, []);

  // ─── RESOURCES (pinned links/files) ───────────────────────────────────────

  const pinResource = useCallback(
    async (courseId, resource) => {
      // resource: { type, title, url, source ('discord'|'teams'|'manual'), messageId? }
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;
      const updated = [...(course.resources || []), { ...resource, pinnedAt: new Date().toISOString() }];
      await updateDoc(doc(db, 'courses', courseId), { resources: updated });
    },
    [courses]
  );

  const unpinResource = useCallback(
    async (courseId, resourceIndex) => {
      const course = courses.find((c) => c.id === courseId);
      if (!course) return;
      const updated = course.resources.filter((_, i) => i !== resourceIndex);
      await updateDoc(doc(db, 'courses', courseId), { resources: updated });
    },
    [courses]
  );

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  // Today's sessions sorted by start time (excluding sessions converted to course notes)
  const todaySessions = sessions.filter((s) => {
    if (s.isConvertedToNote) return false;
    const d = s.start?.toDate?.() || new Date(s.start);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  // Next upcoming session
  const nextSession = sessions[0] || null;

  // Sessions for a specific course
  const getCourseSessions = useCallback(
    (courseId) => sessions.filter((s) => s.courseId === courseId),
    [sessions]
  );

  // Floating "Okno w oknie" dashboard state for real Teams, UPeL, and Discord
  const [floatingWindow, setFloatingWindow] = useState({
    isOpen: false,
    service: 'teams', // 'teams' | 'upel' | 'discord'
    customUrl: '',
    courseId: null,
  });

  const openFloatingDashboard = useCallback((service = 'teams', customUrl = '', courseId = null) => {
    setFloatingWindow({
      isOpen: true,
      service,
      customUrl: customUrl || '',
      courseId: courseId || null,
    });
  }, []);

  const closeFloatingDashboard = useCallback(() => {
    setFloatingWindow((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <DataContext.Provider
      value={{
        courses,
        sessions,
        sessionOverrides,
        tasks,
        messages,
        loading,
        todaySessions,
        nextSession,
        selectedCourseId,
        setSelectedCourseId,
        syncGoogleCalendar,
        syncingGoogle,
        googleSessionsCount: googleSessions.length,
        addCourse,
        updateCourse,
        deleteCourse,
        linkCourseSessions,
        initializeSemester2Courses,
        addSession,
        updateSession,
        deleteSession,
        addTask,
        toggleTask,
        deleteTask,
        pinResource,
        unpinResource,
        addMessage,
        deleteMessage,
        getCourseSessions,
        floatingWindow,
        setFloatingWindow,
        openFloatingDashboard,
        closeFloatingDashboard,
        syncLocalDataToFirestore,
        theme,
        setTheme,
        toggleTheme,
        calendarDaysMode,
        setCalendarDaysMode,
        calendarCategoryFilter,
        setCalendarCategoryFilter,
        calendarCourseFilter,
        setCalendarCourseFilter,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
};
