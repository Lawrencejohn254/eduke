/**
 * Date/time helpers for the parent portal.
 *
 * Everything here is pure and takes an explicit IANA timezone, because the server usually runs in
 * UTC while a school's "today" is decided by the school's own timezone (schools.timezone).
 * Falls back to Africa/Nairobi when the school has no valid timezone configured.
 */

export const DEFAULT_TIMEZONE = "Africa/Nairobi";

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export type SchoolClock = {
  timezone: string;
  /** 1 = Monday … 7 = Sunday (matches timetable_slots.day_of_week) */
  weekday: number;
  /** minutes since local midnight */
  minutes: number;
  /** YYYY-MM-DD in the school's timezone (matches Postgres `date` columns) */
  dateKey: string;
  greeting: "Good morning" | "Good afternoon" | "Good evening";
};

export function getSchoolClock(timezone?: string | null, now: Date = new Date()): SchoolClock {
  const tz = safeTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return {
    timezone: tz,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 1,
    minutes: hour * 60 + minute,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
  };
}

/** "08:30:00" | "08:30" → minutes since midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** "14:05:00" → "2:05 PM" */
export function formatClock(time: string): string {
  const [hStr, mStr = "00"] = time.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr.slice(0, 2)} ${suffix}`;
}

/** Parses "YYYY-MM-DD" as a calendar date (no timezone shifting). */
function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-09-12" → "12 Sep"  (calendar dates never shift with timezone) */
export function formatDayMonth(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "";
  const d = parseDateOnly(dateOnly);
  if (!d) return "";
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** "2026-09-12" → "Sat 12 Sep" */
export function formatWeekdayDayMonth(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "";
  const d = parseDateOnly(dateOnly);
  if (!d) return "";
  return `${WEEKDAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** Whole calendar days from `fromKey` to `toKey` (YYYY-MM-DD). Negative when `toKey` is earlier. */
export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateOnly(fromKey);
  const b = parseDateOnly(toKey);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Converts a timestamp into the school's local YYYY-MM-DD. */
export function toDateKey(iso: string, timezone?: string | null): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return getSchoolClock(timezone, d).dateKey;
}

/**
 * Friendly label for a timestamp relative to "now" in the school's timezone:
 * "Just now" · "3h ago" · "Yesterday" · "12 Sep" · "12 Sep 2025" (different year)
 */
export function formatRelative(iso: string | null | undefined, timezone?: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (isNaN(then.getTime())) return "";

  const diffMinutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const nowKey = getSchoolClock(timezone, now).dateKey;
  const thenKey = getSchoolClock(timezone, then).dateKey;
  const dayGap = daysBetween(thenKey, nowKey);

  if (dayGap === 0) return `${Math.floor(diffMinutes / 60)}h ago`;
  if (dayGap === 1) return "Yesterday";
  if (dayGap < 7) return `${dayGap} days ago`;
  return nowKey.slice(0, 4) === thenKey.slice(0, 4) ? formatDayMonth(thenKey) : `${formatDayMonth(thenKey)} ${thenKey.slice(0, 4)}`;
}

/** Full readable timestamp for detail views: "12 Sep 2026, 2:05 PM" */
export function formatDateTime(iso: string | null | undefined, timezone?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tz = safeTimezone(timezone);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  return `${date}, ${time}`;
}

/** "Wednesday" for day_of_week 3, etc. */
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** "2026-09-20" shifted by N calendar days (negative = earlier). */
export function shiftDateKey(dateKey: string, days: number): string {
  const d = parseDateOnly(dateKey);
  if (!d) return dateKey;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
