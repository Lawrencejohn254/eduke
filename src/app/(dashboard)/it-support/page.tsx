import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Laptop } from "lucide-react";
import ItSupportClient from "./ItSupportClient";

const ADMIN_ROLES = ["principal", "deputy_principal", "super_admin"];

export default async function ItSupportPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("department")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const isIct = staffRecord?.department === "ICT Support" || ADMIN_ROLES.includes(profile.role);

  const ticketsQuery = supabase
    .from("it_tickets")
    .select(
      "id, title, description, category, priority, status, raised_by, assigned_to, created_at, resolved_at, raiser:profiles(first_name, last_name), assignee:staff(first_name, last_name)"
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false });

  const { data: tickets, error } = isIct ? await ticketsQuery : await ticketsQuery.eq("raised_by", profile.id);

  const { data: ictStaff } = isIct
    ? await supabase
        .from("staff")
        .select("id, first_name, last_name")
        .eq("school_id", profile.school_id)
        .eq("department", "ICT Support")
        .eq("status", "Active")
        .order("first_name")
    : { data: [] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Laptop size={20} /> IT Support Internal
        </h1>
        <p className="text-sm text-gray-500">
          {isIct ? "All IT support tickets for the school." : "Report a technical issue and track your requests."}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load tickets.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <ItSupportClient schoolId={profile.school_id} profileId={profile.id} isIct={isIct} tickets={(tickets ?? []) as never} ictStaff={ictStaff ?? []} />
    </div>
  );
}