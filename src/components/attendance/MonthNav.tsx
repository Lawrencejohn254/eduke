"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES } from "@/lib/calendar";

export default function MonthNav({
  year,
  month, // 0-11
  earliestYear,
}: {
  year: number;
  month: number;
  earliestYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  function go(targetYear: number, targetMonth: number) {
    // Roll over into the adjacent year when stepping past Jan/Dec.
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
    params.set("month", String(m + 1)); // stored 1-based in the URL, matching how people think of months
    router.push(`${pathname}?${params.toString()}`);
  }

  const atCurrentMonth = year === currentYear && month === currentMonth;
  const years = [];
  for (let y = currentYear; y >= earliestYear; y--) years.push(y);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => go(year, month - 1)}
        className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>

      <select
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm bg-white"
      >
        {MONTH_NAMES.map((name, idx) => (
          <option key={name} value={idx}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm bg-white"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <button
        onClick={() => go(year, month + 1)}
        disabled={atCurrentMonth}
        className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>

      {!atCurrentMonth && (
        <button
          onClick={() => go(currentYear, currentMonth)}
          className="text-xs text-eduke-green font-medium hover:underline ml-1"
        >
          Today
        </button>
      )}
    </div>
  );
}