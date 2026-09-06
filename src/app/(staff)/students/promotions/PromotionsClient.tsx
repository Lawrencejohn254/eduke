"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUpCircle } from "lucide-react";

type ClassRow = { id: string; name: string; next_class_id: string | null };
type StreamRow = { id: string; name: string; class_id: string };
type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string | null;
  stream_id: string | null;
  average: number | null;
  balance_brought_forward: number;
};

export default function PromotionsClient({
  classes,
  streams,
  students,
  threshold,
  currentTermId,
}: {
  classes: ClassRow[];
  streams: StreamRow[];
  students: StudentRow[];
  threshold: number;
  currentTermId: string | null;
}) {
  const classById = new Map(classes.map((c) => [c.id, c]));
  const studentsByClass = new Map<string, StudentRow[]>();
  for (const s of students) {
    if (!s.class_id) continue;
    const arr = studentsByClass.get(s.class_id) ?? [];
    arr.push(s);
    studentsByClass.set(s.class_id, arr);
  }

  const [checked, setChecked] = useState<Set<string>>(
    new Set(students.filter((s) => s.average !== null && s.average >= threshold).map((s) => s.id))
  );
  const [busyClass, setBusyClass] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const router = useRouter();

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function promoteClass(classId: string) {
    const klass = classById.get(classId);
    if (!klass?.next_class_id) return;

    const studentsToPromote = (studentsByClass.get(classId) ?? []).filter((s) => checked.has(s.id));
    if (studentsToPromote.length === 0) return;

    setBusyClass(classId);
    const supabase = createClient();
    const nextClassStreams = streams.filter((s) => s.class_id === klass.next_class_id);

    // The old class's expected fee for the current term — same for every student in this class,
    // so compute it once rather than per student.
    let expectedForOldClass = 0;
    if (currentTermId) {
      const { data: structure } = await supabase
        .from("fee_structure")
        .select("amount")
        .eq("class_id", classId)
        .eq("term_id", currentTermId);
      expectedForOldClass = (structure ?? []).reduce((sum, f) => sum + Number(f.amount), 0);
    }

    let promoted = 0;
    let noStreamAvailable = 0;
    for (const student of studentsToPromote) {
      const currentStream = streams.find((s) => s.id === student.stream_id);
      const matched = currentStream
        ? nextClassStreams.find((s) => s.name.toLowerCase() === currentStream.name.toLowerCase())
        : undefined;
      const targetStreamId = matched?.id ?? nextClassStreams[0]?.id ?? null;
      if (!targetStreamId) noStreamAvailable++;

      // Carry forward this student's outstanding balance (or credit, if overpaid) into their
      // balance_brought_forward, so it still counts once they move into the new class/term.
      let newBroughtForward = student.balance_brought_forward;
      if (currentTermId) {
        const { data: payments } = await supabase
          .from("fee_payments")
          .select("amount")
          .eq("student_id", student.id)
          .eq("term_id", currentTermId)
          .eq("status", "Confirmed");
        const paid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
        const outstandingThisTerm = expectedForOldClass - paid; // can be negative (credit/overpayment)
        newBroughtForward = student.balance_brought_forward + outstandingThisTerm;

        // Snapshot the class/stream they're leaving, tied to the term this happened in.
        await supabase.from("student_class_history").insert({
          student_id: student.id,
          class_id: classId,
          stream_id: student.stream_id,
          term_id: currentTermId,
        });
      }

      const { error } = await supabase
        .from("students")
        .update({ class_id: klass.next_class_id, stream_id: targetStreamId, balance_brought_forward: newBroughtForward })
        .eq("id", student.id);
      if (!error) promoted++;
    }

    setBusyClass(null);
    setResults((prev) => ({
      ...prev,
      [classId]: `Promoted ${promoted} of ${studentsToPromote.length} student(s) to ${classById.get(klass.next_class_id!)?.name ?? "next class"}.${
        noStreamAvailable ? ` ${noStreamAvailable} had no matching stream — assign manually.` : ""
      }`,
    }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {classes.map((klass) => {
        const classStudents = studentsByClass.get(klass.id) ?? [];
        if (classStudents.length === 0) return null;
        const nextClassName = klass.next_class_id ? classById.get(klass.next_class_id)?.name : null;
        const checkedInClass = classStudents.filter((s) => checked.has(s.id)).length;

        return (
          <div key={klass.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">{klass.name}</p>
                <p className="text-xs text-gray-500">
                  {nextClassName ? `Promotes to ${nextClassName}` : "No next class configured (set it in Settings)"}
                </p>
              </div>
              <button
                onClick={() => promoteClass(klass.id)}
                disabled={!klass.next_class_id || checkedInClass === 0 || busyClass === klass.id}
                className="flex items-center gap-1.5 bg-eduke-green text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-40"
              >
                {busyClass === klass.id ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpCircle size={14} />}
                Promote {checkedInClass} Selected
              </button>
            </div>

            <div className="space-y-1.5">
              {classStudents.map((s) => {
                const meets = s.average !== null && s.average >= threshold;
                return (
                  <label key={s.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
                    <span className="flex items-center gap-2 min-w-0">
                      <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                      <span className="text-gray-800 truncate">{s.first_name} {s.last_name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{s.admission_number}</span>
                      {s.balance_brought_forward !== 0 && (
                        <span className={`text-[10px] shrink-0 ${s.balance_brought_forward > 0 ? "text-red-500" : "text-eduke-green"}`}>
                          ({s.balance_brought_forward > 0 ? "owes" : "credit"} KES {Math.abs(s.balance_brought_forward).toLocaleString()} b/f)
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-xs font-semibold shrink-0 ml-2 ${
                        s.average === null ? "text-gray-400" : meets ? "text-eduke-green" : "text-red-600"
                      }`}
                    >
                      {s.average === null ? "No results" : `${s.average}%`}
                    </span>
                  </label>
                );
              })}
            </div>
            {results[klass.id] && <p className="text-xs text-eduke-green mt-2">{results[klass.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}
