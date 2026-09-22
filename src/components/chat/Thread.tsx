"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, LoaderCircle, TriangleAlert, Users } from "lucide-react";
import type { ChatMessage, ConversationSummary, DirectoryEntry } from "@/lib/chat/types";
import { formatDayLabel, timeOnly } from "@/lib/chat/format";
import { cleanName, roleLabel, roleTone } from "@/lib/chat/roles";
import ChatAvatar from "./ChatAvatar";
import Composer from "./Composer";
import MessageBody from "./MessageBody";

export function conversationTitle(c: Pick<ConversationSummary, "kind" | "title" | "other_name">): string {
  return c.kind === "group" ? (c.title ?? "Group chat") : (c.other_name ?? "Chat");
}

export default function Thread({
  conv,
  messages,
  loading,
  hasMore,
  loadingMore,
  directory,
  dirMap,
  meId,
  memberIds,
  onSend,
  onRetry,
  onLoadMore,
  onBack,
  onOpenMembers,
}: {
  conv: ConversationSummary;
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  directory: DirectoryEntry[];
  dirMap: Map<string, DirectoryEntry>;
  meId: string;
  memberIds: Set<string> | null;
  onSend: (body: string) => Promise<void>;
  onRetry: (m: ChatMessage) => void;
  onLoadMore: () => void;
  onBack: () => void;
  onOpenMembers: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const title = conversationTitle(conv);
  const lastId = messages[messages.length - 1]?.id;

  // Keep the newest message in view, unless the reader has scrolled up to read older ones.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId, loading]);

  const sub = conv.kind === "group" ? `${conv.member_count} ${conv.member_count === 1 ? "member" : "members"}` : roleLabel(conv.other_role);

  return (
    <section className="flex h-full min-h-0 flex-col bg-white" aria-label={`Chat with ${title}`}>
      <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 sm:px-4">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden">
          <ArrowLeft size={20} />
        </button>
        <ChatAvatar name={title} photo={conv.other_photo} group={conv.kind === "group"} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-gray-900">{title}</h2>
          <p className="truncate text-xs text-gray-500">{sub}</p>
        </div>
        <button type="button" onClick={onOpenMembers} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Users size={16} aria-hidden /> <span className="hidden sm:inline">{conv.kind === "group" ? "Members" : "Details"}</span>
        </button>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {hasMore ? (
          <div className="mb-3 text-center">
            <button type="button" onClick={onLoadMore} disabled={loadingMore} className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              {loadingMore ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <LoaderCircle className="animate-spin" aria-label="Loading messages" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">No messages yet. Say hello 👋</p>
        ) : (
          <ol className="space-y-3">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              const mine = m.sender_id === meId;
              const person = m.sender_id ? dirMap.get(m.sender_id) : undefined;
              const name = m.sender_id ? (person ? cleanName(person.first_name, person.last_name) : "Staff member") : "Former staff";
              return (
                <li key={m.id}>
                  {newDay ? (
                    <div className="my-3 flex items-center gap-3 text-[11px] font-medium text-gray-400" role="separator">
                      <span className="h-px flex-1 bg-gray-200" />
                      <span suppressHydrationWarning>{formatDayLabel(m.created_at)}</span>
                      <span className="h-px flex-1 bg-gray-200" />
                    </div>
                  ) : null}
                  <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    {!mine ? <ChatAvatar name={name} photo={person?.photo_url} size={32} /> : null}
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[70%] ${mine ? "rounded-br-md bg-eduke-green text-white" : "rounded-bl-md border border-gray-100 bg-white text-gray-900 shadow-sm"} ${m.failed ? "ring-2 ring-red-300" : ""}`}>
                      <p className={`mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${mine ? "text-white/85" : "text-gray-500"}`}>
                        <span className={`font-semibold ${mine ? "text-white" : "text-gray-900"}`}>{name}</span>
                        {person ? <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${mine ? "bg-white/20 text-white" : roleTone(person.role)}`}>{roleLabel(person.role)}</span> : null}
                        <time dateTime={m.created_at} suppressHydrationWarning>
                          {m.pending ? "Sending…" : timeOnly(m.created_at)}
                        </time>
                      </p>
                      <MessageBody body={m.body} directory={dirMap} meId={meId} mine={mine} />
                      {m.failed ? (
                        <button type="button" onClick={() => onRetry(m)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-red-100 underline">
                          <TriangleAlert size={12} /> Not sent — tap to retry
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Composer directory={directory} memberIds={memberIds} kind={conv.kind} onSend={onSend} />
    </section>
  );
}
