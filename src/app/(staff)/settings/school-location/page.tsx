import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import SchoolLocationSettings from "@/components/SchoolLocationSettings";
import { redirect } from "next/navigation";

export default async function SchoolLocationPage() {
  const profile = await getProfileOrRedirect();

  /*
   * Only authorized school administrators
   * should configure the attendance geofence.
   *
   * Adjust these roles to match your actual
   * roles in the profiles table.
   */
  const allowedRoles = [
  "principal",
  "deputy_principal",
  "admin",
  "super_admin",
];

if (!allowedRoles.includes(profile.role)) {
  redirect("/dashboard");
}

  const supabase = await createClient();

  const { data: school, error } = await supabase
    .from("schools")
    .select(`
      id,
      latitude,
      longitude,
      geofence_radius_meters
    `)
    .eq("id", profile.school_id)
    .single();

  if (error || !school) {
  console.error("School location settings error:", {
    error,
    school,
    schoolId: profile.school_id,
    role: profile.role,
  });

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold text-red-600">
        Unable to load school settings
      </h1>

      <p className="text-sm text-red-500 mt-2">
        {error?.message ?? "School record was not found."}
      </p>

      <p className="text-xs text-gray-400 mt-2">
        School ID: {profile.school_id ?? "Missing"}
      </p>
    </div>
  );
}

  return (
    <SchoolLocationSettings
      schoolId={school.id}
      initialLatitude={school.latitude}
      initialLongitude={school.longitude}
      initialRadius={school.geofence_radius_meters}
    />
  );
}