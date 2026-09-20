"use client";

import { useState } from "react";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { formatKSh } from "@/lib/parent/money";
import { printHtmlDocument, downloadHtmlAsPdf, buildFeeStructureTableHtml } from "@/lib/print";

type BreakdownRow = { category: string; amount: number; mandatory: boolean; description: string | null };

export default function FeeStructureCard({ className, termLabel, rows }: { className: string; termLabel: string; rows: BreakdownRow[] }) {
  const [downloading, setDownloading] = useState(false);

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.amount, 0);

  // Print / PDF output is unchanged — it still uses the school's official fee-structure template.
  function html() {
    return buildFeeStructureTableHtml({
      className,
      termLabel,
      rows: rows.map((r) => ({ category: r.category, amount: r.amount, mandatory: r.mandatory, description: r.description })),
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadHtmlAsPdf(`fee-structure-${className.replace(/\s+/g, "-").toLowerCase()}.pdf`, html());
    } finally {
      setDownloading(false);
    }
  }

  const actionClass = "inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-pp-green hover:bg-pp-green-tint disabled:opacity-50";

  return (
    <section className="rounded-lg border border-pp-rule bg-pp-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-pp-rule px-4 py-2.5 sm:px-5">
        <div>
          <h2 className="text-[0.9375rem] font-semibold">Fee structure</h2>
          <p className="text-[0.8125rem] text-pp-muted">
            {termLabel}
            {className ? ` · ${className}` : ""}
          </p>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => printHtmlDocument(`Fee Structure - ${className} - ${termLabel}`, html())} className={actionClass}>
            <Printer size={15} aria-hidden /> Print
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className={actionClass}>
            {downloading ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Download size={15} aria-hidden />} PDF
          </button>
        </div>
      </header>

      <table className="w-full border-collapse">
        <caption className="sr-only">Fee structure for {termLabel}</caption>
        <tbody className="divide-y divide-pp-rule">
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row" className="px-4 py-3 text-left text-[0.9375rem] font-normal sm:px-5">
                {r.category}
                {!r.mandatory ? <span className="ml-2 rounded bg-pp-sunken px-1.5 py-0.5 text-[0.6875rem] font-medium text-pp-muted">Optional</span> : null}
                {r.description ? <span className="mt-0.5 block text-[0.8125rem] text-pp-muted">{r.description}</span> : null}
              </th>
              <td className="pp-num whitespace-nowrap px-4 py-3 text-right text-[0.9375rem] sm:px-5">{formatKSh(r.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-pp-rule-strong bg-pp-sunken/60">
            <th scope="row" className="px-4 py-3 text-left text-[0.9375rem] font-semibold sm:px-5">Term total</th>
            <td className="pp-num whitespace-nowrap px-4 py-3 text-right text-[0.9375rem] font-semibold sm:px-5">{formatKSh(total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
