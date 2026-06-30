import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat); // needed for dayjs.tz(str, format, tz)

export const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Tehran';

/** Day-of-week indices (dayjs/JS convention): 0=Sun ... 6=Sat. */
const ALLOWED_WEEKDAYS = new Set([6, 0, 1, 2, 3]); // Saturday → Wednesday

export interface Slot {
  /** e.g. "08:00" */
  start: string;
  /** e.g. "09:00" */
  end: string;
  /** integer start hour, e.g. 8 */
  hour: number;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function hourToHHmm(hour: number): string {
  return `${pad2(hour)}:00`;
}

/** Current moment in Tehran. */
export function nowTehran(): dayjs.Dayjs {
  return dayjs().tz(APP_TZ);
}

/** Today's calendar date in Tehran as "YYYY-MM-DD". */
export function todayTehran(): string {
  return nowTehran().format('YYYY-MM-DD');
}

/** Parse a "YYYY-MM-DD" string as a Tehran calendar date (start of day). */
export function tehranDate(dateStr: string): dayjs.Dayjs {
  return dayjs.tz(dateStr, 'YYYY-MM-DD', APP_TZ);
}

/** Tehran weekday index (0=Sun ... 6=Sat) for a "YYYY-MM-DD" date. */
export function weekdayOf(dateStr: string): number {
  return tehranDate(dateStr).day();
}

/** Only Saturday → Wednesday are bookable. */
export function isAllowedDay(dateStr: string): boolean {
  return ALLOWED_WEEKDAYS.has(weekdayOf(dateStr));
}

/** Validates "YYYY-MM-DD" shape and that it is a real date. */
export function isValidDateStr(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && tehranDate(dateStr).isValid();
}

/**
 * The date must be today .. today + maxDaysAhead (inclusive), in Tehran.
 */
export function isWithinBookingWindow(dateStr: string, maxDaysAhead: number): boolean {
  const today = tehranDate(todayTehran());
  const target = tehranDate(dateStr);
  const last = today.add(maxDaysAhead, 'day');
  return !target.isBefore(today, 'day') && !target.isAfter(last, 'day');
}

/** A slot is "past" when its start instant is now or already gone. */
export function isSlotPast(dateStr: string, hour: number): boolean {
  const slotStart = dayjs.tz(`${dateStr} ${hourToHHmm(hour)}`, 'YYYY-MM-DD HH:mm', APP_TZ);
  return slotStart.valueOf() <= nowTehran().valueOf();
}

/** Build the fixed one-hour slots between startHour and endHour. */
export function buildSlots(startHour: number, endHour: number): Slot[] {
  const slots: Slot[] = [];
  for (let h = startHour; h < endHour; h++) {
    slots.push({ start: hourToHHmm(h), end: hourToHHmm(h + 1), hour: h });
  }
  return slots;
}

/**
 * Converts a Tehran calendar date "YYYY-MM-DD" into the value Prisma expects
 * for a `@db.Date` column (UTC midnight of that calendar day). Using the same
 * helper everywhere guarantees writes and reads line up.
 */
export function prismaDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** A `@db.Date` value (UTC midnight) → "YYYY-MM-DD" calendar string. */
export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "08:00" → 8. Returns NaN when malformed. */
export function hhmmToHour(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return NaN;
  if (m[2] !== '00') return NaN;
  return parseInt(m[1], 10);
}

/**
 * Builds the absolute UTC Date objects for a reservation's start & end,
 * given Tehran date + "HH:mm" times. Used for ICS / calendar export.
 */
export function toUtcRange(dateStr: string, startHHmm: string, endHHmm: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const startUtc = dayjs.tz(`${dateStr} ${startHHmm}`, 'YYYY-MM-DD HH:mm', APP_TZ).utc().toDate();
  const endUtc = dayjs.tz(`${dateStr} ${endHHmm}`, 'YYYY-MM-DD HH:mm', APP_TZ).utc().toDate();
  return { startUtc, endUtc };
}
