"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, MessageCircle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  staff: { first_name: string; last_name: string; role: string | null } | null;
};
type StaffOption = { id: string; first_name: string; last_name: string; role: string | null };

export default function StaffTasksAdminClient({
  tasks,
  staffList,
  unreadByTask,
}: {
  tasks: Task[];
  staffList: StaffOption[];
  unreadByTask: Record<string, number>;
}) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-3">
      <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
        <Plus size={15} /> Assign Task
      </button>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No tasks assigned yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Task</th>
                <th className="p-3">Assigned To</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Due</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const unread = unreadByTask[t.id] ?? 0;
                return (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      <Link href={`/staff-tasks/${t.id}`} className="hover:text-eduke-green inline-flex items-center gap-2">
                        {t.title}
                        <MessageCircle size={13} className="text-gray-400" />
                        {unread > 0 && (
                          <span className="bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unread}</span>
                        )}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-600">{t.staff ? `${t.staff.first_name} ${t.staff.last_name}` : "-"}</td>
                    <td className="p-3">
                      <StatusBadge status={t.priority} />
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{t.due_date ? formatDateDMY(t.due_date) : "-"}</td>
                    <td className="p-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <TaskForm staffList={staffList} onClose={() => setShowForm(false)} />}
    </div>
  );

  function TaskForm({ staffList, onClose }: { staffList: StaffOption[]; onClose: () => void }) {
    const [assignedTo, setAssignedTo] = useState(staffList[0]?.id ?? "");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: staffRow } = await supabase.from("staff").select("school_id").eq("id", assignedTo).maybeSingle();
      if (!staffRow) {
        setSaving(false);
        setError("Could not find that staff member.");
        return;
      }

      const { error: insertError } = await supabase.from("staff_tasks").insert({
        school_id: staffRow.school_id,
        assigned_to: assignedTo,
        assigned_by: user?.id ?? null,
        title,
        description: description || null,
        due_date: dueDate || null,
        priority,
        status: "Pending",
      });
      setSaving(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
      onClose();
      router.refresh();
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Assign Task</h2>
            <button onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                  {s.role ? ` — ${s.role}` : ""}
                </option>
              ))}
            </select>
            <input required placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Assign Task
            </button>
          </form>
        </div>
      </div>
    );
  }
}