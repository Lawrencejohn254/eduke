import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatApi, ChatInvite, ChatMember, ChatMessage, ChatSummary, ConversationSummary, DirectoryEntry } from "./types";

const PAGE = 40;

/** Thin wrapper over the staff_chat_* database functions. All authorisation happens in the database. */
export function supabaseChatApi(supabase: SupabaseClient): ChatApi {
  async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }

  return {
    directory: () => rpc<DirectoryEntry[]>("staff_chat_directory").then((r) => r ?? []),
    conversations: () => rpc<ConversationSummary[]>("staff_chat_conversations").then((r) => r ?? []),
    invites: () => rpc<ChatInvite[]>("staff_chat_my_invites").then((r) => r ?? []),
    summary: async () => {
      const rows = await rpc<ChatSummary[]>("staff_chat_summary");
      return rows?.[0] ?? { unread_conversations: 0, unread_mentions: 0, pending_invites: 0 };
    },
    async messages(conversationId, before) {
      // Row level security already limits this to what the caller is allowed to see (from their join point onward).
      let q = supabase.from("staff_chat_messages").select("id, conversation_id, sender_id, body, created_at").eq("conversation_id", conversationId);
      if (before) q = q.lt("created_at", before);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(PAGE + 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as ChatMessage[];
      return { messages: rows.slice(0, PAGE).reverse(), hasMore: rows.length > PAGE };
    },
    members: (id) => rpc<ChatMember[]>("staff_chat_members_of", { p_conv: id }).then((r) => r ?? []),
    async send(conversationId, body) {
      const rows = await rpc<{ id: string; created_at: string }[]>("staff_chat_send", { p_conv: conversationId, p_body: body });
      return rows[0];
    },
    async markRead(id) {
      await rpc("staff_chat_mark_read", { p_conv: id });
    },
    createDirect: (otherId) => rpc<string>("staff_chat_create_direct", { p_other: otherId }),
    createGroup: (title, memberIds) => rpc<string>("staff_chat_create_group", { p_title: title, p_members: memberIds }),
    addMembers: (id, ids, shareHistory) => rpc<number>("staff_chat_add_members", { p_conv: id, p_members: ids, p_share_history: shareHistory }),
    async rename(id, title) {
      await rpc("staff_chat_rename", { p_conv: id, p_title: title });
    },
    async leave(id) {
      await rpc("staff_chat_leave", { p_conv: id });
    },
    respondInvite: (inviteId, accept) => rpc<string | null>("staff_chat_respond_invite", { p_invite: inviteId, p_accept: accept }),
  };
}
