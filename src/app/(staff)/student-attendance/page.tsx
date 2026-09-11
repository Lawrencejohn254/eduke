import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import StudentAttendanceReport from "./StudentAttendanceReport";

export default async function StudentAttendancePage() {
  const profile = await getProfileOrRedirect();

  const isAdminTier = ["principal", "deputy_principal", "super_admin"].includes(profile.role);
  const isTeachingStaff = ["teacher", "hod"].includes(profile.role);

  if (!isAdminTier && !isTeachingStaff) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, start_date, end_date, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  /*
   * CLASS SCOPE
   *
   * Admin tier: every class at the school.
   * Teaching staff: only classes they're actually assigned to teach,
   * via teacher_subjects -> streams -> class_id (same source
   * teacher-dashboard already uses for "My Classes & Streams").
   */

  let allowedClassIds: string[] | null = null; // null = unrestricted (admin tier)

  if (isTeachingStaff) {
    const { data: assignments } = profile.staff_id
      ? await supabase
          .from("teacher_subjects")
          .select("stream:streams(class_id)")
          .eq("teacher_id", profile.staff_id)
      : { data: [] };

    allowedClassIds = Array.from(
      new Set(
        (assignments ?? [])
          .map((a) => (a.stream as unknown as { class_id: string } | null)?.class_id)
          .filter((id): id is string => Boolean(id))
      )
    );
  }

  const noAssignedClasses = allowedClassIds !== null && allowedClassIds.length === 0;

  let classes: { id: string; name: string }[] = [];
  let students: {
    id: string;
    first_name: string;
    last_name: string;
    admission_number: string;
    class_id: string | null;
    class: unknown;
    stream: unknown;
  }[] = [];

  if (!noAssignedClasses) {
    const classesQuery = supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", profile.school_id)
      .order("name");

    const { data: classesData } = allowedClassIds
      ? await classesQuery.in("id", allowedClassIds)
      : await classesQuery;

    classes = classesData ?? [];

    const studentsQuery = supabase
      .from("students")
      .select(
        "id, first_name, last_name, admission_number, class_id, stream_id, class:classes(name), stream:streams(name)"
      )
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name");

    const { data: studentsData } = allowedClassIds
      ? await studentsQuery.in("class_id", allowedClassIds)
      : await studentsQuery;

    students = studentsData ?? [];
  }

  const studentIds = students.map((s) => s.id);

  function isWeekend(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return day === 0 || day === 6;
  }

  let attendanceRows: { student_id: string; status: string; date: string }[] = [];

  if (currentTerm && studentIds.length > 0) {
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status, date")
      .in("student_id", studentIds)
      .eq("term_id", currentTerm.id);

    attendanceRows = (data ?? []).filter((row) => !isWeekend(row.date));
  }

  const statsByStudent = new Map<string, { total: number; attended: number }>();

  for (const row of attendanceRows) {
    const entry = statsByStudent.get(row.student_id) ?? { total: 0, attended: 0 };
    entry.total += 1;
    if (row.status === "Present" || row.status === "Late") entry.attended += 1;
    statsByStudent.set(row.student_id, entry);
  }

  const studentsWithStats = students.map((s) => {
    const stats = statsByStudent.get(s.id);
    const percentage =
      stats && stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : null;

    return {
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      admissionNumber: s.admission_number,
      className: (s.class as unknown as { name: string } | null)?.name ?? "-",
      streamName: (s.stream as unknown as { name: string } | null)?.name ?? "-",
      classId: s.class_id,
      totalDays: stats?.total ?? 0,
      attendedDays: stats?.attended ?? 0,
      percentage,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {isAdminTier ? "Student Attendance" : "My Classes' Attendance"}
        </h1>
        <p className="text-sm text-gray-500">
          {currentTerm
            ? `${
                (currentTerm.academic_year as unknown as { year: number })?.year
              } · ${currentTerm.term_number} attendance${isAdminTier ? ", by class" : ""}`
            : "No current term set — attendance percentages cannot be calculated."}
        </p>
      </div>

      {noAssignedClasses ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
          You aren't assigned to any classes yet. Once a class is assigned to you, its students'
          attendance will show up here.
        </div>
      ) : (
        <StudentAttendanceReport classes={classes} students={studentsWithStats} />
      )}
    </div>
  );
}