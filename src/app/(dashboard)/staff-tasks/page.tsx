import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { CheckSquare } from "lucide-react";
import StaffTasksAdminClient from "./StaffTasksAdminClient";

const ADMIN_ROLES = ["principal", "deputy_principal", "super_admin"];

export default async function StaffTasksAdminPage() {
  const profile = await getProfileOrRedirect();
  if (!ADMIN_ROLES.includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: tasks, error }, { data: staffList }] = await Promise.all([
    supabase
      .from("staff_tasks")
      .select("id, title, description, due_date, priority, status, created_at, staff:staff(first_name, last_name, role)")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("staff")
      .select("id, first_name, last_name, role")
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name"),
  ]);

  const taskIds = (tasks ?? []).map((t) => t.id);
  const [{ data: messages }, { data: reads }] = await Promise.all([
    taskIds.length > 0
      ? supabase.from("task_messages").select("task_id, sender_id, created_at").in("task_id", taskIds)
      : Promise.resolve({ data: [] }),
    taskIds.length > 0
      ? supabase.from("staff_task_reads").select("task_id, last_read_at").eq("profile_id", profile.id).in("task_id", taskIds)
      : Promise.resolve({ data: [] }),
  ]);

  const lastReadByTask = new Map((reads ?? []).map((r) => [r.task_id, r.last_read_at]));
  const unreadByTask: Record<string, number> = {};
  for (const m of messages ?? []) {
    if (m.sender_id === profile.id) continue;
    const lastRead = lastReadByTask.get(m.task_id);
    if (!lastRead || m.created_at > lastRead) {
      unreadByTask[m.task_id] = (unreadByTask[m.task_id] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare size={20} /> Staff Tasks
        </h1>
        <p className="text-sm text-gray-500">Assign and track tasks for support staff and other team members.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load tasks.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <StaffTasksAdminClient tasks={(tasks ?? []) as never} staffList={staffList ?? []} unreadByTask={unreadByTask} />
    </div>
  );
}