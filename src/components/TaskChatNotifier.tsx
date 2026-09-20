"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { playNotificationSound } from "@/lib/notification-sound";
import { MessageCircle, X } from "lucide-react";

type Toast = { id: string; text: string; href: string };

export default function TaskChatNotifier({
  profileId,
  schoolId,
  role,
  staffId,
}: {
  profileId: string;
  schoolId: string;
  role: string;
  staffId: string | null;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  const isAdmin = ["principal", "deputy_principal", "super_admin"].includes(role);
  const myTaskIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadMyTaskIds() {
      if (isAdmin) {
        myTaskIdsRef.current = null; // null = "all school tasks" (RLS already scopes what actually arrives)
        return;
      }
      if (!staffId) {
        myTaskIdsRef.current = new Set();
        return;
      }
      const { data } = await supabase.from("staff_tasks").select("id").eq("assigned_to", staffId);
      if (!cancelled) myTaskIdsRef.current = new Set((data ?? []).map((t) => t.id));
    }
    loadMyTaskIds();

    const channel = supabase
      .channel(`task_messages_notify:${profileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_messages", filter: `school_id=eq.${schoolId}` },
        async (payload) => {
          const row = payload.new as { id: string; task_id: string; sender_id: string; body: string };
          if (row.sender_id === profileId) return;
          if (myTaskIdsRef.current && !myTaskIdsRef.current.has(row.task_id)) return;

          const { data: task } = await supabase.from("staff_tasks").select("title").eq("id", row.task_id).maybeSingle();
          const { data: sender } = await supabase.from("profiles").select("first_name, last_name").eq("id", row.sender_id).maybeSingle();
          const senderName = sender ? `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim() : "Someone";
          const href = isAdmin ? `/staff-tasks/${row.task_id}` : `/support-dashboard/tasks/${row.task_id}`;

          playNotificationSound();
          const toastId = row.id;
          setToasts((prev) => [...prev, { id: toastId, text: `${senderName} replied on "${task?.title ?? "a task"}"`, href }]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 8000);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, schoolId, role, staffId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-full max-w-xs">
      {toasts.map((t) => (
        <div key={t.id} className="bg-white shadow-lg border border-gray-200 rounded-xl p-3 flex items-start gap-2">
          <MessageCircle size={16} className="text-eduke-green mt-0.5 shrink-0" />
          <button
            onClick={() => {
              setToasts((prev) => prev.filter((x) => x.id !== t.id));
              router.push(t.href);
            }}
            className="text-sm text-gray-800 text-left flex-1 hover:underline"
          >
            {t.text}
          </button>
          <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}