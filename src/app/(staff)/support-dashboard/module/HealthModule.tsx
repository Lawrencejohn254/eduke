"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

type Visit = {
  id: string;
  visited_at: string;
  symptoms: string;
  treatment_given: string | null;
  medication_given: string | null;
  outcome: string;
  parent_notified: boolean;
  notes: string | null;
  student: { first_name: string; last_name: string; admission_number: string; class: { name: string } | null } | null;
};
type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string; class: { name: string } | null };

const OUTCOMES = ["Returned to Class", "Sent Home", "Referred to Hospital", "Other"];

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function HealthModule({
  schoolId,
  profileId,
  visits,
  students,
}: {
  schoolId: string;
  profileId: string;
  visits: Visit[];
  students: StudentOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");

  const todayVisits = useMemo(() => visits.filter((v) => isToday(v.visited_at)), [visits]);
  const referred = useMemo(() => todayVisits.filter((v) => v.outcome === "Referred to Hospital").length, [todayVisits]);

  const filtered = query
    ? visits.filter((v) =>
        v.student ? `${v.student.first_name} ${v.student.last_name} ${v.student.admission_number}`.toLowerCase().includes(query.toLowerCase()) : false
      )
    : visits;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Visits Today" value={todayVisits.length} />
        <StatCard label="Referred to Hospital Today" value={referred} tone={referred > 0 ? "danger" : "default"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          placeholder="Search by student name or admission number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> Log Visit
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No clinic visits recorded.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Student</th>
                <th className="p-3">Symptoms</th>
                <th className="p-3">Treatment</th>
                <th className="p-3">Outcome</th>
                <th className="p-3">Parent Notified</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">
                    {v.student ? `${v.student.first_name} ${v.student.last_name}` : "-"}
                    <p className="text-[11px] text-gray-400 font-normal">
                      {v.student?.admission_number}
                      {v.student?.class ? ` · ${v.student.class.name}` : ""}
                    </p>
                  </td>
                  <td className="p-3 text-gray-600 text-xs">{v.symptoms}</td>
                  <td className="p-3 text-gray-600 text-xs">{v.treatment_given ?? "-"}</td>
                  <td className="p-3">
                    <span className={v.outcome === "Referred to Hospital" ? "text-red-600 font-semibold text-xs" : "text-gray-700 text-xs"}>{v.outcome}</span>
                  </td>
                  <td className="p-3 text-xs">{v.parent_notified ? "Yes" : "No"}</td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(v.visited_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <VisitForm schoolId={schoolId} profileId={profileId} students={students} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className={`text-xl font-bold ${tone === "danger" && value > 0 ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function VisitForm({
  schoolId,
  profileId,
  students,
  onClose,
}: {
  schoolId: string;
  profileId: string;
  students: StudentOption[];
  onClose: () => void;
}) {
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [symptoms, setSymptoms] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medication, setMedication] = useState("");
  const [outcome, setOutcome] = useState("Returned to Class");
  const [parentNotified, setParentNotified] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const filteredStudents = studentQuery
    ? students.filter((s) => `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentQuery.toLowerCase()))
    : students;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError("Select a student.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("health_visits").insert({
      school_id: schoolId,
      student_id: studentId,
      symptoms,
      treatment_given: treatment || null,
      medication_given: medication || null,
      outcome,
      parent_notified: parentNotified,
      notes: notes || null,
      recorded_by: profileId,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Log Clinic Visit</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Student</label>
            <input
              placeholder="Search by name or admission number…"
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
            />
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-2"
              size={Math.min(6, Math.max(3, filteredStudents.length))}
            >
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} — {s.admission_number}
                  {s.class ? ` — ${s.class.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <textarea required placeholder="Symptoms / reason for visit" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Treatment given" value={treatment} onChange={(e) => setTreatment(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Medication given (optional)" value={medication} onChange={(e) => setMedication(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={parentNotified} onChange={(e) => setParentNotified(e.target.checked)} />
            Parent/guardian notified
          </label>

          <textarea placeholder="Additional notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !studentId} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Visit
          </button>
        </form>
      </div>
    </div>
  );
}