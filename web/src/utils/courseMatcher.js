// Utility for matching and semi-automatically linking courses and sessions
import { detectType } from '../components/WeekGridView.jsx';

export const COURSE_TYPES = [
  { value: 'lecture', code: 'W', label: '📘 W - Wykład', shortLabel: 'Wykład (W)', color: '#3B82F6', badge: 'W • WYKŁAD' },
  { value: 'exercise', code: 'CWA', label: '📕 CWA - Ćwiczenia', shortLabel: 'Ćwiczenia', color: '#8B5CF6', badge: 'CWA • ĆWICZENIA' },
  { value: 'lab', code: 'CWL', label: '📗 CWL - Laboratorium', shortLabel: 'Laboratorium', color: '#10B981', badge: 'CWL • LAB' },
  { value: 'project', code: 'CWP', label: '📙 CWP - Projekt', shortLabel: 'Projekt', color: '#F59E0B', badge: 'CWP • PROJEKT' },
  { value: 'seminar', code: 'SEM', label: '🎓 SEM - Seminarium', shortLabel: 'Seminarium', color: '#06B6D4', badge: 'SEM • SEMINARIUM' },
  { value: 'lektorat', code: 'LEK', label: '🗣️ LEK - Lektorat', shortLabel: 'Lektorat', color: '#6366F1', badge: 'LEK • LEKTORAT' },
  { value: 'consultation', code: 'KON', label: '💬 Konsultacje', shortLabel: 'Konsultacje', color: '#EC4899', badge: 'KONSULTACJE' },
  { value: 'other', code: 'INNE', label: '📓 Inne', shortLabel: 'Inne', color: '#6B7280', badge: 'ZAJĘCIA' },
];

export function getCourseTypeConfig(type = '') {
  const norm = String(type || '').toLowerCase();
  if (norm === 'lab' || norm === 'cwl') return COURSE_TYPES.find((t) => t.value === 'lab');
  if (norm === 'project' || norm === 'cwp') return COURSE_TYPES.find((t) => t.value === 'project');
  if (norm === 'exercise' || norm === 'cwa') return COURSE_TYPES.find((t) => t.value === 'exercise');
  if (norm === 'lecture' || norm === 'w' || norm === 'wyk') return COURSE_TYPES.find((t) => t.value === 'lecture');
  if (norm === 'seminar' || norm === 'sem') return COURSE_TYPES.find((t) => t.value === 'seminar');
  if (norm === 'lektorat' || norm === 'lek') return COURSE_TYPES.find((t) => t.value === 'lektorat');
  if (norm === 'consultation' || norm === 'kon') return COURSE_TYPES.find((t) => t.value === 'consultation');
  return COURSE_TYPES.find((t) => t.value === 'other') || COURSE_TYPES[0];
}

