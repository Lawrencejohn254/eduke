"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { gradeFromMarks } from "@/lib/format";
import { Loader2, Save } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Student = { id: string; first_name: string; last_name: string; admission_number: string };
type Subject = { id: string; name: string };

export default function MarkEntryClient({
  examId,
  examName,
  className,
  curriculumType,
  outOf,
  subjects,
  students,
  staffId,
}: {
  examId: string;
  examName: string;
  className: string;
  curriculumType?: "CBC" | "8-4-4";
  outOf: number;
  subjects: Subject[];
  students: Student[];
  staffId: string | null;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [shaking, setShaking] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const loadExisting = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("exam_results")
      .select("student_id, marks_obtained")
      .eq("exam_id", examId)
      .eq("subject_id", subjectId);

    const initial: Record<string, string> = {};
    for (const r of data ?? []) {
      if (r.marks_obtained !== null) initial[r.student_id] = String(r.marks_obtained);
    }
    setMarks(initial);
    setLoading(false);
  }, [examId, subjectId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  // Blocks any mark outside [0, outOf] from ever entering state — the input
  // is controlled, so an out-of-range keystroke simply never renders, and we
  // flash the box red + shake it so the block is obvious rather than silent.
  function handleMarkChange(studentId: string, rawValue: string) {
    if (rawValue === "") {
      setMarks((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }

    const numeric = Number(rawValue);
    if (Number.isNaN(numeric)) return;

    if (numeric > outOf || numeric < 0) {
      setShaking((prev) => ({ ...prev, [studentId]: true }));
      window.setTimeout(() => {
        setShaking((prev) => ({ ...prev, [studentId]: false }));
      }, 450);
      return;
    }

    setMarks((prev) => ({ ...prev, [studentId]: rawValue }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(null);
    const supabase = createClient();
    const rows = students
      .filter((s) => marks[s.id] !== undefined && marks[s.id] !== "")
      .map((s) => ({
        student_id: s.id,
        exam_id: examId,
        subject_id: subjectId,
        marks_obtained: Number(marks[s.id]),
        entered_by: staffId,
      }));

    if (rows.length === 0) {
      setSaving(false);
      setSaved("Enter at least one mark before saving.");
      return;
    }

    const { error } = await supabase.from("exam_results").upsert(rows, { onConflict: "student_id,exam_id,subject_id" });
    setSaving(false);
    setSaved(error ? `Error: ${error.message}` : `Saved marks for ${rows.length} student(s).`);
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes eduke-mark-shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        .eduke-mark-shake {
          animation: eduke-mark-shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      <Link href="/exams" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ArrowLeft size={14} /> Back to Exams
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mark Entry — {examName}</h1>
        <p className="text-sm text-gray-500">{className} · Out of {outOf}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="text-sm font-medium text-gray-700">Subject</label>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-1 w-full md:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {subjects.length === 0 && <option value="">No subjects for this class</option>}
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">Loading marks…</div>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Student</th>
                <th className="p-3">Admission No.</th>
                <th className="p-3">Marks (out of {outOf})</th>
                <th className="p-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const val = marks[s.id];
                const numeric = val !== undefined && val !== "" ? Number(val) : null;
                const { grade } = gradeFromMarks(numeric, curriculumType);
                const isShaking = shaking[s.id];
                return (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                    <td className="p-3 text-gray-500 text-xs">{s.admission_number}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={outOf}
                        value={val ?? ""}
                        onChange={(e) => handleMarkChange(s.id, e.target.value)}
                        aria-invalid={isShaking || undefined}
                        className={`w-24 rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                          isShaking
                            ? "eduke-mark-shake border-red-500 ring-2 ring-red-200 text-red-600"
                            : "border-gray-300"
                        }`}
                      />
                      {isShaking && (
                        <p className="text-xs text-red-500 mt-1">Max is {outOf}</p>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-gray-700">{numeric !== null ? grade : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving || !subjectId} className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Marks
          </button>
          {saved && <span className="text-sm text-eduke-green font-medium">{saved}</span>}
        </div>
      )}
    </div>
  );
}