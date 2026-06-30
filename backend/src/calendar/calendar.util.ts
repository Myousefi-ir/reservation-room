import { toUtcRange } from '../common/time/tehran-time';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  roomName: string;
  /** Tehran calendar date "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
}

/** Date → iCalendar UTC stamp, e.g. 20260701T043000Z */
function toIcalUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(text: string): string {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Builds a downloadable .ics document for a single reservation. */
export function buildIcs(ev: CalendarEvent): string {
  const { startUtc, endUtc } = toUtcRange(ev.date, ev.startTime, ev.endTime);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mammut Structures//VIP Room Reservation//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}@mammut-vip`,
    `DTSTAMP:${toIcalUtc(new Date())}`,
    `DTSTART:${toIcalUtc(startUtc)}`,
    `DTEND:${toIcalUtc(endUtc)}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
    `DESCRIPTION:${escapeIcsText(ev.description || '')}`,
    `LOCATION:${escapeIcsText(ev.roomName)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // iCalendar requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/** Builds an "Add to Google Calendar" URL for a single reservation. */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const { startUtc, endUtc } = toUtcRange(ev.date, ev.startTime, ev.endTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toIcalUtc(startUtc)}/${toIcalUtc(endUtc)}`,
    details: ev.description || '',
    location: ev.roomName,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