// Detect specific USOS type codes: CWL, CWP, CWA, W, SEM, LEK
export function detectUsosTypeCode(title = '', desc = '') {
  const t = String(title || '').trim();
  const text = `${t} ${desc || ''}`;

  // 1. Foreign language / Lektorat check (top priority for English / language courses)
  if (
    /^lek\s*[-–:]/i.test(t) ||
    /^sjo\s*[-–:]/i.test(t) ||
    /\bLEK\b/i.test(t) ||
    /\s*-\s*LEK(?:\s*[-–]|\s*$)/i.test(t) ||
    /\b(?:lek|lektorat|angielski|język\s*angielski|jezyk\s*angielski|język\s*obcy|jezyk\s*obcy|\bsjo\b)\b/i.test(text)
  ) {
    return 'LEK';
  }

  // 2. Authoritative leading prefixes in title
  // USOS titles format: "W - Metodyki projektów...", "CWL - Systemy...", "CWP - Inżynieria..."
  if (
    /^(?:w|wyk|wyklad|wykład)\s*[-–—:.]/i.test(t) ||
    /\([Ww]\)|\[[Ww]\]/.test(t) ||
    /\s*[-–—]\s*[Ww](?:\s*[-–—]|\s*$)/.test(t) ||
    /\bWYK\b/i.test(t) ||
    /\bwyk[lł]ad(?:y)?\b/i.test(t) ||
    /rodzaj(?:\s+zajęć)?:\s*W\b/i.test(text)
  ) {
    return 'W';
  }

  if (
    /^(?:cwl|lab)\s*[-–—:.]/i.test(t) ||
    /\bCWL\b/i.test(t) ||
    /\([Ll]\)|\[[Ll]\]/.test(t) ||
    /\s*[-–—]\s*CWL(?:\s*[-–—]|\s*$)/i.test(t)
  ) {
    return 'CWL';
  }

  if (
    /^(?:cwp|proj)\s*[-–—:.]/i.test(t) ||
    /\bCWP\b/i.test(t) ||
    /\([Pp]\)|\[[Pp]\]/.test(t) ||
    /\s*[-–—]\s*CWP(?:\s*[-–—]|\s*$)/i.test(t) ||
    /rodzaj(?:\s+zajęć)?:\s*CWP\b/i.test(text)
  ) {
    return 'CWP';
  }

  if (
    /^(?:cwa|ćw|cw)\s*[-–—:.]/i.test(t) ||
    /\bCWA\b/i.test(t) ||
    /\([CcĆć]\)|\[[CcĆć]\]/.test(t) ||
    /\s*[-–—]\s*CWA(?:\s*[-–—]|\s*$)/i.test(t)
  ) {
    return 'CWA';
  }

  if (/^(?:sem)\s*[-–—:.]/i.test(t) || /\bSEM\b/i.test(t)) return 'SEM';
  if (/^(?:kon)\s*[-–—:.]/i.test(t) || /\bKON\b/i.test(t)) return 'KON';

  // 3. Full descriptive words in title / desc (when no prefix was present)
  if (/wyk[lł]ad/i.test(text)) return 'W';
  if (/ćwiczenia\s+lab|laboratori/i.test(text)) return 'CWL';
  if (/ćwiczenia\s+proj/i.test(text)) return 'CWP';
  if (/ćwiczenia\s+audyt|ćwiczeni/i.test(text)) return 'CWA';
  if (/seminar/i.test(text)) return 'SEM';
  if (/konsultacj/i.test(text)) return 'KON';

  // If title has "metodyki", default to lecture W unless explicitly CWP
  if (/metodyk/i.test(t) && !/\bcwp\b/i.test(t)) {
    return 'W';
  }

  return null;
}

export function getCourseTypeByCode(code = '', fallbackType = 'lecture') {
  if (code === 'CWL') return COURSE_TYPES.find((t) => t.value === 'lab');
  if (code === 'CWP') return COURSE_TYPES.find((t) => t.value === 'project');
  if (code === 'CWA') return COURSE_TYPES.find((t) => t.value === 'exercise');
  if (code === 'W' || code === 'WYK') return COURSE_TYPES.find((t) => t.value === 'lecture');
  if (code === 'SEM') return COURSE_TYPES.find((t) => t.value === 'seminar');
  if (code === 'LEK') return COURSE_TYPES.find((t) => t.value === 'lektorat');
  if (code === 'KON') return COURSE_TYPES.find((t) => t.value === 'consultation');
  return getCourseTypeConfig(fallbackType);
}

