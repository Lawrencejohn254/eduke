import { colorOf } from "@/lib/timetable-colors";
import { formatClock, WEEKDAY_NAMES } from "@/lib/parent/time";
import type { Lesson } from "@/lib/parent/queries";

export type { Lesson };

/** Mon–Fri always; Saturday / Sunday only when the class actually has lessons then. */
export function visibleDays(lessons: Lesson[]): number[] {
  const days = [1, 2, 3, 4, 5];
  if (lessons.some((l) => l.day === 6)) days.push(6);
  if (lessons.some((l) => l.day === 7)) days.push(7);
  return days;
}

export function LessonCard({ lesson, showTime = false, dim = false }: { lesson: Lesson; showTime?: boolean; dim?: boolean }) {
  const c = colorOf(lesson.color);
  return (
    <div className={`rounded-md border-l-4 px-2.5 py-2 ${dim ? "opacity-60" : ""}`} style={{ backgroundColor: c.bg, borderLeftColor: c.border, color: c.text }}>
      {showTime ? (
        <p className="pp-num text-[0.75rem] font-medium opacity-80">
          {formatClock(lesson.start)} – {formatClock(lesson.end)}
        </p>
      ) : null}
      <p className="text-[0.875rem] leading-tight font-semibold">{lesson.title}</p>
      {lesson.description ? <p className="mt-0.5 text-[0.75rem] leading-snug opacity-85">{lesson.description}</p> : null}
      {lesson.teacher || lesson.room ? (
        <p className="mt-1 text-[0.75rem] leading-snug opacity-80">{[lesson.teacher, lesson.room].filter(Boolean).join(" · ")}</p>
      ) : null}
    </div>
  );
}

/**
 * The class's fixed weekly schedule: time rows by day columns. It's built from every slot for the child's
 * stream (across all subject teachers) and is strictly read-only. Shown from tablet width up;
 * phones get the day-by-day view instead.
 */
export default function ClassTimetableGrid({ lessons, today }: { lessons: Lesson[]; today: number }) {
  const days = visibleDays(lessons);
  const rows = Array.from(new Set(lessons.map((l) => `${l.start}|${l.end}`)))
    .map((k) => {
      const [start, end] = k.split("|");
      return { start, end };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="pp-scroll-x">
      <table className="w-full min-w-[46rem] table-fixed border-collapse">
        <caption className="sr-only">Weekly class timetable</caption>
        <thead>
          <tr className="border-b border-pp-rule-strong">
            <th scope="col" className="sticky left-0 w-28 bg-pp-surface px-4 py-3 text-left text-[0.8125rem] font-medium text-pp-muted">Time</th>
            {days.map((d) => (
              <th key={d} scope="col" className={`px-2 py-3 text-left text-[0.8125rem] font-semibold ${d === today ? "bg-pp-green-tint text-pp-green" : "text-pp-ink"}`}>
                {WEEKDAY_NAMES[d - 1]}
                {d === today ? <span className="ml-1.5 text-[0.6875rem] font-medium">Today</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-pp-rule">
          {rows.map((row) => (
            <tr key={`${row.start}-${row.end}`} className="align-top">
              <th scope="row" className="sticky left-0 bg-pp-surface px-4 py-2.5 text-left">
                <span className="pp-num block text-[0.8125rem] font-medium">{formatClock(row.start)}</span>
                <span className="pp-num block text-[0.75rem] font-normal text-pp-muted">{formatClock(row.end)}</span>
              </th>
              {days.map((d) => {
                const here = lessons.filter((l) => l.day === d && l.start === row.start && l.end === row.end);
                return (
                  <td key={d} className={`p-1.5 ${d === today ? "bg-pp-green-tint/30" : ""}`}>
                    <div className="space-y-1.5">
                      {here.map((l) => (
                        <LessonCard key={l.id} lesson={l} />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
