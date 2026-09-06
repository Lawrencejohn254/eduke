"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, LogIn, ListChecks } from "lucide-react";
import { formatKES } from "@/lib/format";

type ActivityRow = {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  studentName: string | null;
  admissionNumber: string | null;
  className: string | null;
  subjectName: string | null;
};

type LoginRow = {
  id: string;
  user_name: string | null;
  user_role: string | null;
  logged_in_at: string;
  user_agent: string | null;
};

const ENTITY_FILTERS = [
  { value: "all", label: "All activity" },
  { value: "fee_payment", label: "Fee payments" },
  { value: "exam_result", label: "Marks entry" },
  { value: "timetable_slot", label: "Timetable" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function studentLabel(row: ActivityRow): string {
  if (!row.studentName) return "";
  return ` for ${row.studentName}${row.admissionNumber ? ` (${row.admissionNumber})` : ""}`;
}

function summarize(row: ActivityRow): string {
  const d = row.details as Record<string, unknown> | null;
  const before = (d?.before as Record<string, unknown>) ?? null;
  const after = (d?.after as Record<string, unknown>) ?? null;
  const suffix = studentLabel(row);

  if (row.action === "fee_payment.insert") {
    return `Recorded payment of ${formatKES(Number(d?.amount ?? 0))} via ${d?.payment_method ?? "-"}${suffix}`;
  }
  if (row.action === "fee_payment.update" && before && after) {
    if (Number(before.amount) !== Number(after.amount)) {
      return `Changed payment amount from ${formatKES(Number(before.amount))} to ${formatKES(Number(after.amount))}${suffix}`;
    }
    return `Updated a payment record${suffix}`;
  }
  if (row.action === "fee_payment.delete") {
    return `Deleted a payment of ${formatKES(Number(d?.amount ?? 0))}${suffix}`;
  }
  if (row.action === "exam_result.insert") {
    return `Entered marks: ${d?.marks_obtained ?? "-"}${row.subjectName ? ` in ${row.subjectName}` : ""}${suffix}`;
  }
  if (row.action === "exam_result.update" && before && after) {
    return `Changed marks from ${before.marks_obtained ?? "-"} to ${after.marks_obtained ?? "-"}${row.subjectName ? ` in ${row.subjectName}` : ""}${suffix}`;
  }
  if (row.action === "exam_result.delete") {
    return `Deleted a mark entry${row.subjectName ? ` in ${row.subjectName}` : ""}${suffix}`;
  }
  if (row.action === "timetable_slot.insert") {
    return `Created timetable slot: ${d?.title ?? "-"}`;
  }
  if (row.action === "timetable_slot.update" && before && after) {
    return `Updated timetable slot: ${(after.title as string) ?? (before.title as string) ?? "-"}`;
  }
  if (row.action === "timetable_slot.delete") {
    return `Deleted timetable slot: ${d?.title ?? "-"}`;
  }
  return row.action;
}

function DetailBlock({ row }: { row: ActivityRow }) {
  const d = row.details as Record<string, unknown> | null;
  const before = (d?.before as Record<string, unknown>) ?? null;
  const after = (d?.after as Record<string, unknown>) ?? null;
  const flat = before || after ? null : d;

  const hasStudent = row.studentName !== null;

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-2 space-y-2 text-xs">
      {hasStudent && (
        <div className="pb-2 border-b border-gray-200">
          <p className="font-semibold text-gray-700">Student</p>
          <p className="text-gray-600">
            {row.studentName} {row.admissionNumber ? `· ${row.admissionNumber}` : ""} {row.className ? `· ${row.className}` : ""}
          </p>
        </div>
      )}

      {row.entity_type === "fee_payment" && (
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{formatKES(Number((after?.amount ?? flat?.amount) as number ?? 0))}</span></div>
          <div><span className="text-gray-500">Method:</span> <span className="font-medium">{String((after?.payment_method ?? flat?.payment_method) ?? "-")}</span></div>
          <div><span className="text-gray-500">Category:</span> <span className="font-medium">{String((after?.fee_category ?? flat?.fee_category) ?? "-")}</span></div>
          <div><span className="text-gray-500">Receipt:</span> <span className="font-medium">{String((after?.receipt_number ?? flat?.receipt_number) ?? "-")}</span></div>
          {before && after && Number(before.amount) !== Number(after.amount) && (
            <div className="col-span-2 text-orange-600">Amount changed: {formatKES(Number(before.amount))} → {formatKES(Number(after.amount))}</div>
          )}
        </div>
      )}

      {row.entity_type === "exam_result" && (
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{row.subjectName ?? "-"}</span></div>
          <div><span className="text-gray-500">Marks:</span> <span className="font-medium">{String((after?.marks_obtained ?? flat?.marks_obtained) ?? "-")}</span></div>
          {before && after && before.marks_obtained !== after.marks_obtained && (
            <div className="col-span-2 text-orange-600">Marks changed: {String(before.marks_obtained ?? "-")} → {String(after.marks_obtained ?? "-")}</div>
          )}
        </div>
      )}

      {row.entity_type === "timetable_slot" && (
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Title:</span> <span className="font-medium">{String((after?.title ?? flat?.title) ?? "-")}</span></div>
          <div><span className="text-gray-500">Day:</span> <span className="font-medium">{String((after?.day_of_week ?? flat?.day_of_week) ?? "-")}</span></div>
          <div><span className="text-gray-500">Time:</span> <span className="font-medium">{String((after?.start_time ?? flat?.start_time) ?? "-")} - {String((after?.end_time ?? flat?.end_time) ?? "-")}</span></div>
        </div>
      )}

      <details className="pt-1">
        <summary className="text-gray-400 cursor-pointer">Raw data</summary>
        <pre className="mt-1 overflow-x-auto text-gray-500">{JSON.stringify(row.details, null, 2)}</pre>
      </details>
    </div>
  );
}

function ActivityRowItem({ row }: { row: ActivityRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-start justify-between text-left py-2.5 gap-3">
        <div className="min-w-0">
          <p className="text-sm text-gray-800">{summarize(row)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {row.actor_name ?? "Unknown"} <span className="capitalize">({row.actor_role?.replace("_", " ") ?? "-"})</span> · {formatDateTime(row.created_at)}
          </p>
        </div>
        {expanded ? <ChevronUp size={15} className="shrink-0 mt-0.5 text-gray-400" /> : <ChevronDown size={15} className="shrink-0 mt-0.5 text-gray-400" />}
      </button>
      {expanded && <DetailBlock row={row} />}
    </div>
  );
}

export default function AuditLogClient({ activity, logins }: { activity: ActivityRow[]; logins: LoginRow[] }) {
  const [tab, setTab] = useState<"activity" | "logins">("activity");
  const [filter, setFilter] = useState("all");

  const filteredActivity = useMemo(
    () => (filter === "all" ? activity : activity.filter((a) => a.entity_type === filter)),
    [activity, filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("activity")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "activity" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <ListChecks size={15} /> Activity
        </button>
        <button
          onClick={() => setTab("logins")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "logins" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <LogIn size={15} /> Login Sessions
        </button>
      </div>

      {tab === "activity" ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="mb-3">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {ENTITY_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {filteredActivity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No activity recorded yet.</p>
          ) : (
            <div>{filteredActivity.map((row) => <ActivityRowItem key={row.id} row={row} />)}</div>
          )}
        </div>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          {logins.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No login sessions recorded yet.</p>
          ) : (
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Device</th>
                </tr>
              </thead>
              <tbody>
                {logins.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">{l.user_name ?? "-"}</td>
                    <td className="p-3 text-gray-600 capitalize">{l.user_role?.replace("_", " ") ?? "-"}</td>
                    <td className="p-3 text-gray-500 text-xs">{formatDateTime(l.logged_in_at)}</td>
                    <td className="p-3 text-gray-400 text-xs max-w-xs truncate">{l.user_agent ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}