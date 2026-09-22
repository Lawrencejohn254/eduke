"use client";

import { useMemo, useRef, useState } from "react";
import { AtSign, LoaderCircle, Send } from "lucide-react";
import type { DirectoryEntry } from "@/lib/chat/types";
import { activeMentionQuery, serializeMentions, type PendingMention } from "@/lib/chat/mentions";
import { cleanName, roleLabel, roleTone } from "@/lib/chat/roles";
import ChatAvatar from "./ChatAvatar";

const MAX = 4000;

/**
 * Message box with @-tagging. Typing "@" opens a list of staff; picking someone who is not yet in the
 * group tells the sender they will be invited to join. Enter sends, Shift+Enter starts a new line.
 */
export default function Composer({
  directory,
  memberIds,
  kind,
  onSend,
  disabled,
}: {
  directory: DirectoryEntry[];
  /** null while the member list is still loading */
  memberIds: Set<string> | null;
  kind: "direct" | "group";
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<PendingMention[]>([]);
  const [query, setQuery] = useState<{ query: string; start: number } | null>(null);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const candidates = useMemo(() => {
    if (!query) return [];
    const q = query.query.toLowerCase();
    return directory
      .filter((p) => p.active && !p.is_me)
      .filter((p) => (kind === "direct" ? memberIds?.has(p.id) : true)) // in a DM only the other person can be tagged
      .map((p) => ({ p, name: cleanName(p.first_name, p.last_name), inChat: memberIds?.has(p.id) ?? false }))
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => Number(b.inChat) - Number(a.inChat) || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [query, directory, memberIds, kind]);

  function refreshQuery(value: string, caret: number) {
    setQuery(activeMentionQuery(value, caret));
    setActive(0);
  }

  function choose(c: { p: DirectoryEntry; name: string }) {
    if (!query) return;
    const area = areaRef.current;
    const caret = area?.selectionStart ?? text.length;
    const next = `${text.slice(0, query.start)}@${c.name} ${text.slice(caret)}`;
    const pos = query.start + c.name.length + 2;
    setText(next);
    setPicked((prev) => [...prev, { id: c.p.id, name: c.name }]);
    setQuery(null);
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    const body = serializeMentions(text.trim(), picked);
    if (!body || busy || disabled) return;
    setBusy(true);
    try {
      await onSend(body);
      setText("");
      setPicked([]);
      setQuery(null);
      if (areaRef.current) areaRef.current.style.height = "auto";
    } finally {
      setBusy(false);
      areaRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(candidates[active]);
        return;
      }
    }
    if (query && e.key === "Escape") {
      e.preventDefault();
      setQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const over = text.length > MAX;

  return (
    <div className="relative border-t border-gray-100 bg-white p-3">
      {query && candidates.length > 0 ? (
        <ul
          role="listbox"
          aria-label="Tag someone"
          className="absolute bottom-full left-3 right-3 z-20 mb-1 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg sm:right-auto sm:w-96"
        >
          {candidates.map((c, i) => (
            <li
              key={c.p.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 ${i === active ? "bg-eduke-green/10" : ""}`}
            >
              <ChatAvatar name={c.name} photo={c.p.photo_url} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{c.name}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${roleTone(c.p.role)}`}>{roleLabel(c.p.role)}</span>
                  {!c.inChat && kind === "group" ? <span className="text-[11px] text-amber-700">Not in this chat · will be invited</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="chat-composer" className="sr-only">
            Write a message. Type @ to tag a colleague.
          </label>
          <textarea
            id="chat-composer"
            ref={areaRef}
            value={text}
            rows={1}
            disabled={disabled}
            placeholder="Write a message…  type @ to tag someone"
            onChange={(e) => {
              setText(e.target.value);
              refreshQuery(e.target.value, e.target.selectionStart);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onClick={(e) => refreshQuery(text, e.currentTarget.selectionStart)}
            onKeyDown={onKeyDown}
            onBlur={() => setQuery(null)}
            className="max-h-40 w-full resize-none rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-eduke-green focus:outline-none focus:ring-2 focus:ring-eduke-green/20 disabled:bg-gray-50"
          />
          {over ? <p className="mt-1 text-xs text-red-600">Too long by {text.length - MAX} characters.</p> : null}
        </div>
        <button
          type="button"
          onClick={() => {
            const a = areaRef.current;
            if (!a) return;
            const at = a.selectionStart;
            const next = `${text.slice(0, at)}${at > 0 && !/\s$/.test(text.slice(0, at)) ? " " : ""}@${text.slice(at)}`;
            setText(next);
            const pos = at + (at > 0 && !/\s$/.test(text.slice(0, at)) ? 2 : 1);
            requestAnimationFrame(() => {
              a.focus();
              a.setSelectionRange(pos, pos);
              refreshQuery(next, pos);
            });
          }}
          aria-label="Tag someone"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <AtSign size={18} />
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || disabled || over || !text.trim()}
          aria-label="Send message"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-eduke-green text-white hover:bg-eduke-green-dark disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
