"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { ChatApi, DirectoryEntry } from "@/lib/chat/types";
import PeoplePicker from "./PeoplePicker";

export default function NewChatDialog({ api, directory, onCreated, onClose }: { api: ChatApi; directory: DirectoryEntry[]; onCreated: (id: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const people = directory.filter((p) => p.active && !p.is_me);

  useEffect(() => {
    const el = dialogRef.current;
    el?.querySelector<HTMLElement>("input,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const f = el.querySelectorAll<HTMLElement>("input,button:not([disabled])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(id: string) {
    if (tab === "direct") {
      void startDirect(id);
      return;
    }
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startDirect(id: string) {
    setBusy(true);
    setError(null);
    try {
      onCreated(await api.createDirect(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the chat");
      setBusy(false);
    }
  }

  async function createGroup() {
    if (!title.trim()) return setError("Give the group a name");
    setBusy(true);
    setError(null);
    try {
      onCreated(await api.createGroup(title.trim(), [...picked]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the group");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="New chat" className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">New chat</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div role="tablist" aria-label="Chat type" className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
          {(["direct", "group"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`min-h-9 rounded-md text-sm font-medium ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
            >
              {t === "direct" ? "Direct message" : "Group"}
            </button>
          ))}
        </div>

        {tab === "group" ? (
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-gray-600">Group name</span>
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exams committee" className="min-h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-eduke-green focus:outline-none" />
          </label>
        ) : (
          <p className="mb-2 text-xs text-gray-500">Pick a colleague to message.</p>
        )}

        <PeoplePicker people={people} selected={picked} onToggle={toggle} multiple={tab === "group"} />

        {tab === "group" ? (
          <p className="mt-2 text-xs text-gray-500">
            {picked.size} selected. You can also tag anyone later with <b>@</b> — they&apos;ll get an invitation to join.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {tab === "group" ? (
          <button type="button" onClick={() => void createGroup()} disabled={busy} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-eduke-green text-sm font-semibold text-white hover:bg-eduke-green-dark disabled:opacity-60">
            {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : null} Create group
          </button>
        ) : busy ? (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
            <LoaderCircle size={16} className="animate-spin" aria-hidden /> Opening chat…
          </p>
        ) : null}
      </div>
    </div>
  );
}
