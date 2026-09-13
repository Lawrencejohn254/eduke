import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { resolveClassTeacherAssignment } from "@/lib/class-teacher";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/Loaders";

type StudentDetailClientProps = {
  student: { id: string; name: string; admissionNumber: string | null };
  assignment: unknown;
  selectedTermId: string;
  overallAverage: number | null;
  subjectsBelowTarget: number;
  attendanceRate: number | null;
  subjectPerformance: { subjectName: string; average: number }[];
  trend: { term: string; average: number }[];
  classTeacherComment: string | null;
  interventions: {
    id: string;
    category: string;
    issue: string;
    observation: string | null;
    actionPlan: string | null;
    priority: string;
    followUpDate: string | null;
    status: string;
    createdAt: string;
  }[];
};

function StudentDetailClient({
  student,
  overallAverage,
  attendanceRate,
  subjectsBelowTarget,
  classTeacherComment,
}: StudentDetailClientProps) {
  return (
    <div className="space-y-6">
      <Link href="/my-class" className="text-sm text-eduke-green inline-flex items-center gap-1 hover:underline">
        <ArrowLeft size={14} /> Back to My Class
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{student.name}</h1>
        <p className="text-sm text-muted-foreground">Admission number: {student.admissionNumber ?? "—"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Overall average</p>
          <p className="text-2xl font-semibold">{overallAverage == null ? "—" : `${overallAverage.toFixed(1)}%`}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Attendance rate</p>
          <p className="text-2xl font-semibold">{attendanceRate == null ? "—" : `${attendanceRate.toFixed(1)}%`}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Subjects below target</p>
          <p className="text-2xl font-semibold">{subjectsBelowTarget}</p>
        </div>
      </div>
      {classTeacherComment && <p className="rounded-lg border p-4">{classTeacherComment}</p>}
    </div>
  );
}

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await getProfileOrRedirect();
  const { id: studentId } = await params;
  const resolvedSearchParams = await searchParams;
  const requestedAssignmentId =
    typeof resolvedSearchParams?.assignment === "string" ? resolvedSearchParams.assignment : undefined;

  const { assignment } = await resolveClassTeacherAssignment(requestedAssignmentId);
  if (!assignment) redirect("/my-class");

  // The term being viewed on the dashboard this drill-down was opened from.
  // Falls back to the assignment's own (current) term if none was passed —
  // e.g. a bookmarked/direct link. Safe regardless of what's passed in: it
  // only ever filters exams/attendance already scoped to this teacher's own
  // class_id/stream_id, never used to widen access.
  const selectedTermId =
    typeof resolvedSearchParams?.term === "string" ? resolvedSearchParams.term : assignment.term_id;

  const supabase = await createClient();

  // Authorization: the student MUST belong to the caller's own assigned
  // stream. This is resolved server-side from the verified assignment, not
  // from anything in the URL — a teacher cannot view a student outside
  // their assigned class by editing the id in the address bar.
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, photo_url, stream_id")
    .eq("id", studentId)
    .eq("stream_id", assignment.stream_id)
    .maybeSingle();

  if (!student) {
    return (
      <div className="space-y-4">
        <Link href="/my-class" className="text-sm text-eduke-green inline-flex items-center gap-1 hover:underline">
          <ArrowLeft size={14} /> Back to My Class
        </Link>
        <EmptyState title="Student not found" description="This student is not in your assigned class, or no longer exists." />
      </div>
    );
  }

  const { data: school } = await supabase
    .from("schools")
    .select("promotion_threshold")
    .eq("id", assignment.school_id)
    .maybeSingle();
  const passThreshold = Number(school?.promotion_threshold ?? 50);

  // All released exams for this student's class across every term this year,
  // so we can show a term-over-term trend, not just the current term.
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, out_of, term_id, term:terms(term_number, academic_year_id)")
    .eq("class_id", assignment.class_id)
    .eq("status", "Results Released");

  const examIds = (exams ?? []).map((e) => e.id);
  const examById = new Map((exams ?? []).map((e) => [e.id, e]));

  const [{ data: results }, { data: attendance }, { data: remark }, { data: interventions }] = await Promise.all([
    examIds.length > 0
      ? supabase
          .from("exam_results")
          .select("exam_id, subject_id, marks_obtained, grade, subject:subjects(name)")
          .eq("student_id", student.id)
          .in("exam_id", examIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("attendance")
      .select("date, status")
      .eq("student_id", student.id)
      .eq("term_id", selectedTermId),
    supabase
      .from("report_card_remarks")
      .select("class_teacher_comment")
      .eq("student_id", student.id)
      .eq("term_id", selectedTermId)
      .maybeSingle(),
    supabase
      .from("interventions")
      .select("id, category, issue, observation, action_plan, priority, follow_up_date, status, created_at")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false }),
  ]);

  type ResultRow = { exam_id: string; subject_id: string; marks_obtained: number | null; grade: string | null; subject: { name: string } | null };
  const normalized = ((results ?? []) as unknown as ResultRow[]).map((r) => {
    const exam = examById.get(r.exam_id);
    const outOf = exam?.out_of ?? 100;
    const pct = r.marks_obtained != null && outOf > 0 ? (r.marks_obtained / outOf) * 100 : null;
    return { ...r, subjectName: r.subject?.name ?? "Unknown Subject", pct, examTermId: exam?.term_id ?? null, termLabel: (exam?.term as unknown as { term_number: string } | null)?.term_number ?? "" };
  });

  const thisTermResults = normalized.filter((r) => r.examTermId === selectedTermId && r.pct != null);
  const overallAverage = thisTermResults.length > 0 ? avg(thisTermResults.map((r) => r.pct as number)) : null;

  const subjectPerformance = Object.values(
    thisTermResults.reduce<Record<string, { subjectName: string; scores: number[] }>>((acc, r) => {
      acc[r.subject_id] = acc[r.subject_id] ?? { subjectName: r.subjectName, scores: [] };
      acc[r.subject_id].scores.push(r.pct as number);
      return acc;
    }, {})
  ).map((s) => ({ subjectName: s.subjectName, average: avg(s.scores) }));

  const subjectsBelowTarget = subjectPerformance.filter((s) => s.average < passThreshold).length;

  // Term-over-term trend (this class's released exams, grouped by term).
  const byTerm = new Map<string, number[]>();
  for (const r of normalized) {
    if (r.pct == null) continue;
    const list = byTerm.get(r.termLabel) ?? [];
    list.push(r.pct);
    byTerm.set(r.termLabel, list);
  }
  const trend = Array.from(byTerm.entries())
    .map(([term, scores]) => ({ term, average: avg(scores) }))
    .sort((a, b) => a.term.localeCompare(b.term));

  type AttendanceRow = { date: string; status: "Present" | "Absent" | "Late" | "Excused" };
  const attendanceRows = (attendance ?? []) as unknown as AttendanceRow[];
  const countable = attendanceRows.filter((a) => a.status !== "Excused");
  const attendanceRate =
    countable.length > 0
      ? (countable.filter((a) => a.status === "Present" || a.status === "Late").length / countable.length) * 100
      : null;

  return (
    <StudentDetailClient
      student={{
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admissionNumber: student.admission_number,
      }}
      assignment={assignment}
      selectedTermId={selectedTermId}
      overallAverage={overallAverage}
      subjectsBelowTarget={subjectsBelowTarget}
      attendanceRate={attendanceRate}
      subjectPerformance={subjectPerformance}
      trend={trend}
      classTeacherComment={remark?.class_teacher_comment ?? null}
      interventions={(interventions ?? []).map((i) => ({
        id: i.id,
        category: i.category,
        issue: i.issue,
        observation: i.observation,
        actionPlan: i.action_plan,
        priority: i.priority,
        followUpDate: i.follow_up_date,
        status: i.status,
        createdAt: i.created_at,
      }))}
    />
  );
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}