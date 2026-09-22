"use client";

import { useState } from "react";
import { AtSign, Check, MessageSquarePlus, Search, X } from "lucide-react";
import type { ChatInvite, ConversationSummary } from "@/lib/chat/types";
import { formatChatTime } from "@/lib/chat/format";
import { plainPreview } from "@/lib/chat/mentions";
import { roleLabel } from "@/lib/chat/roles";
import ChatAvatar from "./ChatAvatar";
import { conversationTitle } from "./Thread";

export default function ConversationList({
  conversations,
  invites,
  selectedId,
  meId,
  onSelect,
  onNew,
  onRespond,
  busyInvite,
}: {
  conversations: ConversationSummary[];
  invites: ChatInvite[];
  selectedId: string | null;
  meId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRespond: (inviteId: string, accept: boolean) => void;
  busyInvite: string | null;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const shown = q ? conversations.filter((c) => (conversationTitle(c) + " " + (c.last_body ?? "")).toLowerCase().includes(q)) : conversations;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 p-3">
        <h1 className="flex-1 px-1 text-lg font-bold text-gray-900">Chat</h1>
        <button type="button" onClick={onNew} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-eduke-green px-3 text-sm font-semibold text-white hover:bg-eduke-green-dark">
          <MessageSquarePlus size={16} aria-hidden /> New chat
        </button>
      </div>

      <div className="border-b border-gray-100 p-3">
        <label className="relative block">
          <span className="sr-only">Search chats</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="min-h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm focus:border-eduke-green focus:bg-white focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {invites.length > 0 ? (
          <section aria-label="Invitations" className="border-b border-amber-100 bg-amber-50/60 p-3">
            <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-bold text-amber-900">
              <AtSign size={14} aria-hidden /> You were tagged · {invites.length} {invites.length === 1 ? "invitation" : "invitations"}
            </h2>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li key={inv.invite_id} className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{inv.invited_by_name ?? "A colleague"}</span> tagged you in <span className="font-semibold">{inv.title ?? "a group"}</span>
                  </p>
                  {inv.message_body ? <p className="mt-1.5 line-clamp-3 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">{plainPreview(inv.message_body)}</p> : null}
                  <p className="mt-1.5 text-[11px] text-gray-500">
                    {inv.member_count} {inv.member_count === 1 ? "member" : "members"} · you&apos;ll see the chat from this message onward
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      disabled={busyInvite === inv.invite_id}
                      onClick={() => onRespond(inv.invite_id, true)}
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-eduke-green px-3 text-sm font-semibold text-white hover:bg-eduke-green-dark disabled:opacity-60"
                    >
                      <Check size={15} aria-hidden /> Join chat
                    </button>
                    <button
                      type="button"
                      disabled={busyInvite === inv.invite_id}
                      onClick={() => onRespond(inv.invite_id, false)}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    >
                      <X size={15} aria-hidden /> Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {shown.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-gray-700">{q ? "No chats match your search" : "No chats yet"}</p>
            {!q ? <p className="mt-1 text-xs text-gray-500">Start a direct message or create a group with your colleagues.</p> : null}
          </div>
        ) : (
          <ul>
            {shown.map((c) => {
              const title = conversationTitle(c);
              const selected = c.id === selectedId;
              const preview = c.last_body ? plainPreview(c.last_body) : "No messages yet";
              const who = c.last_sender_id === meId ? "You" : c.kind === "group" ? (c.last_sender_name?.split(" ")[0] ?? "") : "";
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={selected ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 ${selected ? "bg-eduke-green/5" : ""}`}
                  >
                    <ChatAvatar name={title} photo={c.other_photo} group={c.kind === "group"} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${c.unread_count > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>{title}</span>
                        <span className="shrink-0 text-[11px] text-gray-400" suppressHydrationWarning>
                          {formatChatTime(c.last_message_at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`min-w-0 flex-1 truncate text-xs ${c.unread_count > 0 ? "font-medium text-gray-800" : "text-gray-500"}`}>
                          {c.kind === "direct" && !c.last_body ? roleLabel(c.other_role) : `${who ? `${who}: ` : ""}${preview}`}
                        </span>
                        {c.unread_mentions > 0 ? (
                          <span title="You were tagged" className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-amber-950">
                            <AtSign size={11} aria-hidden />
                            <span className="sr-only">You were tagged</span>
                          </span>
                        ) : null}
                        {c.unread_count > 0 ? (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-eduke-green px-1.5 text-[11px] font-bold text-white">
                            {c.unread_count > 99 ? "99+" : c.unread_count}
                            <span className="sr-only"> unread</span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
