import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckSquare } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import TaskChatThread from "@/components/TaskChatThread";
import TaskStatusControls from "./TaskStatusControls";
import { formatDateDMY } from "@/lib/format";
import { isTaskOverdue } from "@/lib/support-staff";

export default async function SupportTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfileOrRedirect();
  if (
    profile.role !== "support_staff" &&
    !["principal", "deputy_principal", "super_admin"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { id } = await params;

  const { data: task } = await supabase
    .from("staff_tasks")
    .select("id, title, description, due_date, priority, status")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (!task) redirect("/support-dashboard/tasks");

  const [{ data: messages }, { data: admins }] = await Promise.all([
    supabase.from("task_messages").select("id, sender_id, body, created_at").eq("task_id", id).order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("school_id", profile.school_id)
      .in("role", ["principal", "deputy_principal", "super_admin"]),
  ]);

  const participants: Record<string, string> = {};
  for (const a of admins ?? []) {
    participants[a.id] = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Admin";
  }

  const overdue = isTaskOverdue(task.status, task.due_date);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/support-dashboard/tasks" className="text-xs font-medium text-eduke-green hover:underline flex items-center gap-1">
          <ArrowLeft size={13} /> Back to My Tasks
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mt-2">
          <CheckSquare size={20} /> {task.title}
        </h1>
        {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge status={task.priority} />
          <StatusBadge status={overdue ? "Overdue" : task.status} />
          {task.due_date && <span className="text-xs text-gray-400">Due {formatDateDMY(task.due_date)}</span>}
        </div>
      </div>

      <TaskStatusControls taskId={task.id} status={task.status} />

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