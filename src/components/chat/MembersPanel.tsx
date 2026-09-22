"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, LogOut, Pencil, UserPlus, X } from "lucide-react";
import type { ChatApi, ChatMember, ConversationSummary, DirectoryEntry } from "@/lib/chat/types";
import { cleanName, roleLabel, roleTone } from "@/lib/chat/roles";
import ChatAvatar from "./ChatAvatar";
import PeoplePicker from "./PeoplePicker";
import { conversationTitle } from "./Thread";

export default function MembersPanel({
  api,
  conv,
  directory,
  meId,
  onClose,
  onChanged,
  onLeft,
}: {
  api: ChatApi;
  conv: ConversationSummary;
  directory: DirectoryEntry[];
  meId: string;
  onClose: () => void;
  onChanged: () => void;
  onLeft: () => void;
}) {
  const [members, setMembers] = useState<ChatMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [shareHistory, setShareHistory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(conv.title ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const isGroup = conv.kind === "group";
  const isAdmin = conv.my_member_role === "admin";

  useEffect(() => {
    let cancelled = false;
    api.members(conv.id).then(
      (m) => !cancelled && setMembers(m),
      (e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load members")
    );
    return () => {
      cancelled = true;
    };
  }, [api, conv.id]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const memberIds = new Set((members ?? []).map((m) => m.profile_id));
  const addable = directory.filter((p) => p.active && !p.is_me && !memberIds.has(p.id));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Chat members" className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-bold text-gray-900">{isGroup ? "Group members" : "Details"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isGroup ? (
            <div className="mb-4">
              {renaming ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await api.rename(conv.id, title);
                      setRenaming(false);
                      onChanged();
                    });
                  }}
                >
                  <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-label="Group name" className="min-h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm" />
                  <button type="submit" disabled={busy} className="rounded-lg bg-eduke-green px-3 text-sm font-semibold text-white disabled:opacity-60">
                    Save
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-lg font-bold text-gray-900">{conversationTitle(conv)}</p>
                  {isAdmin ? (
                    <button type="button" onClick={() => setRenaming(true)} aria-label="Rename group" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
                      <Pencil size={16} />
                    </button>
                  ) : null}
                </div>
              )}
              <p className="mt-0.5 text-xs text-gray-500">Anyone in the group can tag a colleague with @ to invite them.</p>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {members === null && !error ? (
            <div className="flex justify-center py-8 text-gray-400">
              <LoaderCircle className="animate-spin" aria-label="Loading" />
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {(members ?? []).map((m) => {
                const name = cleanName(m.first_name, m.last_name);
                return (
                  <li key={m.profile_id} className="flex items-center gap-3 py-2.5">
                    <ChatAvatar name={name} photo={m.photo_url} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {name}
                        {m.profile_id === meId ? <span className="font-normal text-gray-500"> (you)</span> : null}
                      </p>
                      <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${roleTone(m.role)}`}>{roleLabel(m.role)}</span>
                    </div>
                    {isGroup && m.member_role === "admin" ? <span className="rounded-full bg-eduke-green/10 px-2 py-0.5 text-[10px] font-bold text-eduke-green">Admin</span> : null}
                  </li>
                );
              })}
            </ul>
          )}

          {isGroup && isAdmin ? (
            <div className="mt-5 border-t border-gray-100 pt-4">
              {adding ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">Add people</h3>
                  <PeoplePicker
                    people={addable}
                    selected={picked}
                    multiple
                    emptyText="Everyone is already in this group"
                    onToggle={(id) =>
                      setPicked((prev) => {
                        const n = new Set(prev);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }
                  />
                  <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={shareHistory} onChange={(e) => setShareHistory(e.target.checked)} className="mt-0.5 h-4 w-4" />
                    <span>
                      Let them read earlier messages
                      <span className="block text-xs text-gray-500">Off: they only see messages sent after they join.</span>
                    </span>
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy || picked.size === 0}
                      onClick={() =>
                        void run(async () => {
                          await api.addMembers(conv.id, [...picked], shareHistory);
                          setPicked(new Set());
                          setAdding(false);
                          setMembers(await api.members(conv.id));
                          onChanged();
                        })
                      }
                      className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-eduke-green text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Add {picked.size || ""}
                    </button>
                    <button type="button" onClick={() => setAdding(false)} className="min-h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-800 hover:bg-gray-50">
                  <UserPlus size={16} aria-hidden /> Add people
                </button>
              )}
            </div>
          ) : null}
        </div>

        {isGroup ? (
          <div className="border-t border-gray-100 p-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Leave this group? You won't see new messages unless someone tags or adds you again.")) void run(async () => { await api.leave(conv.id); onLeft(); });
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} aria-hidden /> Leave group
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
