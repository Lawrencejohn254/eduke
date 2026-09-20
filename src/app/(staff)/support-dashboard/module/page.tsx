import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { LifeBuoy } from "lucide-react";
import { moduleForDepartment } from "@/lib/support-staff";

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

  const moduleInfo = moduleForDepartment(staffRecord?.department ?? null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <LifeBuoy size={20} /> {moduleInfo.label}
        </h1>
        <p className="text-sm text-gray-500">{moduleInfo.description}</p>
      </div>
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-sm text-gray-500">
          The dedicated {moduleInfo.label} tools for your department are the next phase to build.
          For now, use My Tasks and School Notices for day-to-day work.
        </p>
      </div>
    </div>
  );
}