import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import NoticesAdminClient from "./NoticesAdminClient";

const ADMIN_ROLES = ["principal", "deputy_principal", "super_admin"];

export default async function NoticesAdminPage() {
  const profile = await getProfileOrRedirect();
  if (!ADMIN_ROLES.includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: notices, error } = await supabase
    .from("notices")
    .select("id, title, message, audience, created_at, expires_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone size={20} /> Notices
        </h1>
        <p className="text-sm text-gray-500">Send school-wide or role/department-specific notices to staff.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load notices.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <NoticesAdminClient notices={notices ?? []} />
    </div>
  );
}