// Extract clean base course wrapper name (e.g. "Metodyki projektów teleinformatycznych", "Systemy Wbudowane")
export function cleanBaseCourseName(rawTitle = '') {
  let cleaned = String(rawTitle || '').trim();
  // Strip leading prefixes: "W - ", "CWL - ", "CWP - ", "CWA - ", "SEM - ", "LEK - ", "KON - ", "WYK - ", "LAB - ", "SJO - "
  cleaned = cleaned.replace(/^(?:w|cwl|cwp|cwa|sem|lek|kon|wyk|lab|proj|ćw|sjo)\s*[-–:]\s*/i, '');
  // Strip trailing suffixes
  cleaned = cleaned
    .replace(/\s*-\s*(?:cwa|cwl|cwp|wyk|w|sem|lek|kon|sjo)\s*-\s*(?:ćwiczenia(?:\s+(?:audytoryjne|laboratoryjne|projektowe))?|cwiczenia|laboratorium|laboratoria|ćwiczenia\s+lab|projekt|ćwiczenia\s+proj|wykład|wyklad|seminarium|lektorat|konsultacje)\s*$/gi, '')
    .replace(/\s*-\s*(?:cwa|cwl|cwp|wyk|w|sem|lek|kon|sjo)\s*$/gi, '')
    .replace(/\s*-\s*(?:wykład|wyklad|lab|laboratorium|laboratoria|projekt|ćwiczenia(?:\s+(?:audytoryjne|laboratoryjne|projektowe))?|cwiczenia|seminarium|lektorat|konsultacje)\s*$/gi, '')
    .replace(/\s*\((?:cwa|cwl|cwp|wyk|w|sem|lek|kon|l|p|c|ć|sem|wyk|lab|proj|ćw|sjo)\)\s*$/gi, '')
    .replace(/\s*\[(?:cwa|cwl|cwp|wyk|w|sem|lek|kon|l|p|c|ć|sem|wyk|lab|proj|ćw|sjo)\]\s*$/gi, '')
    .trim();
  return cleaned;
}

// Semester 2 predefined subjects matching user's specific courses & electives (obieraki)
export const SEMESTER_2_PRESET_COURSES = [
  {
    name: 'Matematyka w projektowaniu sieci i systemów teleinformatycznych',
    shortName: 'Matematyka w proj. sieci',
    type: 'lecture',
    color: '#6366F1',
    aliases: [
      'matematyka w projektowaniu sieci i systemów teleinformatycznych',
      'matematyka w projektowaniu sieci i systemow teleinformatycznych',
      'matematyka w projektowaniu sieci i systemów',
      'matematyka w projektowaniu sieci i systemow',
      'matematyka w projektowaniu sieci',
      'matematyka w proj sieci',
      'matematyka w proj',
      'mwpsist',
      'mpsist',
    ],
  },
  {
    name: 'Sieci sterowane programowo',
    shortName: 'Sieci sterowane programowo',
    type: 'lecture',
    color: '#3B82F6',
    aliases: ['sieci sterowane programowo', 'ssp'],
  },
  {
    name: 'Przedsiębiorczość innowacyjna',
    shortName: 'Przedsiębiorczość innowacyjna',
    type: 'lecture',
    color: '#10B981',
    aliases: [
      'przedsiębiorczość innowacyjna',
      'przedsiebiorczosc innowacyjna',
      'przedsiębiorczość',
      'przedsiebiorczosc',
      'pi',
    ],
  },
  {
    name: 'Metodyki projektów teleinformatycznych',
    shortName: 'Metodyki projektów teleinf.',
    type: 'lecture',
    color: '#F59E0B',
    aliases: [
      'metodyki projektów teleinformatycznych',
      'metodyki projektow teleinformatycznych',
      'metodyki projektów',
      'metodyki projektow',
      'metodyki projektowania',
      'metodyki projektowania teleinformatycznego',
      'metodyki projektowania systemów teleinformatycznych',
      'metodyki projektowania systemow teleinformatycznych',
      'metodyki',
      'metodyki proj',
      'mpt',
    ],
  },
  {
    name: 'Język angielski',
    shortName: 'Język angielski',
    type: 'lektorat',
    color: '#6366F1',
    aliases: [
      'język angielski',
      'jezyk angielski',
      'angielski',
      'lektorat angielski',
      'lektorat z języka angielskiego',
      'lektorat',
      'angielski b2',
      'angielski c1',
      'angielski b1',
      'sjo',
      'studium języków obcych',
      'studium jezykow obcych',
    ],
  },
  {
    name: 'Ruting zewnętrzny w sieciach IP',
    shortName: 'Ruting zewn. w sieciach IP',
    type: 'lecture',
    color: '#8B5CF6',
    aliases: [
      'ruting zewnętrzny w sieciach ip',
      'routing zewnętrzny w sieciach ip',
      'ruting zewnetrzny w sieciach ip',
      'routing zewnetrzny w sieciach ip',
      'ruting zewnętrzny',
      'routing zewnętrzny',
      'ruting zewnetrzny',
      'routing zewnetrzny',
      'ruting w sieciach ip',
      'routing w sieciach ip',
      'rzwsip',
    ],
  },
  {
    name: 'Deep learning algorithms for cybersecurity',
    shortName: 'Deep Learning',
    type: 'lecture',
    color: '#06B6D4',
    aliases: [
      'deep learning algorithms for cybersecurity',
      'deep learning algorithms',
      'deep learning',
      'deeep learning',
      'algorytmy deep learning',
      'deep learning w cyberbezpieczeństwie',
      'dlac',
    ],
  },
  {
    name: 'Bezpieczeństwo w systemach 5G i 6G',
    shortName: 'Bezpieczeństwo 5G/6G',
    type: 'lecture',
    color: '#EF4444',
    aliases: [
      'bezpieczeństwo w systemach 5g i 6g',
      'bezpieczenstwo w systemach 5g i 6g',
      'bezpieczeństwo systemów 5g i 6g',
      'bezpieczenstwo systemow 5g i 6g',
      'bezpieczeństwo w systemach 5g',
      'bezpieczenstwo w systemach 5g',
      'bezpieczeństwo 5g',
      'bezpieczenstwo 5g',
      'bws5gi6g',
    ],
  },
];

