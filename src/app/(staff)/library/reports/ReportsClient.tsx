"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import { displayBorrowingStatus, isBorrowingOverdue } from "@/lib/library";

type Book = {
  id: string;
  title: string;
  isbn: string | null;
  category: string | null;
  shelf_location: string | null;
  total_copies: number;
  available_copies: number;
  damaged_copies: number;
  lost_copies: number;
};

type Borrowing = {
  id: string;
  borrowed_date: string;
  due_date: string | null;
  returned_date: string | null;
  status: string;
  book_id: string;
  book: { title: string } | null;
  student: {
    first_name: string;
    last_name: string;
    admission_number: string;
    class: { name: string } | null;
  } | null;
};

const TABS = [
  { key: "inventory", label: "Book Inventory" },
  { key: "borrowings", label: "Borrowings" },
  { key: "returns", label: "Returns" },
  { key: "overdue", label: "Overdue Books" },
  { key: "lost-damaged", label: "Lost / Damaged" },
  { key: "popular", label: "Popular Books" },
  { key: "by-class", label: "By Class" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function toCsv(headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsClient({ books, borrowings }: { books: Book[]; borrowings: Borrowing[] }) {
  const [tab, setTab] = useState<TabKey>("inventory");

  const borrowedByBook = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of borrowings) {
      if (b.status === "Borrowed") map.set(b.book_id, (map.get(b.book_id) ?? 0) + 1);
    }
    return map;
  }, [borrowings]);

  const returns = useMemo(
    () => borrowings.filter((b) => b.status === "Returned").sort((a, b) => (a.returned_date ?? "") < (b.returned_date ?? "") ? 1 : -1),
    [borrowings]
  );
  const overdue = useMemo(
    () => borrowings.filter((b) => isBorrowingOverdue(b.status, b.due_date)).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)),
    [borrowings]
  );
  const lostDamaged = useMemo(() => borrowings.filter((b) => b.status === "Lost" || b.status === "Damaged"), [borrowings]);

  const popular = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const b of borrowings) {
      const existing = map.get(b.book_id);
      if (existing) existing.count += 1;
      else map.set(b.book_id, { title: b.book?.title ?? "-", count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 15);
  }, [borrowings]);

  const byClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of borrowings) {
      const className = b.student?.class?.name ?? "Unassigned";
      map.set(className, (map.get(className) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [borrowings]);

  function exportCurrent() {
    if (tab === "inventory") {
      downloadCsv(
        "book-inventory.csv",
        toCsv(
          ["Title", "ISBN", "Category", "Shelf", "Total", "Available", "Borrowed", "Damaged", "Lost"],
          books.map((b) => [b.title, b.isbn ?? "", b.category ?? "", b.shelf_location ?? "", b.total_copies, b.available_copies, borrowedByBook.get(b.id) ?? 0, b.damaged_copies, b.lost_copies])
        )
      );
    } else if (tab === "borrowings") {
      downloadCsv(
        "borrowings.csv",
        toCsv(
          ["Book", "Student", "Admission No.", "Class", "Borrowed", "Due", "Returned", "Status"],
          borrowings.map((b) => [
            b.book?.title ?? "",
            b.student ? `${b.student.first_name} ${b.student.last_name}` : "",
            b.student?.admission_number ?? "",
            b.student?.class?.name ?? "",
            formatDateDMY(b.borrowed_date),
            formatDateDMY(b.due_date),
            b.returned_date ? formatDateDMY(b.returned_date) : "",
            displayBorrowingStatus(b.status, b.due_date),
          ])
        )
      );
    } else if (tab === "returns") {
      downloadCsv(
        "returns.csv",
        toCsv(
          ["Book", "Student", "Borrowed", "Returned"],
          returns.map((b) => [b.book?.title ?? "", b.student ? `${b.student.first_name} ${b.student.last_name}` : "", formatDateDMY(b.borrowed_date), formatDateDMY(b.returned_date)])
        )
      );
    } else if (tab === "overdue") {
      downloadCsv(
        "overdue-books.csv",
        toCsv(
          ["Book", "Student", "Admission No.", "Due Date"],
          overdue.map((b) => [b.book?.title ?? "", b.student ? `${b.student.first_name} ${b.student.last_name}` : "", b.student?.admission_number ?? "", formatDateDMY(b.due_date)])
        )
      );
    } else if (tab === "lost-damaged") {
      downloadCsv(
        "lost-damaged-books.csv",
        toCsv(
          ["Book", "Student", "Status", "Date"],
          lostDamaged.map((b) => [b.book?.title ?? "", b.student ? `${b.student.first_name} ${b.student.last_name}` : "", b.status, b.returned_date ? formatDateDMY(b.returned_date) : ""])
        )
      );
    } else if (tab === "popular") {
      downloadCsv("popular-books.csv", toCsv(["Book", "Times Borrowed"], popular.map((p) => [p.title, p.count])));
    } else if (tab === "by-class") {
      downloadCsv("borrowing-by-class.csv", toCsv(["Class", "Times Borrowed"], byClass.map((c) => [c.name, c.count])));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={exportCurrent} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50 shrink-0">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {tab === "inventory" && (
        <ReportTable
          empty="No books in the catalogue yet."
          headers={["Title", "ISBN", "Category", "Shelf", "Total", "Available", "Borrowed", "Damaged", "Lost"]}
          rows={books.map((b) => [
            <span key="t" className="font-medium text-gray-900">{b.title}</span>,
            b.isbn ?? "-",
            b.category ?? "-",
            b.shelf_location ?? "-",
            b.total_copies,
            b.available_copies,
            borrowedByBook.get(b.id) ?? 0,
            b.damaged_copies,
            b.lost_copies,
          ])}
        />
      )}

      {tab === "borrowings" && (
        <ReportTable
          empty="No borrowing activity yet."
          headers={["Book", "Student", "Class", "Borrowed", "Due", "Status"]}
          rows={borrowings.map((b) => [
            <span key="t" className="font-medium text-gray-900">{b.book?.title ?? "-"}</span>,
            b.student ? `${b.student.first_name} ${b.student.last_name}` : "-",
            b.student?.class?.name ?? "-",
            formatDateDMY(b.borrowed_date),
            formatDateDMY(b.due_date),
            <StatusBadge key="s" status={displayBorrowingStatus(b.status, b.due_date)} />,
          ])}
        />
      )}

      {tab === "returns" && (
        <ReportTable
          empty="No returns on record."
          headers={["Book", "Student", "Borrowed", "Returned"]}
          rows={returns.map((b) => [
            <span key="t" className="font-medium text-gray-900">{b.book?.title ?? "-"}</span>,
            b.student ? `${b.student.first_name} ${b.student.last_name}` : "-",
            formatDateDMY(b.borrowed_date),
            formatDateDMY(b.returned_date),
          ])}
        />
      )}

      {tab === "overdue" && (
        <ReportTable
          empty="No overdue books. 🎉"
          headers={["Book", "Student", "Admission No.", "Due Date"]}
          rows={overdue.map((b) => [
            <span key="t" className="font-medium text-gray-900">{b.book?.title ?? "-"}</span>,
            b.student ? `${b.student.first_name} ${b.student.last_name}` : "-",
            b.student?.admission_number ?? "-",
            formatDateDMY(b.due_date),
          ])}
        />
      )}

      {tab === "lost-damaged" && (
        <ReportTable
          empty="No lost or damaged books on record."
          headers={["Book", "Student", "Status", "Date"]}
          rows={lostDamaged.map((b) => [
            <span key="t" className="font-medium text-gray-900">{b.book?.title ?? "-"}</span>,
            b.student ? `${b.student.first_name} ${b.student.last_name}` : "-",
            <StatusBadge key="s" status={b.status} />,
            b.returned_date ? formatDateDMY(b.returned_date) : "-",
          ])}
        />
      )}

      {tab === "popular" && (
        <ReportTable
          empty="No borrowing activity yet."
          headers={["Book", "Times Borrowed"]}
          rows={popular.map((p) => [<span key="t" className="font-medium text-gray-900">{p.title}</span>, p.count])}
        />
      )}

      {tab === "by-class" && (
        <ReportTable
          empty="No borrowing activity yet."
          headers={["Class", "Times Borrowed"]}
          rows={byClass.map((c) => [<span key="t" className="font-medium text-gray-900">{c.name}</span>, c.count])}
        />
      )}
    </div>
  );
}

function ReportTable({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">{empty}</p>;
  }
  return (
    <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
      <table>
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            {headers.map((h) => <th key={h} className="p-3">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50">
              {row.map((cell, j) => <td key={j} className="p-3 text-gray-600 text-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}