"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import { isTaskOverdue } from "@/lib/support-staff";
import { Loader2, MessageCircle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string;
};

const FILTERS = ["All", "Pending", "In Progress", "Completed"] as const;

export default function TasksClient({ tasks, unreadByTask = {} }: { tasks: Task[]; unreadByTask?: Record<string, number> }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${filter === f ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}
          >
            {f} ({f === "All" ? tasks.length : tasks.filter((t) => t.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No tasks here.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TaskCard key={t.id} task={t} unread={unreadByTask[t.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, unread }: { task: Task; unread: number }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const overdue = isTaskOverdue(task.status, task.due_date);

  async function updateStatus(status: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("staff_tasks")
      .update({ status, completed_at: status === "Completed" ? new Date().toISOString() : null })
      .eq("id", task.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link href={`/support-dashboard/tasks/${task.id}`} className="text-sm font-semibold text-gray-900 hover:text-eduke-green inline-flex items-center gap-2">
            {task.title}
            <MessageCircle size={14} className="text-gray-400" />
            {unread > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>
            )}
          </Link>
          {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={task.priority} />
            <StatusBadge status={overdue ? "Overdue" : task.status} />
            {task.due_date && <span className="text-xs text-gray-400">Due {formatDateDMY(task.due_date)}</span>}
          </div>
        </div>
        {task.status !== "Completed" && (
          <div className="flex gap-2 shrink-0">
            {task.status === "Pending" && (
              <button onClick={() => updateStatus("In Progress")} disabled={saving} className="text-xs font-medium text-eduke-green hover:underline disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin inline" /> : "Start"}
              </button>
            )}
            <button onClick={() => updateStatus("Completed")} disabled={saving} className="text-xs font-medium text-eduke-green hover:underline disabled:opacity-50">
              Mark Completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}