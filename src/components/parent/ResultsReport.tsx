import Link from "next/link";
import type { ReportView } from "@/lib/parent/results";
import { GradeBadge } from "./ui";

const fmt = (n: number) => String(Number(n.toFixed(1)));

/**
 * The report-card table. One column per exam (or per term in the Annual view) plus an average and grade.
 * A single-exam term collapses to the classic "Score  Grade" layout, e.g. "80 / 100".
 * On phones the same data is shown as a compact list so nothing scrolls sideways.
 */
export default function ResultsReport({ view, mode }: { view: ReportView; mode: "term" | "annual" }) {
  const single = mode === "term" && view.columns.length === 1;
  const col = view.columns[0];

  return (
    <>
      {/* Tablet & desktop */}
      <div className="pp-scroll-x hidden sm:block">
        <table className="w-full min-w-[32rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-pp-rule-strong text-[0.8125rem] text-pp-muted">
              <th scope="col" className="sticky left-0 bg-pp-surface px-5 py-2.5 font-medium">Subject</th>
              {single ? (
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Score</th>
              ) : (
                <>
                  {view.columns.map((c) => (
                    <th key={c.id} scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="block">{c.label}</span>
                      {c.sublabel ? <span className="block text-[0.6875rem] font-normal text-pp-faint">{c.sublabel}</span> : null}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Average</th>
                </>
              )}
              <th scope="col" className="px-5 py-2.5 text-right font-medium">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pp-rule">
            {view.subjects.map((s) => (
              <tr key={s.subjectId} className="align-top">
                <th scope="row" className="sticky left-0 bg-pp-surface px-5 py-3 text-[0.9375rem] font-medium">
                  {s.name}
                  {s.comment ? <span className="mt-0.5 block max-w-xs text-[0.8125rem] font-normal leading-snug text-pp-muted">{s.comment}</span> : null}
                </th>
                {single ? (
                  <td className="pp-num px-4 py-3 text-right text-[0.9375rem]">
                    {s.cells[col.id] ? (
                      <>
                        <span className="font-semibold">{fmt(s.cells[col.id]!.marks ?? 0)}</span>
                        <span className="text-pp-muted"> / {s.cells[col.id]!.outOf}</span>
                      </>
                    ) : (
                      <span className="text-pp-faint">–</span>
                    )}
                  </td>
                ) : (
                  <>
                    {view.columns.map((c) => {
                      const cell = s.cells[c.id];
                      return (
                        <td key={c.id} className="pp-num px-4 py-3 text-right text-[0.9375rem] text-pp-muted">
                          {cell ? (mode === "annual" ? `${Math.round(cell.pct)}%` : fmt(cell.marks ?? 0)) : <span className="text-pp-faint" aria-label="No score">–</span>}
                        </td>
                      );
                    })}
                    <td className="pp-num px-4 py-3 text-right text-[0.9375rem] font-semibold">{s.averagePct !== null ? `${s.averagePct}%` : "–"}</td>
                  </>
                )}
                <td className="px-5 py-3 text-right">
                  <GradeBadge grade={s.grade} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones */}
      <ul className="divide-y divide-pp-rule sm:hidden">
        {view.subjects.map((s) => {
          const breakdown = view.columns
            .map((c) => {
              const cell = s.cells[c.id];
              return cell ? `${c.label} ${mode === "annual" ? `${Math.round(cell.pct)}%` : fmt(cell.marks ?? 0)}` : null;
            })
            .filter(Boolean);
          return (
            <li key={s.subjectId} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 text-[0.9375rem] font-medium">{s.name}</span>
                <span className="pp-num text-[0.9375rem] font-semibold">
                  {single && s.cells[col.id] ? (
                    <>
                      {fmt(s.cells[col.id]!.marks ?? 0)}
                      <span className="font-normal text-pp-muted"> / {s.cells[col.id]!.outOf}</span>
                    </>
                  ) : s.averagePct !== null ? (
                    `${s.averagePct}%`
                  ) : (
                    "–"
                  )}
                </span>
                <GradeBadge grade={s.grade} />
              </div>
              {!single && breakdown.length > 1 ? <p className="pp-num mt-1 text-[0.8125rem] text-pp-muted">{breakdown.join(" · ")}</p> : null}
              {s.comment ? <p className="mt-1 text-[0.8125rem] leading-snug text-pp-muted">{s.comment}</p> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export type TermTab = { key: string; label: string; href: string | null; active: boolean };

/** Term / year switcher built from plain links, so it works without JavaScript and keeps the selected child. */
export function Tabs({ label, tabs }: { label: string; tabs: TermTab[] }) {
  return (
    <nav aria-label={label} className="pp-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-lg border border-pp-rule bg-pp-surface p-1">
        {tabs.map((t) => (
          <li key={t.key}>
            {t.href ? (
              <Link
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-md px-4 text-[0.875rem] font-medium ${
                  t.active ? "bg-pp-green text-white" : "text-pp-ink hover:bg-pp-sunken"
                }`}
              >
                {t.label}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                title="No published results"
                className="inline-flex min-h-10 cursor-not-allowed items-center whitespace-nowrap rounded-md px-4 text-[0.875rem] font-medium text-pp-faint"
              >
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
