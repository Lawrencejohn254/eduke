export type DirectoryEntry = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  photo_url: string | null;
  department: string | null;
  active: boolean;
  is_me: boolean;
};

export type ConversationSummary = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  last_message_at: string;
  created_at: string;
  member_count: number;
  unread_count: number;
  unread_mentions: number;
  last_body: string | null;
  last_sender_id: string | null;
  last_sender_name: string | null;
  other_id: string | null;
  other_name: string | null;
  other_role: string | null;
  other_photo: string | null;
  my_member_role: "admin" | "member";
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  /** client-only: message is still being sent / failed */
  pending?: boolean;
  failed?: boolean;
};

export type ChatInvite = {
  invite_id: string;
  conversation_id: string;
  title: string | null;
  invited_by_id: string | null;
  invited_by_name: string | null;
  message_body: string | null;
  invited_at: string;
  member_count: number;
};

export type ChatMember = {
  profile_id: string;
  first_name: string;
  last_name: string;
  role: string;
  photo_url: string | null;
  member_role: "admin" | "member";
  joined_at: string;
};

export type ChatSummary = { unread_conversations: number; unread_mentions: number; pending_invites: number };

/** Everything the chat UI needs from the backend. Real implementation: lib/chat/api.ts. */
export interface ChatApi {
  directory(): Promise<DirectoryEntry[]>;
  conversations(): Promise<ConversationSummary[]>;
  invites(): Promise<ChatInvite[]>;
  summary(): Promise<ChatSummary>;
  /** oldest → newest; pass `before` (ISO time) to page further back */
  messages(conversationId: string, before?: string): Promise<{ messages: ChatMessage[]; hasMore: boolean }>;
  members(conversationId: string): Promise<ChatMember[]>;
  send(conversationId: string, body: string): Promise<{ id: string; created_at: string }>;
  markRead(conversationId: string): Promise<void>;
  createDirect(otherId: string): Promise<string>;
  createGroup(title: string, memberIds: string[]): Promise<string>;
  addMembers(conversationId: string, memberIds: string[], shareHistory: boolean): Promise<number>;
  rename(conversationId: string, title: string): Promise<void>;
  leave(conversationId: string): Promise<void>;
  respondInvite(inviteId: string, accept: boolean): Promise<string | null>;
}
