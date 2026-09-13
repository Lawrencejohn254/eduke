import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { getDateInTimezone } from "@/lib/date";
import { resolveClassTeacherAssignment } from "@/lib/class-teacher";
import { EmptyState } from "@/components/Loaders";
import { Home } from "lucide-react";
import MyClassDashboardClient, { type StudentRow, type SubjectPerformance, type InterventionRow } from "./MyClassDashboardClient";

export default async function MyClassPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getProfileOrRedirect();
  const resolvedSearchParams = await searchParams;
  const requestedAssignmentId =
    typeof resolvedSearchParams?.assignment === "string" ? resolvedSearchParams.assignment : undefined;

  // resolveClassTeacherAssignment always resolves off the CALLER's own
  // profile server-side — a requested assignment id is only ever accepted
  // if it's already in the caller's own list. There is no path from a URL
  // parameter to someone else's class.
  const { assignment, all: allAssignments } = await resolveClassTeacherAssignment(requestedAssignmentId);

  if (!assignment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Home size={20} /> My Class
          </h1>
        </div>
        <EmptyState
          title="You are not currently assigned as a Class Teacher"
          description="When your Principal assigns you as a class teacher for a stream, your class dashboard will appear here."
        />
      </div>
    );
  }

  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("timezone, promotion_threshold")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone = school?.timezone ?? "Africa/Nairobi";
  const passThreshold = Number(school?.promotion_threshold ?? 50);
  const today = getDateInTimezone(timezone);

  // ---- Term selector: view results for any term, not just the term the ----
  // ---- assignment itself is pinned to (spec section 31). A requested   ----
  // ---- term id is only ever used if it's genuinely one of this SCHOOL's ----
  // ---- own terms — it can't smuggle in another school's id, and even if ----
  // ---- it could, the exam/attendance queries below are still filtered  ----
  // ---- by this teacher's own class_id/stream_id regardless.            ----
  const { data: allTerms } = await supabase
    .from("terms")
    .select("id, term_number, is_current, academic_year:academic_years!inner(id, year, school_id)")
    .eq("academic_year.school_id", profile.school_id)
    .order("term_number");

  type TermOption = { id: string; label: string; isCurrent: boolean };
  const termOptions: TermOption[] = ((allTerms ?? []) as unknown as {
    id: string;
    term_number: string;
    is_current: boolean;
    academic_year: { year: number } | null;
  }[])
    .map((t) => ({ id: t.id, label: `${t.term_number} ${t.academic_year?.year ?? ""}`.trim(), isCurrent: t.is_current }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const requestedTermId =
    typeof resolvedSearchParams?.term === "string" ? resolvedSearchParams.term : undefined;
  const selectedTermId =
    requestedTermId && termOptions.some((t) => t.id === requestedTermId) ? requestedTermId : assignment.term_id;

  // ---- Students in this stream ----
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, photo_url")
    .eq("stream_id", assignment.stream_id)
    .eq("status", "Active")
    .order("first_name");

  const studentIds = (students ?? []).map((s) => s.id);

  // ---- Exams for this class/SELECTED TERM whose results have actually been released ----
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, out_of")
    .eq("class_id", assignment.class_id)
    .eq("term_id", selectedTermId)
    .eq("status", "Results Released");

  const examIds = (exams ?? []).map((e) => e.id);
  const examById = new Map((exams ?? []).map((e) => [e.id, e]));

  // ---- Assessment filter: "All Assessments" (default, blends every ----
  // ---- released exam this term — CATs, mid-term, end-term, etc.) or one ----
  // ---- specific exam. Only ever narrows examIds that already belong to ----
  // ---- this class/term; an unrecognized value just falls back to "all". ----
  const requestedExamId =
    typeof resolvedSearchParams?.exam === "string" ? resolvedSearchParams.exam : undefined;
  const selectedExamId = requestedExamId && examIds.includes(requestedExamId) ? requestedExamId : "all";
  const activeExamIds = selectedExamId === "all" ? examIds : [selectedExamId];

  const examOptions = (exams ?? [])
    .map((e) => ({ id: e.id, name: e.name, examType: e.exam_type as string }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ---- Results + attendance + interventions, each in one bulk query ----
  const [{ data: results }, { data: attendance }, { data: interventions }] = await Promise.all([
    studentIds.length > 0 && activeExamIds.length > 0
      ? supabase
          .from("exam_results")
          .select("student_id, exam_id, subject_id, marks_obtained, grade, subject:subjects(name)")
          .in("student_id", studentIds)
          .in("exam_id", activeExamIds)
      : Promise.resolve({ data: [] as never[] }),
    studentIds.length > 0
      ? supabase
          .from("attendance")
          .select("student_id, date, status")
          .in("student_id", studentIds)
          .eq("term_id", selectedTermId)
      : Promise.resolve({ data: [] as never[] }),
    studentIds.length > 0
      ? supabase
          .from("interventions")
          .select(
            "id, student_id, category, subject_id, issue, observation, action_plan, priority, follow_up_date, status, notes, created_at, creator:staff!interventions_created_by_fkey(first_name, last_name)"
          )
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  // =====================================================================
  // COMPUTE: subject performance
  // =====================================================================

  type ResultRow = {
    student_id: string;
    exam_id: string;
    subject_id: string;
    marks_obtained: number | null;
    grade: string | null;
    subject: { name: string } | null;
  };

  const normalizedResults = ((results ?? []) as unknown as ResultRow[]).map((r) => {
    const exam = examById.get(r.exam_id);
    const outOf = exam?.out_of ?? 100;
    const pct = r.marks_obtained != null && outOf > 0 ? (r.marks_obtained / outOf) * 100 : null;
    return { ...r, subjectName: r.subject?.name ?? "Unknown Subject", pct };
  });

  const bySubjectName = new Map<string, typeof normalizedResults>();
  for (const r of normalizedResults) {
    if (r.pct == null) continue;
    // Group by name, not subject_id: this school (like others might) has
    // more than one subject row with the same name for the same class —
    // a data-entry duplicate upstream, not something the dashboard should
    // surface as two separate subjects.
    const key = r.subjectName.trim().toLowerCase();
    const list = bySubjectName.get(key) ?? [];
    list.push(r);
    bySubjectName.set(key, list);
  }

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const subjectPerformance: SubjectPerformance[] = Array.from(bySubjectName.values())
    .map((rows) => {
      const pcts = rows.map((r) => r.pct as number);
      const assessments = new Map<string, number[]>();
      const byStudent = new Map<string, number[]>();
      for (const r of rows) {
        const exam = examById.get(r.exam_id);
        const label = exam?.name ?? "Assessment";
        const list = assessments.get(label) ?? [];
        list.push(r.pct as number);
        assessments.set(label, list);

        const studentScores = byStudent.get(r.student_id) ?? [];
        studentScores.push(r.pct as number);
        byStudent.set(r.student_id, studentScores);
      }
      const studentScores = Array.from(byStudent.entries())
        .map(([studentId, scores]) => {
          const student = studentById.get(studentId);
          return {
            id: studentId,
            name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
            admissionNumber: student?.admission_number ?? "",
            average: avg(scores),
          };
        })
        .sort((a, b) => b.average - a.average);

      return {
        // First subject_id encountered is used only as a stable React key —
        // never relied on for correctness, since the whole point is that
        // more than one id can share this name.
        subjectId: rows[0].subject_id,
        subjectName: rows[0].subjectName,
        students: studentScores.length,
        average: avg(pcts),
        passRate: (pcts.filter((p) => p >= passThreshold).length / pcts.length) * 100,
        highest: Math.max(...pcts),
        lowest: Math.min(...pcts),
        assessments: Array.from(assessments.entries()).map(([name, scores]) => ({
          name,
          average: avg(scores),
        })),
        studentScores,
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  // Grade distribution across every released subject-assessment result this term.
  const gradeDistribution = new Map<string, number>();
  for (const r of normalizedResults) {
    if (!r.grade) continue;
    gradeDistribution.set(r.grade, (gradeDistribution.get(r.grade) ?? 0) + 1);
  }

  // =====================================================================
  // COMPUTE: attendance per student + class-wide attendance
  // =====================================================================

  type AttendanceRow = { student_id: string; date: string; status: "Present" | "Absent" | "Late" | "Excused" };
  const attendanceRows = (attendance ?? []) as unknown as AttendanceRow[];

  const attendanceByStudent = new Map<string, AttendanceRow[]>();
  for (const a of attendanceRows) {
    const list = attendanceByStudent.get(a.student_id) ?? [];
    list.push(a);
    attendanceByStudent.set(a.student_id, list);
  }

  function attendanceRate(rows: AttendanceRow[]): number | null {
    const countable = rows.filter((r) => r.status !== "Excused");
    if (countable.length === 0) return null;
    const present = countable.filter((r) => r.status === "Present" || r.status === "Late").length;
    return (present / countable.length) * 100;
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const todayRows = attendanceRows.filter((a) => a.date === today);
  const weekRows = attendanceRows.filter((a) => a.date >= weekAgoStr);

  const todayPresent = todayRows.filter((a) => a.status === "Present" || a.status === "Late").length;
  const termRate = attendanceRate(attendanceRows);
  const weekRate = attendanceRate(weekRows);

  // =====================================================================
  // COMPUTE: per-student overall performance + ranking
  // =====================================================================

  const resultsByStudent = new Map<string, typeof normalizedResults>();
  for (const r of normalizedResults) {
    if (r.pct == null) continue;
    const list = resultsByStudent.get(r.student_id) ?? [];
    list.push(r);
    resultsByStudent.set(r.student_id, list);
  }

  const studentAverages = (students ?? []).map((s) => {
    const rows = resultsByStudent.get(s.id) ?? [];
    const average = rows.length > 0 ? avg(rows.map((r) => r.pct as number)) : null;
    const attRows = attendanceByStudent.get(s.id) ?? [];
    const attRate = attendanceRate(attRows);
    const belowTargetSubjects = rows.filter((r) => (r.pct as number) < passThreshold).length;
    return { student: s, average, attendance: attRate, belowTargetSubjects, subjectRows: rows };
  });

  const ranked = [...studentAverages]
    .filter((s) => s.average != null)
    .sort((a, b) => (b.average as number) - (a.average as number));
  const positionByStudentId = new Map(ranked.map((s, idx) => [s.student.id, idx + 1]));

  const studentRows: StudentRow[] = studentAverages.map((s) => {
    const reasons: string[] = [];
    if (s.average != null && s.average < passThreshold) {
      reasons.push(`Overall average: ${s.average.toFixed(0)}% (below ${passThreshold}% threshold)`);
    }
    if (s.attendance != null && s.attendance < 80) {
      reasons.push(`Attendance: ${s.attendance.toFixed(0)}% (below 80% threshold)`);
    }
    if (s.belowTargetSubjects >= 2) {
      reasons.push(`${s.belowTargetSubjects} subjects below ${passThreshold}% target`);
    }
    return {
      id: s.student.id,
      name: `${s.student.first_name} ${s.student.last_name}`,
      admissionNumber: s.student.admission_number,
      average: s.average,
      position: positionByStudentId.get(s.student.id) ?? null,
      attendance: s.attendance,
      atRisk: reasons.length > 0,
      riskReasons: reasons,
      subjects: s.subjectRows.map((r) => ({ subjectName: r.subjectName, pct: r.pct as number })),
    };
  });

  const atRiskStudents = studentRows.filter((s) => s.atRisk);
  const priorityAttention = atRiskStudents.filter(
    (s) => s.attendance != null && s.attendance < 80 && s.average != null && s.average < passThreshold
  );

  const classAverage =
    ranked.length > 0 ? avg(ranked.map((s) => s.average as number)) : null;
  const overallPassRate =
    normalizedResults.filter((r) => r.pct != null).length > 0
      ? (normalizedResults.filter((r) => r.pct != null && (r.pct as number) >= passThreshold).length /
          normalizedResults.filter((r) => r.pct != null).length) *
        100
      : null;

  const interventionRows: InterventionRow[] = ((interventions ?? []) as unknown as {
    id: string;
    student_id: string;
    category: string;
    subject_id: string | null;
    issue: string;
    observation: string | null;
    action_plan: string | null;
    priority: string;
    follow_up_date: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    creator: { first_name: string; last_name: string } | null;
  }[]).map((i) => ({
    id: i.id,
    studentId: i.student_id,
    studentName:
      (students ?? []).find((s) => s.id === i.student_id)
        ? `${(students ?? []).find((s) => s.id === i.student_id)!.first_name} ${(students ?? []).find((s) => s.id === i.student_id)!.last_name}`
        : "Unknown",
    schoolId: assignment.school_id,
    category: i.category,
    issue: i.issue,
    observation: i.observation,
    actionPlan: i.action_plan,
    priority: i.priority,
    followUpDate: i.follow_up_date,
    status: i.status,
    notes: i.notes,
    createdAt: i.created_at,
    createdBy: i.creator ? `${i.creator.first_name} ${i.creator.last_name}` : "Unknown",
  }));

  return (
    <MyClassDashboardClient
      assignment={assignment}
      allAssignments={allAssignments}
      termOptions={termOptions}
      selectedTermId={selectedTermId}
      examOptions={examOptions}
      selectedExamId={selectedExamId}
      totalStudents={(students ?? []).length}
      classAverage={classAverage}
      passRate={overallPassRate}
      attendanceThisTerm={termRate}
      atRiskCount={atRiskStudents.length}
      subjectPerformance={subjectPerformance}
      gradeDistribution={Array.from(gradeDistribution.entries()).map(([grade, count]) => ({ grade, count }))}
      students={studentRows}
      atRiskStudents={atRiskStudents}
      priorityAttention={priorityAttention}
      attendanceToday={todayRows.length > 0 ? { present: todayPresent, total: todayRows.length } : null}
      attendanceThisWeek={weekRate}
      poorAttendance={studentRows
        .filter((s) => s.attendance != null && s.attendance < 80)
        .sort((a, b) => (a.attendance ?? 0) - (b.attendance ?? 0))}
      interventions={interventionRows}
      passThreshold={passThreshold}
      hasReleasedResults={activeExamIds.length > 0}
      hasAttendanceData={attendanceRows.length > 0}
    />
  );
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}