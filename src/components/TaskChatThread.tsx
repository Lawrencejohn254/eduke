"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2 } from "lucide-react";

type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function TaskChatThread({
  taskId,
  schoolId,
  currentProfileId,
  initialMessages,
  participants,
}: {
  taskId: string;
  schoolId: string;
  currentProfileId: string;
  initialMessages: Message[];
  participants: Record<string, string>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    supabase.from("staff_task_reads").upsert(
      { task_id: taskId, profile_id: currentProfileId, last_read_at: new Date().toISOString() },
      { onConflict: "task_id,profile_id" }
    );

    const channel = supabase
      .channel(`task_messages:${taskId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_messages", filter: `task_id=eq.${taskId}` },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (row.sender_id !== currentProfileId) {
            supabase.from("staff_task_reads").upsert(
              { task_id: taskId, profile_id: currentProfileId, last_read_at: new Date().toISOString() },
              { onConflict: "task_id,profile_id" }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const supabase = supabaseRef.current;
    const body = draft.trim();
    const { error } = await supabase.from("task_messages").insert({
      task_id: taskId,
      school_id: schoolId,
      sender_id: currentProfileId,
      body,
    });
    setSending(false);
    if (!error) setDraft("");
  }

  function nameFor(id: string) {
    if (id === currentProfileId) return "You";
    return participants[id] ?? "Staff";
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col h-[480px]">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Task Discussion</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No messages yet — start the conversation below.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentProfileId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? "bg-eduke-green text-white" : "bg-gray-100 text-gray-900"}`}>
                  {!mine && <p className="text-[11px] font-semibold text-eduke-green mb-0.5">{nameFor(m.sender_id)}</p>}
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-gray-400"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={sending || !draft.trim()} className="bg-eduke-green text-white rounded-lg px-3 disabled:opacity-50">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}