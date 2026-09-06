"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/Loaders";

type StreamRow = { id: string; name: string; class: { id: string; name: string } | null };
type Student = { id: string; first_name: string; last_name: string; admission_number: string };
type AttStatus = "Present" | "Absent" | "Late" | "Excused";

export default function AttendanceClient({ streams, staffId }: { streams: StreamRow[]; staffId: string | null }) {
  const [streamId, setStreamId] = useState(streams[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [notifyAbsentees, setNotifyAbsentees] = useState(true);

  const loadStudents = useCallback(async () => {
    if (!streamId) return;
    setLoading(true);
    setSaved(null);
    const supabase = createClient();
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, first_name, last_name, admission_number")
      .eq("stream_id", streamId)
      .eq("status", "Active")
      .order("first_name");

    const { data: existing } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("date", date)
      .in("student_id", (studentRows ?? []).map((s) => s.id));

    const initial: Record<string, AttStatus> = {};
    for (const s of studentRows ?? []) initial[s.id] = "Present";
    for (const e of existing ?? []) initial[e.student_id] = e.status as AttStatus;

    setStudents(studentRows ?? []);
    setStatuses(initial);
    setLoading(false);
  }, [streamId, date]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  function setStatus(studentId: string, status: AttStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    setStatuses((prev) => {
      const next = { ...prev };
      for (const s of students) next[s.id] = "Present";
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(null);
    const supabase = createClient();
    const rows = students.map((s) => ({
      student_id: s.id,
      date,
      status: statuses[s.id] ?? "Present",
      recorded_by: staffId,
    }));
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });

    if (!error && notifyAbsentees) {
      const absentIds = students.filter((s) => statuses[s.id] === "Absent").map((s) => s.id);
      if (absentIds.length > 0) {
        await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: absentIds, reason: "absent", date }),
        });
      }
    }

    setSaving(false);
    setSaved(error ? `Error: ${error.message}` : "Attendance saved.");
  }

  const absentCount = Object.values(statuses).filter((s) => s === "Absent").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Attendance (Mahudhurio)</h1>
        <p className="text-sm text-gray-500">Mark daily attendance for your stream.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm font-medium text-gray-700">Stream</label>
          <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {streams.length === 0 && <option value="">No streams assigned</option>}
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={markAllPresent} className="text-sm font-medium text-eduke-green border border-eduke-green rounded-lg px-3 py-2 hover:bg-eduke-green/5">
          Mark All Present
        </button>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 ml-auto">
          <input type="checkbox" checked={notifyAbsentees} onChange={(e) => setNotifyAbsentees(e.target.checked)} />
          SMS parents of absentees
        </label>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Loading students…</div>
      ) : students.length === 0 ? (
        <EmptyState title="No students in this stream" description="Add students to this stream to begin taking attendance." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Student</th>
                <th className="p-3">Admission No.</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                  <td className="p-3 text-gray-500 text-xs">{s.admission_number}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {(["Present", "Absent", "Late", "Excused"] as AttStatus[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatus(s.id, st)}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                            statuses[s.id] === st
                              ? st === "Present" ? "bg-green-600 text-white border-green-600"
                              : st === "Absent" ? "bg-red-600 text-white border-red-600"
                              : st === "Late" ? "bg-orange-500 text-white border-orange-500"
                              : "bg-gray-500 text-white border-gray-500"
                              : "bg-white border-gray-300 text-gray-600"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Attendance
          </button>
          {absentCount > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <MessageSquare size={14} /> {absentCount} absentee(s) {notifyAbsentees ? "will be SMS'd" : ""}
            </span>
          )}
          {saved && <span className="text-sm text-eduke-green font-medium">{saved}</span>}
        </div>
      )}
    </div>
  );
}
