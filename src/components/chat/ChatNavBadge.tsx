"use client";

import { badgeCount, useChatSummary } from "@/lib/chat/summary-store";

/** Unread chats + waiting invitations, shown beside "Chat" in the sidebar. */
export default function ChatNavBadge() {
  const s = useChatSummary();
  const n = badgeCount(s);
  if (n <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-eduke-gold px-1.5 text-[11px] font-bold text-eduke-green-dark">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> unread chats or invitations{s.unread_mentions > 0 ? `, ${s.unread_mentions} tagging you` : ""}</span>
    </span>
  );
}
