import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Megaphone } from "lucide-react";
import CommunicationsClient from "./CommunicationsClient";

export default async function CommunicationsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: classes } = await supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name");
  const { data: streams } = await supabase
    .from("streams")
    .select("id, name, class:classes!inner(id, name, school_id)")
    .eq("class.school_id", profile.school_id)
    .order("name");
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number")
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .order("first_name");

  const { data: templates } = await supabase
  .from("communication_templates")
  .select("id, name, communication_type, body, created_at")
  .eq("school_id", profile.school_id)
  .order("name");

  const { data: history } = await supabase
    .from("notifications")
    .select("id, subject, message, target_type, communication_type, recipient_count, status, sent_at, scheduled_for, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone size={20} /> Communications
        </h1>
        <p className="text-sm text-gray-500">
          Send SMS announcements to parents, targeted by class, stream, or an individual student. Absence alerts and fee reminders are still sent automatically from Attendance and Fee Defaulters.
        </p>
      </div>

      <CommunicationsClient
      classes={classes ?? []}
      streams={(streams ?? []) as never}
      students={students ?? []}
      history={history ?? []}
      templates={templates ?? []}
      canManageTemplates={["principal", "deputy_principal", "super_admin"].includes(profile.role)}
    />
    </div>
  );
}