// Clean and normalize strings for matching
export function normalizeCourseName(str = '') {
  return String(str || '')
    .toLowerCase()
    .replace(/^(?:w|cwl|cwp|cwa|sem|lek|kon|wyk|lab|proj|ćw)\s*[-–:]\s*/i, '')
    .replace(/\s*-\s*(?:cwa|cwl|cwp|wyk|w|sem|lek|kon)\s*-\s*(?:ćwiczenia(?:\s+(?:audytoryjne|laboratoryjne|projektowe))?|cwiczenia|laboratorium|laboratoria|ćwiczenia\s+lab|projekt|ćwiczenia\s+proj|wykład|wyklad|seminarium|lektorat|konsultacje)/gi, ' ')
    .replace(/\s*-\s*(?:cwa|cwl|cwp|wyk|w|sem|lek|kon)\b/gi, ' ')
    .replace(/\s*\((?:cwa|cwl|cwp|wyk|w|sem|lek|kon|l|p|c|ć|sem|wyk|lab|proj|ćw)\)\s*/gi, ' ')
    .replace(/\s*\[(?:cwa|cwl|cwp|wyk|w|sem|lek|kon|l|p|c|ć|sem|wyk|lab|proj|ćw)\]\s*/gi, ' ')
    .replace(/\s*-\s*(?:wykład|wyklad|lab|laboratorium|laboratoria|projekt|ćwiczenia(?:\s+(?:audytoryjne|laboratoryjne|projektowe))?|cwiczenia|seminarium|lektorat|konsultacje)/gi, ' ')
    .replace(/\brouting\b/gi, 'ruting')
    .replace(/\bdeeep\b/gi, 'deep')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if a calendar session title belongs to a course name wrapper
export function matchesCourse(sessionTitle = '', courseName = '') {
  if (!sessionTitle || !courseName) return false;

  const t = normalizeCourseName(sessionTitle);
  const c = normalizeCourseName(courseName);
  if (!t || !c) return false;

  // Exact or substring match on base subject name (require min 4 chars to prevent false substring collisions)
  if (t === c) return true;
  if (c.length >= 4 && t.length >= 4) {
    if (t.includes(c) || c.includes(t)) return true;
  }

  // Direct stem match for Metodyki (unique subject across entire curriculum)
  if (c.includes('metodyk') && t.includes('metodyk')) {
    return true;
  }

  // Preset alias matching (symmetric: if course matches a preset, check session against preset aliases)
  for (const preset of SEMESTER_2_PRESET_COURSES) {
    const presetNorm = normalizeCourseName(preset.name);
    const courseMatchesPreset =
      c === presetNorm ||
      (c.length >= 4 && (presetNorm.includes(c) || c.includes(presetNorm))) ||
      preset.aliases.some((a) => {
        const aNorm = normalizeCourseName(a);
        return c === aNorm || (aNorm.length >= 4 && (c.includes(aNorm) || aNorm.includes(c)));
      });

    if (courseMatchesPreset) {
      if (t === presetNorm || (t.length >= 4 && (presetNorm.includes(t) || t.includes(presetNorm)))) return true;
      for (const alias of preset.aliases) {
        const aNorm = normalizeCourseName(alias);
        if (t === aNorm) return true;
        if (aNorm.length >= 4 && t.length >= 4) {
          if (t.includes(aNorm) || aNorm.includes(t)) {
            return true;
          }
        }
      }
    }
  }

  // Acronym matching (e.g. "SK" for "Sieci Komputerowe", "SW" for "Systemy Wbudowane")
  const words = c.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const acronym = words.map((w) => w[0]).join('');
    const titleWords = t.split(/\s+/);
    if (titleWords.includes(acronym)) return true;
  }

  return false;
}

