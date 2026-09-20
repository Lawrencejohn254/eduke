import { colorOf, DAY_NAMES } from "@/lib/timetable-colors";

export type ClassSlot = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher: { first_name: string; last_name: string } | null;
};

/**
 * Same time-rows-by-day-columns grid the principal sees in the staff Timetable page
 * (src/app/(staff)/timetable/TimetableGrid.tsx, readOnly mode), but built from every slot
 * for the student's stream (across all subject teachers) rather than one teacher's slots —
 * and with no edit/delete/add affordances at all, since a parent can only ever view this.
 */
export default function ClassTimetableGrid({ slots }: { slots: ClassSlot[] }) {
  const timeRows = Array.from(new Set(slots.map((s) => `${s.start_time}|${s.end_time}`)))
    .map((k) => {
      const [start, end] = k.split("|");
      return { start, end };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  function slotsAt(day: number, start: string, end: string) {
    return slots.filter((s) => s.day_of_week === day && s.start_time === start && s.end_time === end);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="eduke-table-wrap">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-gray-50 border border-gray-100 p-2 text-xs font-semibold text-gray-600 text-left w-24">
                Time
              </th>
              {DAY_NAMES.map((d) => (
                <th
                  key={d}
                  className="bg-gray-50 border border-gray-100 p-2 text-xs font-semibold text-gray-600 min-w-[130px]"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-sm text-gray-400 py-10 border border-gray-100">
                  No timetable slots yet.
                </td>
              </tr>
            ) : (
              timeRows.map((row) => (
                <tr key={`${row.start}-${row.end}`}>
                  <td className="border border-gray-100 p-2 text-xs font-medium text-gray-600 align-top">
                    {row.start.slice(0, 5)} - {row.end.slice(0, 5)}
                  </td>
                  {DAY_NAMES.map((_, i) => {
                    const day = i + 1;
                    const daySlots = slotsAt(day, row.start, row.end);
                    return (
                      <td key={day} className="border border-gray-100 p-1.5 align-top">
                        {daySlots.length === 0 ? (
                          <div className="h-full min-h-[52px]" />
                        ) : (
                          <div className="space-y-1.5">
                            {daySlots.map((slot) => {
                              const c = colorOf(slot.color);
                              return (
                                <div
                                  key={slot.id}
                                  className="rounded-lg p-2 border"
                                  style={{ backgroundColor: c.bg, borderColor: c.border }}
                                >
                                  <p className="text-xs font-semibold" style={{ color: c.text }}>
                                    {slot.title}
                                  </p>
                                  {slot.description && (
                                    <p className="text-[11px] mt-0.5" style={{ color: c.text, opacity: 0.8 }}>
                                      {slot.description}
                                    </p>
                                  )}
                                  {slot.teacher && (
                                    <p className="text-[11px] mt-1" style={{ color: c.text, opacity: 0.7 }}>
                                      {slot.teacher.first_name} {slot.teacher.last_name}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}