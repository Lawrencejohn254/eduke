import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import ClassTeachersClient from "./ClassTeachersClient";

export default async function ClassTeachersPage() {
  const profile = await getProfileOrRedirect();

  if (!["principal", "deputy_principal", "super_admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Only principal/super_admin may actually assign/change/end — deputy_principal
  // gets read access here, matching the existing Settings page convention
  // (canEditSchool / AcademicYearManager's canManage are principal+super_admin only).
  const canManage = ["principal", "super_admin"].includes(profile.role);

  const supabase = await createClient();

  const [{ data: classes }, { data: currentYear }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", profile.school_id)
      .order("name"),
    supabase
      .from("academic_years")
      .select("id, year")
      .eq("school_id", profile.school_id)
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  const classIds = (classes ?? []).map((c) => c.id);

  const [{ data: streams }, { data: academicYears }, { data: teacherProfiles }] = await Promise.all([
    classIds.length > 0
      ? supabase
          .from("streams")
          .select("id, name, class_id, class_teacher_id")
          .in("class_id", classIds)
          .order("name")
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("academic_years")
      .select("id, year, terms(id, term_number, is_current)")
      .eq("school_id", profile.school_id)
      .order("year", { ascending: false }),
    supabase
      .from("profiles")
      .select("staff_id, role, first_name, last_name")
      .eq("school_id", profile.school_id)
      .in("role", ["teacher", "hod"])
      .not("staff_id", "is", null)
      .order("first_name"),
  ]);

  const currentTerm = currentYear
    ? (academicYears ?? [])
        .find((y) => y.id === currentYear.id)
        ?.terms?.find((t: { is_current: boolean }) => t.is_current) ?? null
    : null;

  // Full history for this school, newest first — the list is bounded by
  // (streams x terms), never per-student/per-subject, so this is safe to
  // load in one shot rather than fetching per row.
  const { data: assignments } = await supabase
    .from("class_teacher_assignments")
    .select(
      `
      id, stream_id, class_id, teacher_id, academic_year_id, term_id,
      start_date, end_date, status,
      teacher:staff!class_teacher_assignments_teacher_id_fkey(first_name, last_name),
      term:terms(term_number, academic_year:academic_years(year))
    `
    )
    .eq("school_id", profile.school_id)
    .order("start_date", { ascending: false });

  type TeacherRef = { first_name: string; last_name: string } | null;
  type TermRef = { term_number: string; academic_year: { year: number } | null } | null;

  const normalizedAssignments = (assignments ?? []).map((a) => {
    const teacher = a.teacher as unknown as TeacherRef;
    const term = a.term as unknown as TermRef;
    return {
      id: a.id as string,
      stream_id: a.stream_id as string,
      class_id: a.class_id as string,
      teacher_id: a.teacher_id as string,
      academic_year_id: a.academic_year_id as string,
      term_id: a.term_id as string,
      start_date: a.start_date as string,
      end_date: a.end_date as string | null,
      status: a.status as "active" | "ended" | "cancelled",
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown",
      termLabel: term ? `${term.term_number} ${term.academic_year?.year ?? ""}`.trim() : "-",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award size={20} /> Class Teachers
          </h1>
          <p className="text-sm text-gray-500">
            Assign teachers as class teachers for each stream, per academic year and term.
          </p>
        </div>
      </div>

      {!currentTerm ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          No current term is set for your school. Set one in Settings before assigning class teachers.
        </div>
      ) : (
        <ClassTeachersClient
          canManage={canManage}
          classes={classes ?? []}
          streams={(streams ?? []) as { id: string; name: string; class_id: string; class_teacher_id: string | null }[]}
          academicYears={(academicYears ?? []) as { id: string; year: number; terms: { id: string; term_number: string; is_current: boolean }[] }[]}
          teachers={(teacherProfiles ?? []).map((p) => ({
            staffId: p.staff_id as string,
            name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
            role: p.role as string,
          }))}
          currentTermId={currentTerm.id}
          currentAcademicYearId={currentYear!.id}
          assignments={normalizedAssignments}
        />
      )}
    </div>
  );
}
