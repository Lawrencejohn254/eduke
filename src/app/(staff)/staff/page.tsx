import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import NewStaffForm from "./NewStaffForm";
import StaffList from "./StaffList";

export default async function StaffPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select(`
      id,
      staff_number,
      first_name,
      last_name,
      role,
      department,
      phone,
      status,
      gender,
      email,
      tsc_number,
      national_id,
      kra_pin,
      nhif_number,
      nssf_number,
      contract_type,
      date_joined,
      basic_salary
    `)
    .eq("school_id", profile.school_id)
    .order("first_name");

  const canManageStaff = [
    "principal",
    "deputy_principal",
    "super_admin",
  ].includes(profile.role);

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Staff
          </h1>

          <p className="text-sm text-gray-500">
            {staff?.length ?? 0} staff members
          </p>
        </div>

        {canManageStaff && (
          <NewStaffForm schoolId={profile.school_id} />
        )}
      </div>

      {/* ERROR */}
      {staffError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">
            Could not load staff.
          </p>

          <p className="mt-1 font-mono text-xs">
            {staffError.message}
          </p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!staff || staff.length === 0 ? (
        <EmptyState
          title="No staff yet"
          description="Add your first staff member to get started."
        />
      ) : (
        <StaffList
          staff={staff}
          canEdit={canManageStaff}
        />
      )}
    </div>
  );
}