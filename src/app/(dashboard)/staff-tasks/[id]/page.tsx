import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import TaskChatThread from "@/components/TaskChatThread";
import { formatDateDMY } from "@/lib/format";
import { isTaskOverdue } from "@/lib/support-staff";

const ADMIN_ROLES = ["principal", "deputy_principal", "super_admin"];

export default async function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfileOrRedirect();
  if (!ADMIN_ROLES.includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const { id } = await params;

  const { data: taskRow } = await supabase
    .from("staff_tasks")
    .select("id, title, description, due_date, priority, status, staff:staff(first_name, last_name, role, profile_id)")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  // Supabase's generated types infer this embed as an array even though the
  // FK (staff_tasks.assigned_to -> staff.id) is to-one, so it always returns
  // a single object at runtime. Cast to the shape that actually comes back.
  const task = taskRow as unknown as {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: string;
    status: string;
    staff: { first_name: string; last_name: string; role: string | null; profile_id: string | null } | null;
  } | null;

  if (!task) redirect("/staff-tasks");

  const [{ data: messages }, { data: admins }] = await Promise.all([
    supabase.from("task_messages").select("id, sender_id, body, created_at").eq("task_id", id).order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, first_name, last_name").eq("school_id", profile.school_id).in("role", ADMIN_ROLES),
  ]);

  const participants: Record<string, string> = {};
  for (const a of admins ?? []) {
    participants[a.id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin";
  }
  if (task.staff?.profile_id) {
    participants[task.staff.profile_id] = `${task.staff.first_name} ${task.staff.last_name}`.trim();
  }

  const overdue = isTaskOverdue(task.status, task.due_date);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/staff-tasks" className="text-xs font-medium text-eduke-green hover:underline flex items-center gap-1">
          <ArrowLeft size={13} /> Back to Staff Tasks
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-2">
          <CheckSquare size={20} /> {task.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Assigned to {task.staff ? `${task.staff.first_name} ${task.staff.last_name}` : "-"}
        </p>
        {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={task.priority} />
          <StatusBadge status={overdue ? "Overdue" : task.status} />
          {task.due_date && <span className="text-xs text-gray-400">Due {formatDateDMY(task.due_date)}</span>}
        </div>
      </div>

      <TaskChatThread
        taskId={task.id}
        schoolId={profile.school_id}
        currentProfileId={profile.id}
        initialMessages={messages ?? []}
        participants={participants}
      />
    </div>
  );
}