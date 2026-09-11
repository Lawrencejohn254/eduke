import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import NewStudentForm from "./NewStudentForm";
import StudentsTable from "./StudentsTable";
import Link from "next/link";
import { ArrowUpCircle } from "lucide-react";

export default async function StudentsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, admission_number, first_name, last_name, gender, status, stream_id, date_of_birth, kcpe_index, nemis_id, previous_school, class:classes(name), stream:streams(name)")
    .eq("school_id", profile.school_id)
    .order("first_name");

  const { data: streams } = await supabase
    .from("streams")
    .select("id, name, class:classes(id, name)")
    .order("name");

  const isAdminTier = ["principal", "deputy_principal", "super_admin"].includes(profile.role);
  const isTeacherEnrollmentOpen =
    profile.role === "teacher" && (profile.school?.student_enrollment_enabled ?? false);

  const canAdd = isAdminTier || isTeacherEnrollmentOpen;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Students (Wanafunzi)</h1>
          <p className="text-sm text-gray-500">{students?.length ?? 0} students enrolled</p>
        </div>
        <div className="flex gap-2">
          {canAdd && (
            <Link href="/students/promotions" className="flex items-center gap-1.5 bg-white border border-gray-200 text-sm font-medium px-3 py-2 rounded-lg hover:border-eduke-green transition-colors">
              <ArrowUpCircle size={15} /> Promotions
            </Link>
          )}
          {canAdd && <NewStudentForm streams={(streams ?? []) as never} schoolId={profile.school_id} />}
        </div>
      </div>

      {studentsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load students.</p>
          <p className="mt-1 font-mono text-xs">{studentsError.message}</p>
        </div>
      )}

      {!studentsError && (!students || students.length === 0) ? (
        <EmptyState title="No students yet" description="Add your first student to get started." />
      ) : (
        students && students.length > 0 && (
          <StudentsTable
            students={students as never}
            streams={streams ?? []}
            canEdit={canAdd}
          />
        )
      )}
    </div>
  );
}