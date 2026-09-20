import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Bell } from "lucide-react";
import { buildNotifications, isTaskOverdue } from "@/lib/support-staff";

export default async function SupportNotificationsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const [{ data: notices }, { data: tasks }] = await Promise.all([
    supabase
      .from("notices")
      .select("id, title, created_at")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false })
      .limit(20),
    staffRecord
      ? supabase.from("staff_tasks").select("id, title, due_date, status, created_at").eq("assigned_to", staffRecord.id)
      : Promise.resolve({ data: [] }),
  ]);

  const overdueTasks = (tasks ?? []).filter((t) => isTaskOverdue(t.status, t.due_date));
  const notifications = buildNotifications(notices ?? [], overdueTasks);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bell size={20} /> Notifications
        </h1>
        <p className="text-sm text-gray-500">Recent notices and task alerts relevant to you.</p>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">Nothing new.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {notifications.map((n) => (
            <div key={n.key} className="p-3 text-sm text-gray-700">
              {n.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}