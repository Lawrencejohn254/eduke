import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import NewStudentForm from "./NewStudentForm";
import StudentRow from "./StudentRow";
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

  const canAdd = ["principal", "deputy_principal", "super_admin"].includes(profile.role);

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
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Admission No.</th>
                <th className="p-3">Name</th>
                <th className="p-3">Gender</th>
                <th className="p-3">Class</th>
                <th className="p-3">Stream</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const klass = s.class as unknown as { name: string } | null;
                const stream = s.stream as unknown as { name: string } | null;
                return (
                  <StudentRow
                    key={s.id}
                    id={s.id}
                    admissionNumber={s.admission_number}
                    firstName={s.first_name}
                    lastName={s.last_name}
                    gender={s.gender}
                    status={s.status}
                    streamId={s.stream_id}
                    dateOfBirth={s.date_of_birth}
                    kcpeIndex={s.kcpe_index}
                    nemisId={s.nemis_id}
                    previousSchool={s.previous_school}
                    className={klass?.name ?? "-"}
                    streamName={stream?.name ?? "-"}
                    streams={(streams ?? []) as never}
                    canEdit={canAdd}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        )
      )}
    </div>
  );
}
