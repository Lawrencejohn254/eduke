"use client";

import { useState } from "react";
import { WEEKDAY_NAMES } from "@/lib/parent/time";
import { LessonCard, visibleDays, type Lesson } from "./ClassTimetableGrid";

/** Phone layout: one day at a time, opening on today (or the next day that has lessons). */
export default function DayView({ lessons, today }: { lessons: Lesson[]; today: number }) {
  const days = visibleDays(lessons);
  const initial = days.includes(today) && lessons.some((l) => l.day === today) ? today : (days.find((d) => lessons.some((l) => l.day === d)) ?? days[0]);
  const [day, setDay] = useState(initial);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = days.indexOf(day);
    if (e.key === "ArrowRight") setDay(days[(i + 1) % days.length]);
    else if (e.key === "ArrowLeft") setDay(days[(i - 1 + days.length) % days.length]);
    else return;
    e.preventDefault();
  }

  const items = lessons.filter((l) => l.day === day);

  return (
    <div>
      <div role="tablist" aria-label="Day of the week" onKeyDown={onKeyDown} className="pp-scroll-x flex gap-1 border-b border-pp-rule px-3 py-2">
        {days.map((d) => (
          <button
            key={d}
            role="tab"
            id={`pp-day-${d}`}
            aria-selected={day === d}
            aria-controls="pp-day-panel"
            tabIndex={day === d ? 0 : -1}
            type="button"
            onClick={() => setDay(d)}
            className={`min-h-11 min-w-[3.25rem] flex-1 rounded-md px-2 text-[0.8125rem] font-medium ${day === d ? "bg-pp-green text-white" : "text-pp-ink hover:bg-pp-sunken"}`}
          >
            {WEEKDAY_NAMES[d - 1].slice(0, 3)}
            {d === today ? <span className="block text-[0.625rem] font-normal opacity-80">Today</span> : null}
          </button>
        ))}
      </div>
      <div id="pp-day-panel" role="tabpanel" aria-labelledby={`pp-day-${day}`} className="space-y-2 p-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-[0.875rem] text-pp-muted">No lessons on {WEEKDAY_NAMES[day - 1]}.</p>
        ) : (
          items.map((l) => <LessonCard key={l.id} lesson={l} showTime />)
        )}
      </div>
    </div>
  );
}
