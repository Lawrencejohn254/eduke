import { getMonthGrid, MONTH_NAMES, WEEKDAY_LABELS, todayKey, type AttendanceRecord } from "@/lib/calendar";

const STATUS_CELL_CLASSES: Record<string, string> = {
  Present: "bg-eduke-green text-white",
  Absent: "bg-red-600 text-white",
  Late: "bg-orange-500 text-white",
  Excused: "bg-gray-400 text-white",
};

const LEGEND_ITEMS: { label: string; className: string }[] = [
  { label: "Present", className: "bg-eduke-green" },
  { label: "Absent", className: "bg-red-600" },
  { label: "Late", className: "bg-orange-500" },
  { label: "Excused", className: "bg-gray-400" },
  { label: "No record", className: "bg-gray-100 border border-gray-200" },
];

/**
 * Renders one month as a full-size calendar grid, each day coloured by attendance status.
 * `records` only needs to cover the given month — the parent page filters before passing them
 * in — so this stays a lightweight server component with no data-fetching of its own.
 */
export default function MonthAttendanceCalendar({
  year,
  month, // 0-11
  records,
}: {
  year: number;
  month: number;
  records: AttendanceRecord[];
}) {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const today = todayKey();
  const weeks = getMonthGrid(year, month);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
      <table className="w-full border-separate" style={{ borderSpacing: "6px" }}>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((w, i) => (
              <th key={i} className="text-xs font-medium text-gray-400 pb-1">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((cell) => {
                const record = byDate.get(cell.dateKey);
                const isToday = cell.dateKey === today;
                const statusClass = record ? STATUS_CELL_CLASSES[record.status] ?? "bg-gray-100" : "";
                return (
                  <td key={cell.dateKey} className="p-0 text-center">
                    <div
                      title={
                        record
                          ? `${cell.day} ${MONTH_NAMES[month]}: ${record.status}${record.notes ? ` — ${record.notes}` : ""}`
                          : undefined
                      }
                      className={[
                        "flex items-center justify-center aspect-square rounded-lg text-sm sm:text-base",
                        !cell.inMonth ? "text-gray-300" : record ? statusClass : "text-gray-700 bg-gray-50",
                        isToday ? "ring-2 ring-offset-1 ring-eduke-green" : "",
                      ].join(" ")}
                    >
                      {cell.day}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-5 pt-4 border-t border-gray-100">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded ${item.className}`} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}