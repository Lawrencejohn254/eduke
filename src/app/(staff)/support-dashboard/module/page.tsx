import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { LifeBuoy } from "lucide-react";
import { moduleForDepartment } from "@/lib/support-staff";
import DepartmentLogClient from "./DepartmentLogClient";

export default async function SupportModulePage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("department")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const department = staffRecord?.department ?? null;
  const moduleInfo = moduleForDepartment(department);

  const { data: entries, error } = department
    ? await supabase
        .from("department_logs")
        .select("id, entry, created_at, logged_by, profile:profiles!department_logs_logged_by_fkey(first_name, last_name)")
        .eq("school_id", profile.school_id)
        .eq("department", department)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <LifeBuoy size={20} /> {moduleInfo.label}
        </h1>
        <p className="text-sm text-gray-500">{moduleInfo.description}</p>
      </div>

      {!department ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            No department is set on your staff record yet. Ask your principal to assign one from Staff → your profile.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <p className="font-semibold">Could not load the log.</p>
              <p className="mt-1 font-mono text-xs">{error.message}</p>
            </div>
          )}
          <DepartmentLogClient
            department={department}
            schoolId={profile.school_id}
            profileId={profile.id}
            entries={(entries ?? []) as never}
          />
        </>
      )}
    </div>
  );
}