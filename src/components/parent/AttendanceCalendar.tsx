import { Check, Clock, Minus, ShieldCheck, X, type LucideIcon } from "lucide-react";
import { MONTH_NAMES, getMonthGrid, type AttendanceRecord } from "@/lib/calendar";

export const STATUS_META: Record<string, { label: string; icon: LucideIcon; cell: string; swatch: string }> = {
  Present: { label: "Present", icon: Check, cell: "bg-pp-green-tint text-pp-green", swatch: "bg-pp-green" },
  Absent: { label: "Absent", icon: X, cell: "bg-pp-danger-tint text-pp-danger", swatch: "bg-pp-danger" },
  Late: { label: "Late", icon: Clock, cell: "bg-pp-warn-tint text-pp-warn", swatch: "bg-pp-gold" },
  Excused: { label: "Excused", icon: ShieldCheck, cell: "bg-pp-info-tint text-pp-info", swatch: "bg-pp-info" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * One month as a calendar. Every recorded day carries a tint AND an icon AND screen-reader text,
 * so status is never communicated by colour alone. `today` comes from the school's timezone.
 */
export default function AttendanceCalendar({ year, month, records, today }: { year: number; month: number; records: AttendanceRecord[]; today: string }) {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const weeks = getMonthGrid(year, month);

  return (
    <div>
      <table className="w-full table-fixed border-separate" style={{ borderSpacing: "4px" }}>
        <caption className="sr-only">
          Attendance for {MONTH_NAMES[month]} {year}
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="pb-1 text-center text-[0.6875rem] font-medium text-pp-muted sm:text-[0.75rem]">
                <span aria-hidden>{w}</span>
                <span className="sr-only">{w}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((cell) => {
                const record = cell.inMonth ? byDate.get(cell.dateKey) : undefined;
                const meta = record ? STATUS_META[record.status] : undefined;
                const Icon = meta?.icon ?? Minus;
                const isToday = cell.dateKey === today;
                return (
                  <td key={cell.dateKey} className="p-0">
                    <div
                      title={record ? `${cell.day} ${MONTH_NAMES[month]}: ${record.status}${record.notes ? ` — ${record.notes}` : ""}` : undefined}
                      className={[
                        "relative flex h-11 flex-col items-center justify-center rounded-md text-[0.8125rem] sm:h-14 sm:text-[0.9375rem]",
                        !cell.inMonth ? "text-pp-rule-strong" : meta ? `${meta.cell} font-semibold` : "bg-pp-sunken/70 text-pp-muted",
                        isToday ? "ring-2 ring-pp-ink ring-offset-1" : "",
                      ].join(" ")}
                    >
                      <span className="pp-num leading-none">{cell.day}</span>
                      {meta ? <Icon size={11} strokeWidth={3} aria-hidden className="mt-0.5 sm:mt-1" /> : null}
                      {cell.inMonth ? (
                        <span className="sr-only">
                          {MONTH_NAMES[month]} {cell.day}: {record ? record.status : "no record"}
                          {isToday ? " (today)" : ""}
                        </span>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-pp-rule pt-4 text-[0.8125rem] text-pp-muted">
        {Object.values(STATUS_META).map((m) => {
          const Icon = m.icon;
          return (
            <li key={m.label} className="flex items-center gap-1.5">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${m.cell}`}>
                <Icon size={11} strokeWidth={3} aria-hidden />
              </span>
              {m.label}
            </li>
          );
        })}
        <li className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-pp-sunken" />
          No record
        </li>
      </ul>
    </div>
  );
}
