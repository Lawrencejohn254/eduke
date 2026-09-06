import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/Loaders";
import ReleaseResultsButton from "./ReleaseResultsButton";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canRelease = ["principal", "deputy_principal", "super_admin"].includes(profile.role);

  const { data: exam } = await supabase.from("exams").select("id, name, status, out_of, class:classes(name)").eq("id", id).maybeSingle();
  if (!exam) notFound();

  const { data: results } = await supabase
    .from("exam_results")
    .select("student_id, marks_obtained, grade, points, subject:subjects(name), student:students(first_name, last_name, admission_number)")
    .eq("exam_id", id);

  // Aggregate per student: total marks, mean grade
  const byStudent = new Map<
    string,
    { name: string; admission: string; total: number; count: number; subjects: { name: string; marks: number | null; grade: string | null }[] }
  >();

  for (const r of results ?? []) {
    const student = r.student as unknown as { first_name: string; last_name: string; admission_number: string } | null;
    const subject = r.subject as unknown as { name: string } | null;
    if (!student) continue;
    const entry = byStudent.get(r.student_id) ?? {
      name: `${student.first_name} ${student.last_name}`,
      admission: student.admission_number,
      total: 0,
      count: 0,
      subjects: [],
    };
    if (r.marks_obtained !== null) {
      entry.total += Number(r.marks_obtained);
      entry.count += 1;
    }
    entry.subjects.push({ name: subject?.name ?? "-", marks: r.marks_obtained, grade: r.grade });
    byStudent.set(r.student_id, entry);
  }

  const ranked = Array.from(byStudent.values())
    .map((s) => ({ ...s, mean: s.count ? Math.round((s.total / s.count) * 10) / 10 : 0 }))
    .sort((a, b) => b.mean - a.mean)
    .map((s, i) => ({ ...s, position: i + 1 }));

  return (
    <div className="space-y-4">
      <Link href="/exams" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 w-fit">
        <ArrowLeft size={14} /> Back to Exams
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Results — {exam.name}</h1>
          <p className="text-sm text-gray-500">
            {(exam.class as unknown as { name: string } | null)?.name} · Status: {exam.status}
          </p>
        </div>
        {canRelease && exam.status !== "Results Released" && <ReleaseResultsButton examId={exam.id} />}
      </div>

      {ranked.length === 0 ? (
        <EmptyState title="No marks entered yet" description="Enter marks for this exam to see rankings here." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Position</th>
                <th className="p-3">Student</th>
                <th className="p-3">Admission No.</th>
                <th className="p-3">Mean Score</th>
                <th className="p-3">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s) => (
                <tr key={s.admission} className="border-b border-gray-50">
                  <td className="p-3 font-bold text-gray-900">{s.position}</td>
                  <td className="p-3 font-medium text-gray-900">{s.name}</td>
                  <td className="p-3 text-gray-500 text-xs">{s.admission}</td>
                  <td className="p-3 font-semibold text-eduke-green">{s.mean}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {s.subjects.map((sub) => `${sub.name}: ${sub.marks ?? "-"} (${sub.grade ?? "-"})`).join(" · ")}
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
