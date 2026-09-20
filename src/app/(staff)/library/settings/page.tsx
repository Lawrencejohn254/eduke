import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import LibrarySettingsForm from "./LibrarySettingsForm";
import { canManageLibrary } from "@/lib/library";

export default async function LibrarySettingsPage() {
  const profile = await getProfileOrRedirect();
  if (!canManageLibrary(profile.role)) redirect("/library");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("library_settings")
    .select("default_loan_days")
    .eq("school_id", profile.school_id)
    .maybeSingle();

  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={20} /> Library Settings
        </h1>
        <p className="text-sm text-gray-500">Defaults used across the library module.</p>
      </div>

      <LibrarySettingsForm
        schoolId={profile.school_id}
        defaultLoanDays={settings?.default_loan_days ?? 14}
      />
    </div>
  );
}