"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "@/lib/calendar";

/**
 * Month/year stepper for the attendance calendar. "Now" is passed in from the server (school timezone)
 * instead of read from the browser clock, so the "current month" limit matches what the school sees.
 * The URL keeps months 1-based, exactly as before.
 */
export default function MonthPicker({ year, month, earliestYear, currentYear, currentMonth }: { year: number; month: number; earliestYear: number; currentYear: number; currentMonth: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(targetYear: number, targetMonth: number) {
    let y = targetYear;
    let m = targetMonth;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(y));
    params.set("month", String(m + 1));
    router.push(`${pathname}?${params.toString()}`);
  }

  const atCurrent = year === currentYear && month === currentMonth;
  const atEarliest = year <= earliestYear && month === 0;
  const years: number[] = [];
  for (let y = currentYear; y >= earliestYear; y--) years.push(y);

  const selectClass = "min-h-11 rounded-md border border-pp-rule-strong bg-pp-surface px-3 text-[0.875rem] text-pp-ink";
  const stepClass = "inline-flex h-11 w-11 items-center justify-center rounded-md border border-pp-rule-strong bg-pp-surface text-pp-ink hover:bg-pp-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-pp-surface";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => go(year, month - 1)} disabled={atEarliest} className={stepClass} aria-label="Previous month">
        <ChevronLeft size={18} aria-hidden />
      </button>
      <label className="sr-only" htmlFor="pp-month">Month</label>
      <select id="pp-month" value={month} onChange={(e) => go(year, Number(e.target.value))} className={selectClass}>
        {MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx}>{name}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="pp-year">Year</label>
      <select id="pp-year" value={year} onChange={(e) => go(Number(e.target.value), month)} className={selectClass}>
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button type="button" onClick={() => go(year, month + 1)} disabled={atCurrent} className={stepClass} aria-label="Next month">
        <ChevronRight size={18} aria-hidden />
      </button>
      {!atCurrent ? (
        <button type="button" onClick={() => go(currentYear, currentMonth)} className="min-h-11 rounded-md px-2 text-[0.875rem] font-medium text-pp-green hover:underline">
          This month
        </button>
      ) : null}
    </div>
  );
}
