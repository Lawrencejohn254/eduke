import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeFromMarks } from "@/lib/format";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studentId = req.nextUrl.searchParams.get("studentId");
  const examId = req.nextUrl.searchParams.get("examId");
  if (!studentId || !examId) return NextResponse.json({ error: "studentId and examId are required" }, { status: 400 });

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class_id, stream_id, class:classes(name, curriculum_type), stream:streams(name, class_teacher_id)")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) return NextResponse.json({ error: "Student not found or not accessible" }, { status: 404 });

  const klass = student.class as unknown as { name: string; curriculum_type: "CBC" | "8-4-4" | null } | null;
  const curriculumType = klass?.curriculum_type ?? "8-4-4";

  const { data: exam } = await supabase
    .from("exams")
    .select("id, name, term_id, out_of, class_id")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const { data: term } = await supabase
    .from("terms")
    .select("id, term_number, start_date, end_date, academic_year:academic_years(year)")
    .eq("id", exam.term_id)
    .maybeSingle();

  const { data: results } = await supabase
    .from("exam_results")
    .select("marks_obtained, grade, teacher_comment, subject:subjects(name)")
    .eq("student_id", studentId)
    .eq("exam_id", examId);

  const subjects = (results ?? []).map((r) => {
    const subject = r.subject as unknown as { name: string } | null;
    return {
      name: subject?.name ?? "-",
      marks: r.marks_obtained !== null ? Number(r.marks_obtained) : null,
      grade: r.grade ?? gradeFromMarks(r.marks_obtained !== null ? Number(r.marks_obtained) : null, curriculumType).grade,
      comment: r.teacher_comment,
    };
  });

  const scored = subjects.filter((s) => s.marks !== null).map((s) => s.marks as number);
  const totalMarks = scored.reduce((a, b) => a + b, 0);
  const meanMarks = scored.length ? totalMarks / scored.length : 0;
  const meanGrade = gradeFromMarks(scored.length ? meanMarks : null, curriculumType).grade;

  // Position within the same stream, ranked by average marks on this exam.
  let position: number | null = null;
  let totalStudents: number | null = null;
  if (student.stream_id) {
    const { data: streamStudents } = await supabase.from("students").select("id").eq("stream_id", student.stream_id).eq("status", "Active");
    const streamStudentIds = (streamStudents ?? []).map((s) => s.id);
    if (streamStudentIds.length > 0) {
      const { data: allResults } = await supabase
        .from("exam_results")
        .select("student_id, marks_obtained")
        .eq("exam_id", examId)
        .in("student_id", streamStudentIds);

      const byStudent = new Map<string, { sum: number; count: number }>();
      for (const r of allResults ?? []) {
        if (r.marks_obtained === null) continue;
        const entry = byStudent.get(r.student_id) ?? { sum: 0, count: 0 };
        entry.sum += Number(r.marks_obtained);
        entry.count += 1;
        byStudent.set(r.student_id, entry);
      }
      const ranked = Array.from(byStudent.entries())
        .map(([id, v]) => ({ id, avg: v.sum / v.count }))
        .sort((a, b) => b.avg - a.avg);

      totalStudents = ranked.length;
      const idx = ranked.findIndex((r) => r.id === studentId);
      position = idx >= 0 ? idx + 1 : null;
    }
  }

  // Attendance within the term's date range (fallback: last 90 days if the term has no dates set).
  let attendanceRate: number | null = null;
  const startDate = term?.start_date ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const endDate = term?.end_date ?? new Date().toISOString().slice(0, 10);
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", studentId)
    .gte("date", startDate)
    .lte("date", endDate);
  if (attendanceRows && attendanceRows.length > 0) {
    const present = attendanceRows.filter((a) => a.status === "Present").length;
    attendanceRate = Math.round((present / attendanceRows.length) * 100);
  }

  let classTeacherName: string | null = null;
  const stream = student.stream as unknown as { name: string; class_teacher_id: string | null } | null;
  if (stream?.class_teacher_id) {
    const { data: teacher } = await supabase.from("staff").select("first_name, last_name").eq("id", stream.class_teacher_id).maybeSingle();
    if (teacher) classTeacherName = `${teacher.first_name} ${teacher.last_name}`;
  }

  const { data: remarks } = await supabase
    .from("report_card_remarks")
    .select("class_teacher_comment, principal_comment")
    .eq("student_id", studentId)
    .eq("term_id", exam.term_id)
    .maybeSingle();

  return NextResponse.json({
    student: {
      name: `${student.first_name} ${student.last_name}`,
      admissionNumber: student.admission_number,
      className: klass?.name ?? "-",
      streamName: stream?.name ?? "-",
    },
    curriculumType,
    exam: { id: exam.id, name: exam.name },
    term: {
      id: exam.term_id,
      label: term ? `${term.term_number} ${(term.academic_year as unknown as { year: number })?.year ?? ""}` : "-",
    },
    subjects,
    totalMarks,
    meanMarks,
    meanGrade,
    position,
    totalStudents,
    attendanceRate,
    classTeacherName,
    remarks: {
      classTeacherComment: remarks?.class_teacher_comment ?? "",
      principalComment: remarks?.principal_comment ?? "",
    },
  });
}