// Find all sessions in calendar that match a given course wrapper, optionally filtered by subsection
export function findMatchingSessionsForCourse(sessions = [], courseName = '', subsectionCode = null) {
  if (!courseName) return [];
  return sessions.filter((s) => {
    // NEVER match personal / private events to university courses!
    if (s.category === 'personal' || s.isAllDay) return false;
    if (!matchesCourse(s.title, courseName)) return false;
    if (subsectionCode && subsectionCode !== 'ALL') {
      const code = detectUsosTypeCode(s.title, s.description) || 'INNE';
      return code === subsectionCode;
    }
    return true;
  });
}

// Extract existing subsections (CWA, CWL, CWP, W...) from a collection of sessions
export function getCourseSubsections(sessions = []) {
  const map = new Map();
  sessions.forEach((s) => {
    const code = detectUsosTypeCode(s.title, s.description) || 'INNE';
    if (!map.has(code)) {
      const typeCfg = getCourseTypeByCode(code, detectType(s.title, s.description));
      map.set(code, {
        code,
        label: typeCfg.label,
        shortLabel: typeCfg.shortLabel,
        color: typeCfg.color,
        badge: typeCfg.badge,
        value: typeCfg.value,
        count: 0,
        sessions: [],
      });
    }
    const entry = map.get(code);
    entry.count++;
    entry.sessions.push(s);
  });

  const order = ['W', 'WYK', 'CWA', 'CWL', 'CWP', 'SEM', 'LEK', 'KON', 'INNE'];
  return Array.from(map.values()).sort((a, b) => {
    const idxA = order.indexOf(a.code);
    const idxB = order.indexOf(b.code);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
}

// Extract unique suggested course wrappers from calendar sessions with their detected subsections
export function extractSuggestedCoursesFromSessions(sessions = [], existingCourses = []) {
  const existingNormalized = new Set(
    existingCourses.map((c) => normalizeCourseName(c.name))
  );

  const groups = new Map();

  // 1. First, check user's Semester 2 preset courses and gather any matching sessions
  for (const preset of SEMESTER_2_PRESET_COURSES) {
    const norm = normalizeCourseName(preset.name);
    // Skip if already in user's course list
    if (existingNormalized.has(norm)) continue;

    const matchedSessions = findMatchingSessionsForCourse(sessions, preset.name);
    const g = {
      name: preset.name,
      baseName: preset.name,
      type: preset.type || 'lecture',
      color: preset.color || '#3B82F6',
      sessions: matchedSessions,
      teamsUrl: null,
      upelUrl: null,
      isSemester2Preset: true,
    };

    // Extract links from matched sessions if any
    matchedSessions.forEach((s) => {
      const combined = `${s.location || ''} ${s.description || ''}`;
      if (!g.teamsUrl) {
        if (s.teamsLink) g.teamsUrl = s.teamsLink;
        else {
          const tMatch = combined.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/i);
          if (tMatch) g.teamsUrl = tMatch[0];
        }
      }
      if (!g.upelUrl) {
        const uMatch = combined.match(/https:\/\/upel\.agh\.edu\.pl\/[^\s<>"]+/i);
        if (uMatch) g.upelUrl = uMatch[0];
      }
    });

    groups.set(norm, g);
  }

  // 2. Scan remaining sessions for any other subjects not covered by presets
  sessions.forEach((s) => {
    if (s.category === 'personal' || s.isAllDay) return;

    const rawTitle = (s.title || '').trim();
    if (!rawTitle) return;

    const baseName = cleanBaseCourseName(rawTitle);
    if (!baseName || baseName.length < 2) return;

    const norm = normalizeCourseName(baseName);
    if (!norm) return;

    if (existingNormalized.has(norm) || groups.has(norm)) return;

    // Check if it already matched one of the presets in groups
    let alreadyMatched = false;
    for (const [pNorm, pGroup] of groups.entries()) {
      if (matchesCourse(rawTitle, pGroup.name)) {
        if (!pGroup.sessions.some((ps) => ps.id === s.id)) {
          pGroup.sessions.push(s);
        }
        alreadyMatched = true;
        break;
      }
    }
    if (alreadyMatched) return;

    if (!groups.has(norm)) {
      groups.set(norm, {
        name: baseName,
        baseName,
        type: 'lecture',
        color: '#3B82F6',
        sessions: [],
        teamsUrl: null,
        upelUrl: null,
      });
    }

    const entry = groups.get(norm);
    entry.sessions.push(s);

    const combined = `${s.location || ''} ${s.description || ''}`;
    if (!entry.teamsUrl) {
      if (s.teamsLink) entry.teamsUrl = s.teamsLink;
      else {
        const tMatch = combined.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/i);
        if (tMatch) entry.teamsUrl = tMatch[0];
      }
    }
    if (!entry.upelUrl) {
      const uMatch = combined.match(/https:\/\/upel\.agh\.edu\.pl\/[^\s<>"]+/i);
      if (uMatch) entry.upelUrl = uMatch[0];
    }
  });

  // Attach detected subsections to each suggested course wrapper
  return Array.from(groups.values())
    .map((g) => {
      const subsections = getCourseSubsections(g.sessions);
      const primarySub = subsections[0];
      return {
        ...g,
        type: primarySub?.value || g.type || 'lecture',
        color: primarySub?.color || g.color || '#3B82F6',
        subsections,
        totalSessions: g.sessions.length,
      };
    })
    .sort((a, b) => {
      // Prioritize Semester 2 presets with sessions, then presets without sessions, then others
      if (a.isSemester2Preset && !b.isSemester2Preset) return -1;
      if (!a.isSemester2Preset && b.isSemester2Preset) return 1;
      return (b.totalSessions || 0) - (a.totalSessions || 0);
    });
}

/**
 * Resolves the effective UPeL link for a given session and/or course.
 * Handles separation between Lectures (Wykład) and Labs (Laboratoria) as well as Projects (Projekty).
 */
export function getEffectiveUpelLink(session, course) {
  // 1. Session-level explicit override (e.g. custom UPeL link for this specific class group)
  if (session?.upelUrl) {
    return {
      url: session.upelUrl,
      label: 'UPeL (Twoja grupa)',
      shortLabel: 'UPeL (Grupa)',
      type: 'custom',
    };
  }

  if (!course) return null;

  // 2. Detect session type (Lecture, Lab, Project, etc.)
  const typeCode = session ? detectUsosTypeCode(session.title, session.description) : null;

  // Laboratory / CWL
  if (typeCode === 'CWL' && course.upelLabUrl) {
    return {
      url: course.upelLabUrl,
      label: 'UPeL (Laboratoria)',
      shortLabel: 'UPeL (Laby)',
      type: 'lab',
    };
  }

  // Lecture / W / WYK
  if (typeCode === 'W' && (course.upelWykUrl || course.upelUrl)) {
    return {
      url: course.upelWykUrl || course.upelUrl,
      label: 'UPeL (Wykład)',
      shortLabel: 'UPeL (Wykład)',
      type: 'wyk',
    };
  }

  // Project / CWP
  if (typeCode === 'CWP' && (course.upelProjUrl || course.upelLabUrl || course.upelUrl)) {
    return {
      url: course.upelProjUrl || course.upelLabUrl || course.upelUrl,
      label: course.upelProjUrl ? 'UPeL (Projekt)' : 'UPeL (Laby/Projekt)',
      shortLabel: 'UPeL (Projekt)',
      type: 'project',
    };
  }

  // Exercise / CWA
  if (typeCode === 'CWA' && (course.upelCwaUrl || course.upelUrl || course.upelWykUrl)) {
    return {
      url: course.upelCwaUrl || course.upelUrl || course.upelWykUrl,
      label: 'UPeL (Ćwiczenia)',
      shortLabel: 'UPeL (Ćw)',
      type: 'exercise',
    };
  }

  // If lab type and only general or wyk is available
  if (typeCode === 'CWL') {
    const fallbackUrl = course.upelLabUrl || course.upelUrl || course.upelWykUrl;
    if (fallbackUrl) {
      return {
        url: fallbackUrl,
        label: course.upelLabUrl ? 'UPeL (Laboratoria)' : 'UPeL',
        shortLabel: 'UPeL',
        type: 'general',
      };
    }
  }

  // General fallback
  const generalUrl = course.upelUrl || course.upelWykUrl || course.upelLabUrl || course.upelProjUrl;
  if (generalUrl) {
    let label = 'UPeL';
    if (course.upelWykUrl && !course.upelUrl) label = 'UPeL (Wykład)';
    else if (course.upelLabUrl && !course.upelUrl) label = 'UPeL (Laby)';
    return {
      url: generalUrl,
      label,
      shortLabel: label,
      type: 'general',
    };
  }

  return null;
}

/**
 * Returns all configured UPeL links for a course.
 */
export function getAllCourseUpelLinks(course) {
  if (!course) return [];
  const links = [];

  if (course.upelWykUrl) {
    links.push({ type: 'wyk', label: 'UPeL Wykład', shortLabel: 'Wykład', url: course.upelWykUrl, icon: '📘', color: '#3B82F6' });
  }
  if (course.upelLabUrl) {
    links.push({ type: 'lab', label: 'UPeL Laby', shortLabel: 'Laby', url: course.upelLabUrl, icon: '📗', color: '#10B981' });
  }
  if (course.upelProjUrl) {
    links.push({ type: 'project', label: 'UPeL Projekt', shortLabel: 'Projekt', url: course.upelProjUrl, icon: '📙', color: '#F59E0B' });
  }
  if (course.upelUrl && course.upelUrl !== course.upelWykUrl && course.upelUrl !== course.upelLabUrl) {
    links.push({ type: 'general', label: 'UPeL Ogólny', shortLabel: 'Ogólny', url: course.upelUrl, icon: '🎓', color: '#F97316' });
  }

  return links;
}

