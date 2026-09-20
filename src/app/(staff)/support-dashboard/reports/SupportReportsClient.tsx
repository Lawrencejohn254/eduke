"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type Attendance = { attendance_date: string; sign_in_at: string | null; sign_out_at: string | null; status: string; minutes_late: number };
type Task = { title: string; priority: string; status: string; due_date: string | null; completed_at: string | null };

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

export default function SupportReportsClient({ attendance, tasks }: { attendance: Attendance[]; tasks: Task[] }) {
  const [tab, setTab] = useState<"attendance" | "tasks">("attendance");

  const daysPresent = attendance.filter((a) => a.sign_in_at).length;
  const daysLate = attendance.filter((a) => a.minutes_late > 0).length;
  const tasksCompleted = tasks.filter((t) => t.status === "Completed").length;
  const tasksOpen = tasks.filter((t) => t.status !== "Completed").length;

  function exportCurrent() {
    if (tab === "attendance") {
      downloadCsv(
        "my-attendance.csv",
        toCsv(
          ["Date", "Sign In", "Sign Out", "Status", "Minutes Late"],
          attendance.map((a) => [
            formatDateDMY(a.attendance_date),
            a.sign_in_at ? new Date(a.sign_in_at).toLocaleTimeString() : "",
            a.sign_out_at ? new Date(a.sign_out_at).toLocaleTimeString() : "",
            a.status,
            a.minutes_late,
          ])
        )
      );
    } else {
      downloadCsv(
        "my-tasks.csv",
        toCsv(
          ["Title", "Priority", "Status", "Due Date", "Completed"],
          tasks.map((t) => [t.title, t.priority, t.status, t.due_date ? formatDateDMY(t.due_date) : "", t.completed_at ? formatDateDMY(t.completed_at) : ""])
        )
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat label="Days Present (last 90)" value={daysPresent} />
        <SummaryStat label="Days Late" value={daysLate} />
        <SummaryStat label="Tasks Completed" value={tasksCompleted} />
        <SummaryStat label="Tasks Open" value={tasksOpen} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          <button onClick={() => setTab("attendance")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "attendance" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Attendance
          </button>
          <button onClick={() => setTab("tasks")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "tasks" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Tasks
          </button>
        </div>
        <button onClick={exportCurrent} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-50">
          <Download size={13} /> Export CSV
        </button>
      </div>

      {tab === "attendance" ? (
        attendance.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No attendance recorded yet.</p>
        ) : (
          <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Minutes Late</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="p-3 text-gray-700">{formatDateDMY(a.attendance_date)}</td>
                    <td className="p-3 text-gray-600 capitalize">{a.status}</td>
                    <td className="p-3 text-gray-600">{a.minutes_late || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No tasks assigned yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Title</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Status</th>
                <th className="p-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{t.title}</td>
                  <td className="p-3 text-gray-600">{t.priority}</td>
                  <td className="p-3 text-gray-600">{t.status}</td>
                  <td className="p-3 text-gray-500 text-xs">{t.due_date ? formatDateDMY(t.due_date) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}