import { formatJalaliShort, toPersianDigits } from './jalali';

// Bookable weekdays via Date.getDay(): Sat=6, Sun=0, Mon=1, Tue=2, Wed=3.
const ALLOWED_WEEKDAYS = new Set([6, 0, 1, 2, 3]);

export interface DateOption {
  iso: string;
  day: string;
  month: string;
  weekday: string;
  isAllowed: boolean;
  isToday: boolean;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Builds the selectable date strip: today .. today + maxDays (inclusive). */
export function buildDateOptions(maxDays = 14): DateOption[] {
  const out: DateOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i <= maxDays; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISO(d);
    const short = formatJalaliShort(iso);
    out.push({
      iso,
      day: short.day,
      month: short.month,
      weekday: short.weekday,
      isAllowed: ALLOWED_WEEKDAYS.has(d.getDay()),
      isToday: i === 0,
    });
  }
  return out;
}

/** "08:00" → "۰۸" (Persian hour, no minutes). */
export function slotLabel(start: string, end: string): string {
  const h = (s: string) => toPersianDigits(s.slice(0, 2));
  return `${h(start)}–${h(end)}`;
}

export function firstAllowedISO(options: DateOption[]): string | null {
  const found = options.find((o) => o.isAllowed);
  return found ? found.iso : null;
}
