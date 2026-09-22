"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, MessageCircle, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseChatApi } from "@/lib/chat/api";
import { emitChat } from "@/lib/chat/events";
import { mentionedIds, plainPreview } from "@/lib/chat/mentions";
import { cleanName } from "@/lib/chat/roles";
import { setChatSummary } from "@/lib/chat/summary-store";
import type { ChatMessage, DirectoryEntry } from "@/lib/chat/types";
import { playNotificationSound } from "@/lib/notification-sound";

type Toast = { id: string; text: string; href: string; kind: "mention" | "invite" | "dm" };

/**
 * The ONE realtime connection for staff chat, mounted in the staff layouts.
 *  • keeps the sidebar badge current,
 *  • tells the open chat page about new messages / invitations,
 *  • pops a toast (and plays the existing notification sound) when someone tags you, invites you to a
 *    chat, or sends you a direct message. Ordinary group messages only move the badge.
 * If the chat migration has not been installed, it stays silent.
 */
export default function StaffChatNotifier({ profileId }: { profileId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();
  const directory = useRef<Map<string, DirectoryEntry>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    const api = supabaseChatApi(supabase);
    const me = profileId.toLowerCase();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refreshSummary = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => api.summary().then((s) => !cancelled && setChatSummary(s), () => undefined), 250);
    };

    const nameOf = async (id: string | null): Promise<string> => {
      if (!id) return "A colleague";
      if (!directory.current.has(id)) {
        try {
          directory.current = new Map((await api.directory()).map((p) => [p.id, p]));
        } catch {
          /* fall through */
        }
      }
      const p = directory.current.get(id);
      return p ? cleanName(p.first_name, p.last_name) : "A colleague";
    };

    const pushToast = (t: Toast) => {
      playNotificationSound();
      setToasts((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]));
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 9000);
    };

    const chatIsOpen = (convId: string) =>
      document.visibilityState === "visible" && window.location.pathname.startsWith("/chat") && new URLSearchParams(window.location.search).get("c") === convId;

    (async () => {
      let summary;
      try {
        summary = await api.summary(); // fails harmlessly if chat isn't installed for this account
      } catch {
        return;
      }
      if (cancelled) return;
      setChatSummary(summary);
      void nameOf(null);

      channel = supabase
        .channel(`staffchat:${profileId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_chat_messages" }, async (payload) => {
          const row = payload.new as ChatMessage;
          emitChat("message", row);
          refreshSummary();
          if (row.sender_id === profileId || chatIsOpen(row.conversation_id)) return;

          const sender = await nameOf(row.sender_id);
          if (mentionedIds(row.body).includes(me)) {
            const { data } = await supabase.from("staff_chat_conversations").select("title, kind").eq("id", row.conversation_id).maybeSingle();
            pushToast({ id: row.id, kind: "mention", text: `${sender} tagged you${data?.kind === "group" && data.title ? ` in "${data.title}"` : ""}: ${plainPreview(row.body).slice(0, 80)}`, href: `/chat?c=${row.conversation_id}` });
            return;
          }
          const { data: conv } = await supabase.from("staff_chat_conversations").select("kind").eq("id", row.conversation_id).maybeSingle();
          if (conv?.kind === "direct") pushToast({ id: row.id, kind: "dm", text: `${sender}: ${plainPreview(row.body).slice(0, 90)}`, href: `/chat?c=${row.conversation_id}` });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "staff_chat_invites", filter: `invitee_id=eq.${profileId}` }, async (payload) => {
          const row = payload.new as { id: string; status: string };
          emitChat("invite", row);
          refreshSummary();
          if (row.status !== "pending") return;
          try {
            const inv = (await api.invites()).find((i) => i.invite_id === row.id);
            if (inv) pushToast({ id: `inv-${row.id}`, kind: "invite", text: `${inv.invited_by_name ?? "A colleague"} tagged you in "${inv.title ?? "a group"}" — tap to join`, href: "/chat" });
          } catch {
            /* the badge and the invitation card still update */
          }
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_chat_members", filter: `profile_id=eq.${profileId}` }, () => {
          emitChat("membership");
          refreshSummary();
        })
        .subscribe();
    })();

    const onFocus = () => refreshSummary();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [profileId]);

  if (toasts.length === 0) return null;

  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[100] w-full max-w-sm space-y-2 px-4 sm:px-0">
      {toasts.map((t) => {
        const Icon = t.kind === "mention" ? AtSign : t.kind === "invite" ? UserPlus : MessageCircle;
        return (
          <div key={t.id} className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${t.kind === "dm" ? "bg-eduke-green/10 text-eduke-green" : "bg-amber-100 text-amber-800"}`}>
              <Icon size={15} aria-hidden />
            </span>
            <button
              type="button"
              onClick={() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
                router.push(t.href);
              }}
              className="flex-1 text-left text-sm text-gray-800 hover:underline"
            >
              {t.text}
            </button>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="shrink-0 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
