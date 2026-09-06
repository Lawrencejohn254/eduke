import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import { redirect } from "next/navigation";
import ExamScopeFilter from "./ExamScopeFilter";

type ResultRow = {
  marks_obtained: number | null;
  student_id: string;
  subject: { id: string; name: string } | null;
  student: { id: string; first_name: string; last_name: string; class_id: string | null; stream_id: string | null; class: { name: string } | null } | null;
};

export default async function PerformanceAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  if (!["principal", "deputy_principal", "super_admin", "hod"].includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const params = await searchParams;

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("start_date", { ascending: false });

  let resultsQuery = supabase
    .from("exam_results")
    .select(
      "marks_obtained, student_id, subject:subjects(id, name), student:students!inner(id, first_name, last_name, class_id, stream_id, school_id, class:classes(name))"
    )
    .eq("student.school_id", profile.school_id);

  if (params.exam) resultsQuery = resultsQuery.eq("exam_id", params.exam);

  const { data: results, error: resultsError } = await resultsQuery;
  const typedResults = (results ?? []) as unknown as ResultRow[];

  if (resultsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Performance Analytics</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load results.</p>
          <p className="mt-1 font-mono text-xs">{resultsError.message}</p>
        </div>
      </div>
    );
  }

  if (typedResults.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-gray-900">Performance Analytics</h1>
          <ExamScopeFilter exams={exams ?? []} />
        </div>
        <EmptyState title="No exam results yet" description="Analytics will appear here once results are entered and released." />
      </div>
    );
  }

  // ---- Aggregate by class (grade) ----
  const byClass = new Map<string, { name: string; sum: number; count: number }>();
  for (const r of typedResults) {
    if (r.marks_obtained === null || !r.student?.class_id) continue;
    const key = r.student.class_id;
    const name = r.student.class?.name ?? "Unknown";
    const entry = byClass.get(key) ?? { name, sum: 0, count: 0 };
    entry.sum += Number(r.marks_obtained);
    entry.count += 1;
    byClass.set(key, entry);
  }
  const classRankings = Array.from(byClass.values())
    .map((c) => ({ name: c.name, average: Math.round((c.sum / c.count) * 10) / 10, entries: c.count }))
    .sort((a, b) => b.average - a.average);

  // ---- Aggregate by student ----
  const byStudent = new Map<string, { name: string; className: string; sum: number; count: number }>();
  for (const r of typedResults) {
    if (r.marks_obtained === null || !r.student) continue;
    const key = r.student.id;
    const entry = byStudent.get(key) ?? {
      name: `${r.student.first_name} ${r.student.last_name}`,
      className: r.student.class?.name ?? "-",
      sum: 0,
      count: 0,
    };
    entry.sum += Number(r.marks_obtained);
    entry.count += 1;
    byStudent.set(key, entry);
  }
  const studentRankings = Array.from(byStudent.values())
    .map((s) => ({ ...s, average: Math.round((s.sum / s.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average);
  const topStudents = studentRankings.slice(0, 10);
  const lowStudents = [...studentRankings].sort((a, b) => a.average - b.average).slice(0, 10);

  // ---- Aggregate by subject ----
  const bySubject = new Map<string, { name: string; sum: number; count: number }>();
  for (const r of typedResults) {
    if (r.marks_obtained === null || !r.subject) continue;
    const key = r.subject.id;
    const entry = bySubject.get(key) ?? { name: r.subject.name, sum: 0, count: 0 };
    entry.sum += Number(r.marks_obtained);
    entry.count += 1;
    bySubject.set(key, entry);
  }
  const subjectRankings = Array.from(bySubject.values())
    .map((s) => ({ name: s.name, average: Math.round((s.sum / s.count) * 10) / 10, entries: s.count }))
    .sort((a, b) => b.average - a.average);

  // ---- Aggregate by teacher (via their teacher_subjects assignments) ----
  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select("teacher_id, subject_id, stream_id, teacher:staff(id, first_name, last_name), subject:subjects(name)")
    .in("teacher_id", (await supabase.from("staff").select("id").eq("school_id", profile.school_id)).data?.map((s) => s.id) ?? []);

  const byTeacher = new Map<string, { name: string; sum: number; count: number }>();
  for (const a of assignments ?? []) {
    const teacher = a.teacher as unknown as { id: string; first_name: string; last_name: string } | null;
    if (!teacher) continue;
    const matching = typedResults.filter(
      (r) => r.subject?.id === a.subject_id && r.student?.stream_id === a.stream_id && r.marks_obtained !== null
    );
    if (matching.length === 0) continue;
    const entry = byTeacher.get(teacher.id) ?? { name: `${teacher.first_name} ${teacher.last_name}`, sum: 0, count: 0 };
    for (const m of matching) entry.sum += Number(m.marks_obtained);
    entry.count += matching.length;
    byTeacher.set(teacher.id, entry);
  }
  const teacherRankings = Array.from(byTeacher.values())
    .map((t) => ({ name: t.name, average: Math.round((t.sum / t.count) * 10) / 10, entries: t.count }))
    .sort((a, b) => b.average - a.average);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-sm text-gray-500">Rankings across classes, students, subjects, and teachers.</p>
        </div>
        <ExamScopeFilter exams={exams ?? []} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <RankingCard title="Top-Performing Classes" rows={classRankings.map((c) => ({ label: c.name, value: c.average, sub: `${c.entries} entries` }))} />
        <RankingCard title="Top-Performing Subjects (all classes)" rows={subjectRankings.map((s) => ({ label: s.name, value: s.average, sub: `${s.entries} entries` }))} />
        <RankingCard title="Top 10 Students" rows={topStudents.map((s) => ({ label: s.name, value: s.average, sub: s.className }))} tone="green" />
        <RankingCard title="Students Needing Support (Lowest 10)" rows={lowStudents.map((s) => ({ label: s.name, value: s.average, sub: s.className }))} tone="red" />
        <RankingCard title="Top-Performing Teachers" rows={teacherRankings.map((t) => ({ label: t.name, value: t.average, sub: `${t.entries} entries` }))} className="lg:col-span-2" />
      </div>
    </div>
  );
}

function RankingCard({
  title,
  rows,
  tone = "default",
  className = "",
}: {
  title: string;
  rows: { label: string; value: number; sub: string }[];
  tone?: "default" | "green" | "red";
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 ${className}`}>
      <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No data for this selection.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
                <span className="text-gray-800 truncate">{r.label}</span>
                <span className="text-xs text-gray-400 shrink-0">{r.sub}</span>
              </div>
              <span
                className={`font-semibold shrink-0 ml-2 ${
                  tone === "green" ? "text-eduke-green" : tone === "red" ? "text-red-600" : "text-gray-900"
                }`}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
