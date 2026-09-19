import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import GuardianRequestsTable from "@/components/GuardianRequestsTable";
import AllParentsTable from "@/components/AllParentsTable";
import PendingVerificationsTable from "@/components/PendingVerificationsTable";

const ALLOWED_ROLES = ["principal", "deputy_principal", "super_admin"];

export default async function GuardianRequestsPage() {
  const profile = await getProfileOrRedirect();

  if (!ALLOWED_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

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

  // All parents already linked at this school, with their children.
  // Uses the admin client with an explicit nested school_id filter —
  // NOT the "guardians via student" RLS policy, which currently has an
  // unscoped bypass for staff roles (see note above). This keeps the
  // page correct regardless of that policy.
  const admin = createAdminClient();
  const { data: guardiansRaw } = await admin
    .from("guardians")
    .select(
      `
      id,
      full_name,
      phone_primary,
      phone_secondary,
      email,
      relationship,
      profile_id,
      student_guardians!inner (
        is_primary,
        fee_payer,
        can_pickup,
        is_verified,
        students!inner (
          id,
          first_name,
          last_name,
          admission_number,
          classes ( name )
        )
      )
      `
    )
    .eq("student_guardians.students.school_id", profile.school_id)
    .order("full_name");

  const parents = (guardiansRaw ?? []).map((g) => ({
    id: g.id,
    fullName: g.full_name,
    phonePrimary: g.phone_primary,
    phoneSecondary: g.phone_secondary,
    email: g.email,
    relationship: g.relationship,
    hasAccount: g.profile_id !== null,
    children: (g.student_guardians ?? []).map((sg: any) => ({
      studentId: sg.students.id,
      name: `${sg.students.first_name} ${sg.students.last_name}`,
      admissionNumber: sg.students.admission_number,
      className: sg.students.classes?.name ?? null,
      isPrimary: sg.is_primary,
      feePayer: sg.fee_payer,
      canPickup: sg.can_pickup,
      isVerified: sg.is_verified,
    })),
  }));

    // Guardian links created via the staff-member flow start as unverified by
  // design (admin_add_staff_guardian_link) and need an explicit verify step —
  // this is the one place that can still legitimately produce an unverified
  // link post-fix, so surface it instead of relying on someone remembering.
  const { data: pendingRaw } = await supabase
    .from("student_guardians")
    .select(
      `
      id,
      guardian:guardians(id, full_name, phone_primary, email, relationship, profile_id),
      student:students!inner(id, first_name, last_name, admission_number, school_id, classes(name))
      `
    )
    .eq("is_verified", false)
    .eq("student.school_id", profile.school_id);

  const pendingVerifications = (pendingRaw ?? []).map((row: any) => ({
    linkId: row.id,
    guardianName: row.guardian?.full_name ?? "Unknown",
    guardianPhone: row.guardian?.phone_primary ?? "",
    guardianEmail: row.guardian?.email ?? null,
    relationship: row.guardian?.relationship ?? null,
    hasAccount: !!row.guardian?.profile_id,
    studentName: `${row.student?.first_name ?? ""} ${row.student?.last_name ?? ""}`.trim(),
    admissionNumber: row.student?.admission_number ?? "",
    className: row.student?.classes?.name ?? null,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Parent Account Requests
        </h1>
        <p className="text-sm text-gray-500">
          Parents whose phone number didn&apos;t automatically match a
          student record. Verify the child before approving.
        </p>
        <div className="mt-4">
          <GuardianRequestsTable
            initialRequests={requests ?? []}
            schoolId={profile.school_id}
          />
        </div>
      </div>

            <div>
        <h2 className="text-xl font-bold text-gray-900">
          Pending Guardian Verifications
        </h2>
        <p className="text-sm text-gray-500">
          Links awaiting confirmation before the guardian can see this
          student on their own portal.
        </p>
        <div className="mt-4">
          <PendingVerificationsTable pendingVerifications={pendingVerifications} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900">All Parents</h2>
        <p className="text-sm text-gray-500">
          Every parent linked to a student at this school, and which
          children they&apos;re linked to.
        </p>
        <div className="mt-4">
          <AllParentsTable parents={parents} />
        </div>
      </div>
    </div>
  );
}