"use client";

import { useMemo, useState } from "react";
import { Award, X, Loader2, History, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/Loaders";

type ClassRow = { id: string; name: string };
type StreamRow = { id: string; name: string; class_id: string; class_teacher_id: string | null };
type Term = { id: string; term_number: string; is_current: boolean };
type AcademicYear = { id: string; year: number; terms: Term[] };
type Teacher = { staffId: string; name: string; role: string };
type Assignment = {
  id: string;
  stream_id: string;
  class_id: string;
  teacher_id: string;
  academic_year_id: string;
  term_id: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "ended" | "cancelled";
  teacherName: string;
  termLabel: string;
};

export default function ClassTeachersClient({
  canManage,
  classes,
  streams,
  academicYears,
  teachers,
  currentTermId,
  currentAcademicYearId,
  assignments,
}: {
  canManage: boolean;
  classes: ClassRow[];
  streams: StreamRow[];
  academicYears: AcademicYear[];
  teachers: Teacher[];
  currentTermId: string;
  currentAcademicYearId: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [modalStreamId, setModalStreamId] = useState<string | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  // Current-term active assignment, keyed by stream — this is what the table shows.
  const activeByStream = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) {
      if (a.status === "active" && a.term_id === currentTermId) {
        map.set(a.stream_id, a);
      }
    }
    return map;
  }, [assignments, currentTermId]);

  const historyByStream = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const list = map.get(a.stream_id) ?? [];
      list.push(a);
      map.set(a.stream_id, list);
    }
    return map;
  }, [assignments]);

  const rows = streams
    .map((s) => ({ stream: s, cls: classById.get(s.class_id) }))
    .filter((r): r is { stream: StreamRow; cls: ClassRow } => !!r.cls)
    .sort((a, b) => (a.cls.name + a.stream.name).localeCompare(b.cls.name + b.stream.name));

  const modalStream = modalStreamId ? streams.find((s) => s.id === modalStreamId) ?? null : null;

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setModalStreamId(streams[0]?.id ?? null)}
            disabled={streams.length === 0}
            className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
          >
            <Award size={15} /> Assign Class Teacher
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No streams found"
          description="Create classes and streams in Settings → Academic Setup before assigning class teachers."
        />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Stream</th>
                <th className="px-4 py-3">Class Teacher</th>
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(({ stream, cls }) => {
                const active = activeByStream.get(stream.id);
                const history = historyByStream.get(stream.id) ?? [];
                return (
                  <tr key={stream.id} className="text-sm">
                    <td className="px-4 py-3 font-medium text-gray-900">{cls.name}</td>
                    <td className="px-4 py-3 text-gray-700">{stream.name}</td>
                    <td className="px-4 py-3 text-gray-700">{active ? active.teacherName : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{active ? active.termLabel : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${active ? "badge-green" : "badge-grey"}`}>
                        {active ? "Active" : "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-3">
                        {history.length > 0 && (
                          <button
                            onClick={() => setShowHistoryFor(stream.id)}
                            className="text-xs font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                          >
                            <History size={13} /> History
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => setModalStreamId(stream.id)}
                            className="text-xs font-semibold text-eduke-green hover:underline"
                          >
                            {active ? "Manage" : "Assign"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalStream && (
        <AssignModal
          stream={modalStream}
          className={classById.get(modalStream.class_id)?.name ?? ""}
          streams={streams}
          classes={classes}
          academicYears={academicYears}
          teachers={teachers}
          currentTermId={currentTermId}
          currentAcademicYearId={currentAcademicYearId}
          activeAssignment={activeByStream.get(modalStream.id) ?? null}
          onClose={() => setModalStreamId(null)}
          onChangeStream={(id) => setModalStreamId(id)}
          onDone={() => {
            setModalStreamId(null);
            router.refresh();
          }}
        />
      )}

      {showHistoryFor && (
        <HistoryModal
          streamLabel={(() => {
            const s = streams.find((st) => st.id === showHistoryFor);
            const c = s ? classById.get(s.class_id) : null;
            return s ? `${c?.name ?? ""} ${s.name}` : "";
          })()}
          history={historyByStream.get(showHistoryFor) ?? []}
          onClose={() => setShowHistoryFor(null)}
        />
      )}
    </div>
  );
}

function AssignModal({
  stream,
  className,
  streams,
  classes,
  academicYears,
  teachers,
  currentTermId,
  currentAcademicYearId,
  activeAssignment,
  onClose,
  onChangeStream,
  onDone,
}: {
  stream: StreamRow;
  className: string;
  streams: StreamRow[];
  classes: ClassRow[];
  academicYears: AcademicYear[];
  teachers: Teacher[];
  currentTermId: string;
  currentAcademicYearId: string;
  activeAssignment: Assignment | null;
  onClose: () => void;
  onChangeStream: (streamId: string) => void;
  onDone: () => void;
}) {
  const [classId, setClassId] = useState(stream.class_id);
  const [academicYearId, setAcademicYearId] = useState(currentAcademicYearId);
  const [termId, setTermId] = useState(currentTermId);
  const [teacherId, setTeacherId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedYear = academicYears.find((y) => y.id === academicYearId);
  const streamsForClass = streams.filter((s) => s.class_id === classId);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!teacherId) {
      setError("Select a teacher.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("assign_class_teacher", {
        p_stream_id: stream.id,
        p_teacher_id: teacherId,
        p_academic_year_id: academicYearId,
        p_term_id: termId,
        p_start_date: startDate,
      });
      if (rpcError) throw rpcError;
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to assign class teacher.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!activeAssignment) return;
    const confirmed = window.confirm(
      `End ${activeAssignment.teacherName}'s class teacher assignment for ${className} ${stream.name}?`
    );
    if (!confirmed) return;
    setEnding(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("end_class_teacher_assignment", {
        p_assignment_id: activeAssignment.id,
      });
      if (rpcError) throw rpcError;
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to end assignment.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">
              {activeAssignment ? "Manage Class Teacher" : "Assign Class Teacher"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">{className} {stream.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {activeAssignment && (
            <div className="bg-eduke-green/5 border border-eduke-green/20 rounded-lg p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">Current Class Teacher</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{activeAssignment.teacherName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{activeAssignment.termLabel} · since {activeAssignment.start_date}</p>
              </div>
              <button
                onClick={handleEnd}
                disabled={ending}
                className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 shrink-0"
              >
                {ending ? "Ending..." : "End Assignment"}
              </button>
            </div>
          )}

          <form onSubmit={handleAssign} className="space-y-4">
            <p className="text-sm font-semibold text-gray-900">
              {activeAssignment ? "Change Teacher" : "Assign Teacher"}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Class</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setClassId(newClassId);
                    const first = streams.find((s) => s.class_id === newClassId);
                    if (first) onChangeStream(first.id);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Stream</label>
                <select
                  value={stream.id}
                  onChange={(e) => onChangeStream(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {streamsForClass.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Teacher</label>
              <select
                required
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select teacher...</option>
                {teachers.map((t) => (
                  <option key={t.staffId} value={t.staffId}>
                    {t.name} {t.role === "hod" ? "(HOD)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Academic Year</label>
                <select
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    const y = academicYears.find((ay) => ay.id === e.target.value);
                    const current = y?.terms.find((t) => t.is_current) ?? y?.terms[0];
                    if (current) setTermId(current.id);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Term</label>
                <select
                  value={termId}
                  onChange={(e) => setTermId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  {(selectedYear?.terms ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.term_number}{t.is_current ? " (current)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {activeAssignment ? "Change Teacher" : "Assign"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  streamLabel,
  history,
  onClose,
}: {
  streamLabel: string;
  history: Assignment[];
  onClose: () => void;
}) {
  const sorted = [...history].sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">Assignment History</h2>
            <p className="text-xs text-gray-500 mt-1">{streamLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {sorted.map((a) => (
            <div key={a.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{a.teacherName}</p>
                {a.status === "active" && (
                  <span className="badge badge-green inline-flex items-center gap-1">
                    <CheckCircle2 size={11} /> Active
                  </span>
                )}
                {a.status === "ended" && <span className="badge badge-grey">Ended</span>}
                {a.status === "cancelled" && <span className="badge badge-red">Cancelled</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1">{a.termLabel}</p>
              <p className="text-xs text-gray-500">
                {a.start_date} — {a.end_date ?? "present"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
