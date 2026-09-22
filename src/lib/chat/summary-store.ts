"use client";

import { useSyncExternalStore } from "react";
import type { ChatSummary } from "./types";

let state: ChatSummary = { unread_conversations: 0, unread_mentions: 0, pending_invites: 0 };
const listeners = new Set<() => void>();

export function setChatSummary(next: ChatSummary) {
  if (next.unread_conversations === state.unread_conversations && next.unread_mentions === state.unread_mentions && next.pending_invites === state.pending_invites) return;
  state = next;
  listeners.forEach((l) => l());
}

export function useChatSummary(): ChatSummary {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}

/** What the sidebar badge shows: chats with unread messages + invitations waiting. */
export const badgeCount = (s: ChatSummary) => s.unread_conversations + s.pending_invites;
