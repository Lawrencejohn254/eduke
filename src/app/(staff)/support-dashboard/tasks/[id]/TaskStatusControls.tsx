"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function TaskStatusControls({ taskId, status }: { taskId: string; status: string }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  if (status === "Completed") return null;

  async function updateStatus(newStatus: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("staff_tasks")
      .update({ status: newStatus, completed_at: newStatus === "Completed" ? new Date().toISOString() : null })
      .eq("id", taskId);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "Pending" && (
        <button
          onClick={() => updateStatus("In Progress")}
          disabled={saving}
          className="text-xs font-medium bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <Loader2 size={13} className="animate-spin" />} Start Task
        </button>
      )}
      <button
        onClick={() => updateStatus("Completed")}
        disabled={saving}
        className="text-xs font-medium bg-eduke-green text-white px-3 py-2 rounded-lg hover:bg-eduke-green-dark disabled:opacity-50 flex items-center gap-1.5"
      >
        {saving && <Loader2 size={13} className="animate-spin" />} Mark Completed
      </button>
    </div>
  );
}