export type CalendarDay = {
  year: number;
  month: number; // 0-11
  day: number;
  dateKey: string; // "YYYY-MM-DD" — matches Postgres `date` columns as returned by supabase-js
  inMonth: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Builds a Sunday-first week grid for one month, including the leading/trailing days from
 * adjacent months needed to fill whole weeks (marked `inMonth: false`).
 *
 * Deliberately avoids `Date#toISOString()` (which converts to UTC and can shift the date by a
 * day depending on server timezone) — `getFullYear`/`getMonth`/`getDate` are local-calendar
 * accessors, so as long as the Date was constructed with local-time arguments (which the
 * `new Date(year, month, day)` constructor always is), reading it back this way is safe
 * regardless of what timezone the server process runs in.
 */
export function getMonthGrid(year: number, monthIndex: number): CalendarDay[][] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const cells: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const d = new Date(year, monthIndex, dayOffset); // JS Date normalizes over/underflow across months
    cells.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      dateKey: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
      inMonth: d.getMonth() === monthIndex,
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < cells.length / 7; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  return weeks;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export type AttendanceRecord = { date: string; status: string; notes: string | null };

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
