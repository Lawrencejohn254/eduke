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
      <div className="eduke-table-wrap">
        <table>
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="p-2">Category</th>
              <th className="p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="p-2 text-gray-700">{r.category}{!r.mandatory ? " (optional)" : ""}</td>
                <td className="p-2 font-medium">{formatKES(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="p-2 font-semibold text-gray-900">TOTAL</td>
              <td className="p-2 font-semibold text-gray-900">{formatKES(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}