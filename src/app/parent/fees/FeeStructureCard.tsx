"use client";

import { useState } from "react";
import { Download, Printer, Loader2 } from "lucide-react";
import { formatKES } from "@/lib/format";
import { printHtmlDocument, downloadHtmlAsPdf, buildFeeStructureTableHtml } from "@/lib/print";

type BreakdownRow = { category: string; amount: number; mandatory: boolean; description: string | null };

export default function FeeStructureCard({
  className,
  termLabel,
  rows,
}: {
  className: string;
  termLabel: string;
  rows: BreakdownRow[];
}) {
  const [downloading, setDownloading] = useState(false);

  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.amount, 0);

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

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-700">Fee Structure — {termLabel}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => printHtmlDocument(`Fee Structure - ${className} - ${termLabel}`, html())}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-eduke-green hover:underline"
          >
            <Printer size={13} /> Print
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline disabled:opacity-50"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
          </button>
        </div>
      </div>

      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide p-3">
                Category
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide p-3">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={`border-b border-gray-100 last:border-b-0 ${
                  i % 2 === 1 ? "bg-gray-50" : ""
                }`}
              >
                <td className="p-3 text-sm text-gray-700">
                  {r.category}
                  {!r.mandatory && (
                    <span className="ml-1.5 text-[10px] font-medium text-gray-400 uppercase">
                      Optional
                    </span>
                  )}
                  {r.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>
                  )}
                </td>
                <td className="p-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                  {formatKES(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="p-3 text-sm font-bold text-gray-900">TOTAL</td>
              <td className="p-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                {formatKES(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}