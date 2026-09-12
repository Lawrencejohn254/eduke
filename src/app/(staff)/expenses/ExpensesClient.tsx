"use client";

import { useMemo, useState } from "react";
import { Wallet, Download, FileText, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { EmptyState } from "@/components/Loaders";
import StatCard from "@/components/StatCard";
import { formatKES, formatDateDMY } from "@/lib/format";
import RecordExpenseForm from "./RecordExpenseForm";
import { EXPENSE_CATEGORIES } from "./expense-categories";

type Expense = {
  id: string;
  category: string;
  custom_category: string | null;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string | null;
  reference: string | null;
  recorded_by_name: string | null;
};

function resolvedCategory(e: Expense) {
  return e.category === "Other" ? e.custom_category || "Other" : e.category;
}

export default function ExpensesClient({
  expenses,
  canRecord,
  recordedBy,
  schoolName,
}: {
  expenses: Expense[];
  canRecord: boolean;
  recordedBy: string | null;
  schoolName: string;
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  function toggleCategory(c: string) {
    setSelectedCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const filtered = useMemo(() => {
    if (selectedCategories.length === 0) return expenses;
    return expenses.filter((e) => selectedCategories.includes(e.category));
  }, [expenses, selectedCategories]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthTotal = filtered.filter((e) => e.expense_date >= monthStart).reduce((sum, e) => sum + e.amount, 0);
  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  function downloadExcel() {
    const rows = filtered.map((e) => ({
      Category: resolvedCategory(e),
      Description: e.description ?? "",
      "Amount (KES)": e.amount,
      "Payment Method": e.payment_method ?? "",
      Reference: e.reference ?? "",
      "Recorded By": e.recorded_by_name ?? "",
      Date: e.expense_date,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function downloadPDF() {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 14;
    const rowHeight = 7;

    doc.setFontSize(14);
    doc.text(schoolName || "Expenses Report", marginLeft, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    const subtitle =
      `Expenses Report - Generated ${new Date().toLocaleString()}` +
      (selectedCategories.length > 0 ? ` - Filtered by: ${selectedCategories.join(", ")}` : "");
    doc.text(subtitle, marginLeft, 22);

    const columns = [
      { label: "Category", width: 32 },
      { label: "Description", width: 38 },
      { label: "Date", width: 22 },
      { label: "Method", width: 22 },
      { label: "Reference", width: 28 },
      { label: "Recorded By", width: 30 },
      { label: "Amount", width: 20 },
    ];
    const tableWidth = columns.reduce((s, c) => s + c.width, 0);

    let y = 28;

    function drawHeader() {
      let x = marginLeft;
      doc.setFillColor(22, 101, 52);
      doc.rect(marginLeft, y - 5, tableWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);
      doc.setFontSize(9);
      for (const col of columns) {
        doc.text(col.label, x + 1, y);
        x += col.width;
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20);
      y += rowHeight;
    }

    drawHeader();

    for (const e of filtered) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
        drawHeader();
      }
      const values = [
        resolvedCategory(e),
        e.description ?? "-",
        formatDateDMY(e.expense_date),
        e.payment_method ?? "-",
        e.reference ?? "-",
        e.recorded_by_name ?? "-",
        e.amount.toLocaleString(),
      ];
      let x = marginLeft;
      values.forEach((val, i) => {
        const col = columns[i];
        const truncated = doc.splitTextToSize(String(val), col.width - 2)[0] || "";
        doc.text(truncated, x + 1, y);
        x += col.width;
      });
      y += rowHeight;
    }

    doc.setDrawColor(150);
    doc.line(marginLeft, y - 2, marginLeft + tableWidth, y - 2);
    y += 5;
    doc.setFont("helvetica", "bold");
    const totalsColStart = marginLeft + columns.slice(0, 6).reduce((s, c) => s + c.width, 0);
    doc.text("Total", totalsColStart, y);
    doc.text(filteredTotal.toLocaleString(), totalsColStart, y + 6);

    doc.save(`expenses-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500">School expenditure across all categories.</p>
        </div>
        <div className="flex items-center gap-2">
          {canRecord && <RecordExpenseForm recordedBy={recordedBy} />}
        </div>
      </div>

      {!canRecord && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          Only the Bursar can record expenses. You have view-only access here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Expenses This Month" value={formatKES(monthTotal)} icon={Wallet} />
        <StatCard label={selectedCategories.length > 0 ? "Filtered Total" : "Total Recorded"} value={formatKES(filteredTotal)} icon={Wallet} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
          >
            <Filter size={14} /> Filter by Category{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={downloadExcel} disabled={filtered.length === 0} className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50">
              <Download size={14} /> Excel (.xlsx)
            </button>
            <button onClick={downloadPDF} disabled={filtered.length === 0} className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50">
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-3">
            {EXPENSE_CATEGORIES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={selectedCategories.includes(c)} onChange={() => toggleCategory(c)} /> {c}
              </label>
            ))}
            {selectedCategories.length > 0 && (
              <button onClick={() => setSelectedCategories([])} className="text-sm text-red-500 underline">Clear</button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No expenses found" description="Try a different category filter, or record a new expense." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Method</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Recorded By</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-3 text-gray-900 font-medium">{resolvedCategory(e)}</td>
                  <td className="p-3 text-gray-600">{e.description ?? "-"}</td>
                  <td className="p-3 font-semibold text-gray-900">{formatKES(e.amount)}</td>
                  <td className="p-3 text-gray-600">{e.payment_method ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs font-mono">{e.reference ?? "-"}</td>
                  <td className="p-3 text-gray-600">{e.recorded_by_name ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">{formatDateDMY(e.expense_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}