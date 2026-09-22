"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessagesSquare, TriangleAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseChatApi } from "@/lib/chat/api";
import { onChat } from "@/lib/chat/events";
import { setChatSummary } from "@/lib/chat/summary-store";
import type { ChatApi, ChatInvite, ChatMessage, ConversationSummary, DirectoryEntry } from "@/lib/chat/types";
import ConversationList from "./ConversationList";
import MembersPanel from "./MembersPanel";
import NewChatDialog from "./NewChatDialog";
import Thread from "./Thread";

export type ChatInitial = { conversations: ConversationSummary[]; invites: ChatInvite[]; directory: DirectoryEntry[] };

export default function ChatApp({ meId, initial, api: injected }: { meId: string; initial: ChatInitial; api?: ChatApi }) {
  const api = useMemo(() => injected ?? supabaseChatApi(createClient()), [injected]);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const selectedId = search.get("c");

  const [conversations, setConversations] = useState(initial.conversations);
  const [invites, setInvites] = useState(initial.invites);
  const [directory, setDirectory] = useState(initial.directory);
  const [thread, setThread] = useState<{ convId: string | null; messages: ChatMessage[]; hasMore: boolean }>({ convId: null, messages: [], hasMore: false });
  const [membersInfo, setMembersInfo] = useState<{ convId: string; ids: Set<string> } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busyInvite, setBusyInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirMap = useMemo(() => new Map(directory.map((p) => [p.id, p])), [directory]);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const loading = !!selectedId && thread.convId !== selectedId;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirRefreshed = useRef(false);

  const fail = useCallback((e: unknown, fallback: string) => setError(e instanceof Error ? e.message : fallback), []);

  const refreshSummary = useCallback(() => {
    api.summary().then(setChatSummary, () => undefined);
  }, [api]);

  /** Re-reads the chat list + invitations (debounced, so a burst of events costs one round trip). */
  const refreshLists = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Promise.all([api.conversations(), api.invites()]).then(
        ([c, i]) => {
          setConversations(c);
          setInvites(i);
        },
        () => undefined
      );
      refreshSummary();
    }, 200);
  }, [api, refreshSummary]);

  const select = useCallback((id: string | null) => router.push(id ? `${pathname}?c=${id}` : pathname), [router, pathname]);

  // Open a conversation: load its messages + members, then mark it read.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      try {
        const [res, members] = await Promise.all([api.messages(selectedId), api.members(selectedId)]);
        if (cancelled) return;
        setThread({ convId: selectedId, messages: res.messages, hasMore: res.hasMore });
        setMembersInfo({ convId: selectedId, ids: new Set(members.map((m) => m.profile_id)) });
        await api.markRead(selectedId);
        if (cancelled) return;
        setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0, unread_mentions: 0 } : c)));
        refreshSummary();
      } catch (e) {
        if (!cancelled) fail(e, "Could not open this chat");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, selectedId, refreshSummary, fail]);

  // Live updates, fed by the single realtime connection in StaffChatNotifier.
  useEffect(() => {
    return onChat((type, detail) => {
      if (type === "message") {
        const row = detail as ChatMessage;
        if (row.sender_id && !dirRefreshed.current && !dirMap.has(row.sender_id)) {
          dirRefreshed.current = true;
          api.directory().then(setDirectory, () => undefined);
        }
        if (row.conversation_id === selectedId) {
          setThread((t) => (t.convId !== row.conversation_id || t.messages.some((m) => m.id === row.id) ? t : { ...t, messages: [...t.messages, row] }));
          if (document.visibilityState === "visible" && row.sender_id !== meId) api.markRead(row.conversation_id).then(refreshSummary, () => undefined);
        }
      }
      if (type === "membership" && selectedId) api.members(selectedId).then((m) => setMembersInfo({ convId: selectedId, ids: new Set(m.map((x) => x.profile_id)) }), () => undefined);
      refreshLists();
    });
  }, [api, selectedId, meId, dirMap, refreshLists, refreshSummary]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function sendBody(body: string, replaceId?: string) {
    if (!selectedId) return;
    const convId = selectedId;
    const tempId = replaceId ?? `tmp-${crypto.randomUUID()}`;
    const temp: ChatMessage = { id: tempId, conversation_id: convId, sender_id: meId, body, created_at: new Date().toISOString(), pending: true };
    setThread((t) => (t.convId !== convId ? t : { ...t, messages: replaceId ? t.messages.map((m) => (m.id === replaceId ? temp : m)) : [...t.messages, temp] }));
    try {
      const sent = await api.send(convId, body);
      setThread((t) => {
        if (t.convId !== convId) return t;
        const echoed = t.messages.some((m) => m.id === sent.id); // realtime delivered it first
        return { ...t, messages: echoed ? t.messages.filter((m) => m.id !== tempId) : t.messages.map((m) => (m.id === tempId ? { ...m, id: sent.id, created_at: sent.created_at, pending: false } : m)) };
      });
      refreshLists();
    } catch {
      setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)) }));
    }
  }

  async function loadMore() {
    if (!selectedId || loadingMore || thread.messages.length === 0) return;
    setLoadingMore(true);
    try {
      const res = await api.messages(selectedId, thread.messages[0].created_at);
      setThread((t) => (t.convId !== selectedId ? t : { ...t, messages: [...res.messages, ...t.messages], hasMore: res.hasMore }));
    } catch (e) {
      fail(e, "Could not load earlier messages");
    } finally {
      setLoadingMore(false);
    }
  }

  async function respond(inviteId: string, accept: boolean) {
    setBusyInvite(inviteId);
    setError(null);
    try {
      const convId = await api.respondInvite(inviteId, accept);
      const [c, i] = await Promise.all([api.conversations(), api.invites()]);
      setConversations(c);
      setInvites(i);
      refreshSummary();
      if (accept && convId) select(convId);
    } catch (e) {
      fail(e, "Could not respond to the invitation");
      refreshLists();
    } finally {
      setBusyInvite(null);
    }
  }

  async function created(id: string) {
    setShowNew(false);
    try {
      setConversations(await api.conversations());
    } catch {
      /* the list refreshes on the next event */
    }
    select(id);
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:h-[calc(100dvh-8.5rem)]">
      {error ? (
        <div role="alert" className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          <TriangleAlert size={16} aria-hidden />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-red-100">
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
        <div className={`min-h-0 border-gray-100 md:block md:border-r ${selectedId ? "hidden" : "block"}`}>
          <ConversationList conversations={conversations} invites={invites} selectedId={selectedId} meId={meId} onSelect={select} onNew={() => setShowNew(true)} onRespond={respond} busyInvite={busyInvite} />
        </div>

        <div className={`min-h-0 md:block ${selectedId ? "block" : "hidden"}`}>
          {selected ? (
            <Thread
              conv={selected}
              messages={thread.convId === selected.id ? thread.messages : []}
              loading={loading}
              hasMore={thread.convId === selected.id && thread.hasMore}
              loadingMore={loadingMore}
              directory={directory}
              dirMap={dirMap}
              meId={meId}
              memberIds={membersInfo?.convId === selected.id ? membersInfo.ids : null}
              onSend={(b) => sendBody(b)}
              onRetry={(m) => void sendBody(m.body, m.id)}
              onLoadMore={() => void loadMore()}
              onBack={() => select(null)}
              onOpenMembers={() => setShowMembers(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-gray-50/60 px-6 text-center">
              <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-eduke-green/10 text-eduke-green">
                <MessagesSquare size={26} aria-hidden />
              </span>
              <p className="text-base font-semibold text-gray-800">{selectedId ? "Opening chat…" : "Select a chat to start messaging"}</p>
              <p className="mt-1 max-w-xs text-sm text-gray-500">Message any colleague, from the principal to support staff. Tag someone with <b>@</b> to bring them into a group chat.</p>
            </div>
          )}
        </div>
      </div>

      {showNew ? <NewChatDialog api={api} directory={directory} onCreated={(id) => void created(id)} onClose={() => setShowNew(false)} /> : null}
      {showMembers && selected ? (
        <MembersPanel
          api={api}
          conv={selected}
          directory={directory}
          meId={meId}
          onClose={() => setShowMembers(false)}
          onChanged={() => {
            refreshLists();
            api.members(selected.id).then((m) => setMembersInfo({ convId: selected.id, ids: new Set(m.map((x) => x.profile_id)) }), () => undefined);
          }}
          onLeft={() => {
            setShowMembers(false);
            select(null);
            refreshLists();
          }}
        />
      ) : null}
    </div>
  );
}
