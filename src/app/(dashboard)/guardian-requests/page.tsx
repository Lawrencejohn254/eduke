import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import GuardianRequestsTable from "@/components/GuardianRequestsTable";


export default async function GuardianRequestsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("guardian_link_requests")
    .select(
      `
      id,
      full_name,
      phone,
      email,
      relationship,
      student_full_name_hint,
      student_admission_number_hint,
      status,
      created_at
      `
    )
    .eq("school_id", profile.school_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Parent Account Requests
        </h1>

        <p className="text-sm text-gray-500">
          Parents whose phone number didn&apos;t automatically match a student
          record. Verify the child before approving.
        </p>
      </div>

      <GuardianRequestsTable
        initialRequests={requests ?? []}
        schoolId={profile.school_id}
      />
    </div>
  );
}