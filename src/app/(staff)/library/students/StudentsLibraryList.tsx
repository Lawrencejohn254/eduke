"use client";

import { useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class: { name: string } | null;
  currentlyBorrowed: number;
  hasOverdue: boolean;
};

export default function StudentsLibraryList({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const filtered = query
    ? rows.filter((r) => `${r.first_name} ${r.last_name} ${r.admission_number}`.toLowerCase().includes(query.toLowerCase()))
    : rows;

  return (
    <div className="space-y-3">
      <input
        placeholder="Search by name or admission number…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No students found.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Name</th>
                <th className="p-3">Admission No.</th>
                <th className="p-3">Class</th>
                <th className="p-3">Currently Borrowed</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">
                    <Link href={`/library/students/${r.id}`} className="text-eduke-green hover:underline">
                      {r.first_name} {r.last_name}
                    </Link>
                  </td>
                  <td className="p-3 text-gray-600">{r.admission_number}</td>
                  <td className="p-3 text-gray-600">{r.class?.name ?? "-"}</td>
                  <td className="p-3">
                    <span className={r.hasOverdue ? "text-red-600 font-semibold" : "text-gray-700"}>
                      {r.currentlyBorrowed}{r.hasOverdue ? " (overdue)" : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}