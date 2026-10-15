import { parseAghLocation } from '../utils/aghCampus';

// Google Calendar API service
// Fetches events from ALL calendars in the user's account (primary + subscribed USOS/secondary calendars)

export async function fetchGoogleCalendarEvents(accessToken, timeMin, timeMax) {
  if (!accessToken) {
    throw new Error('Brak tokenu Google Calendar. Zaloguj się ponownie.');
  }

  // Fetch from 30 days in past to 180 days ahead (entire semester!)
  const start = timeMin
    ? timeMin.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = timeMax
    ? timeMax.toISOString()
    : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch all calendars the user has (primary + subscribed .ics like USOS)
  const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!calListRes.ok) {
    const errorData = await calListRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Calendar list error: ${calListRes.status}`);
  }

  const calListData = await calListRes.json();
  const calendars = calListData.items || [{ id: 'primary', summary: 'Główny' }];
  console.log('Znalezione kalendarze Google:', calendars.map((c) => c.summary));

  // 2. Fetch events from all calendars in parallel
  const allEventsPromises = calendars.map(async (cal) => {
    try {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events`);
      url.searchParams.set('timeMin', start);
      url.searchParams.set('timeMax', end);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '2500');

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data.items || []).map((item) => ({ ...item, calendarSummary: cal.summary }));
    } catch (err) {
      console.warn(`Błąd pobierania wydarzeń z kalendarza ${cal.summary}:`, err);
      return [];
    }
  });

  const calendarResults = await Promise.all(allEventsPromises);
  const items = calendarResults.flat();

  // 3. Parse Google events into our StudyOrganizer session format
  return items.map((item) => {
    const title = item.summary || 'Bez tytułu';
    const description = item.description || '';
    const location = item.location || '';
    const calName = (item.calendarSummary || '').toLowerCase();

    // Check if it's an all-day event
    const isAllDay = !!item.start?.date && !item.start?.dateTime;

    // Check if it's an online class (Teams / Zoom / Meet links)
    const teamsMatch =
      location.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/i) ||
      description.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/i);

    const meetMatch =
      item.hangoutLink ||
      location.match(/https:\/\/meet\.google\.com\/[^\s<>"]+/i) ||
      description.match(/https:\/\/meet\.google\.com\/[^\s<>"]+/i);

    const zoomMatch =
      location.match(/https:\/\/[a-z0-9.]*zoom\.us\/[^\s<>"]+/i) ||
      description.match(/https:\/\/[a-z0-9.]*zoom\.us\/[^\s<>"]+/i);

    const onlineLink = teamsMatch?.[0] || meetMatch?.[0] || zoomMatch?.[0] || null;
    
    // Parse AGH campus location (extract building, room, campus map URL, A0 remote)
    const aghLoc = parseAghLocation(location, description, title);
    const isOnline = !!onlineLink || aghLoc.isRemote || /zdalnie|online|teams/i.test(location + ' ' + title + ' ' + description);

    // Intelligent Academic Class vs Personal Event detection
    // Dedicated USOS/timetable calendars (ignoring personal email addresses like student.agh.edu.pl)
    const isFromUsosCal =
      /usos|plan\s*zaj|plan\s*studi|harmonogram/i.test(calName) &&
      !/@|student\.agh|gmail\.com|personal|prywatny|dom/i.test(calName);

    const isExplicitlyPersonal =
      /trening|si[lł]ownia|fitness|basen|bieganie|bieg|spacer|rower|mecz|squash|tenis|lekarz|dentysta|stomatolog|recepta|badani|wizyta|fryzjer|barber|kosmetyczka|mechanik|warsztat|zakupy|urodzin|urudzin|imienin|obiad|kolacj|śniadanie|kino|teatr|koncert|impreza|wakacj|urlop|lot|hotel|pociąg|bilet|rekrutacj|interview|rozmowa|spotkanie|praca|shift|dyżur|dyzur|call|odbiór|paczka|kurier|rodzin|znajomi|urodziny|urudzoiny|urodzinki|bday|b-day|birthday|imieniny|rocznica/i.test(
        title + ' ' + description
      );

    // Strict academic markers for events
    const hasAcademicKeywords =
      /^(?:w|cwl|cwp|cwa|sem|lek|kon|wyk|lab|proj|ćw|sjo)\s*[-–:]/i.test(title) ||
      /\b(?:cwa|cwl|cwp|wyk|sem|lek|sjo)\b/i.test(title) ||
      /\s*-\s*(?:w|cwl|cwp|cwa|sem|lek|wyk|sjo)(?:\s*[-–]|\s*$)/i.test(title) ||
      /\([WwLlPpCc]\)|\[[WwLlPpCc]\]/.test(title) ||
      /\b(?:wyk[lł]ad(?:y)?|laboratori(?:um|a|e)?|lektorat(?:y)?|seminari(?:um|a)?|ćwiczeni(?:a|e)|cwiczeni(?:a|e)|angielski|język\s*angielski|jezyk\s*angielski|sjo)\b/i.test(title) ||
      /rodzaj(?:\s+zajęć)?:\s*(?:W|CWL|CWP|CWA|SEM|LEK)\b/i.test(description) ||
      /prowadz[aą]cy:|kod\s*przedmiotu:|grupa\s*(?:zaj[eę]ciowa)?:\s*\d+|usosweb/i.test(description) ||
      (aghLoc.building && aghLoc.room);

    const isAcademic =
      !isExplicitlyPersonal &&
      (isFromUsosCal || hasAcademicKeywords) &&
      !isAllDay;

    const startTime = item.start?.dateTime || item.start?.date;
    const endTime = item.end?.dateTime || item.end?.date;

    return {
      id: 'gcal_' + item.id,
      gcalId: item.id,
      title: title,
      start: new Date(startTime),
      end: new Date(endTime),
      isAllDay,
      category: isAcademic ? 'academic' : 'personal',
      mode: isOnline ? 'online' : aghLoc.isOnsite ? 'onsite' : 'unknown',
      location: location || aghLoc.displayText || null,
      building: aghLoc.building,
      room: aghLoc.room,
      campusLocation: aghLoc.fullCampusText,
      mapUrl: aghLoc.mapUrl,
      teamsLink: onlineLink,
      source: 'google',
      calendarName: item.calendarSummary,
      description: description,
    };
  });
}
