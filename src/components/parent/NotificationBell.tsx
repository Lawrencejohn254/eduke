"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useReadState } from "@/lib/parent/read-state";
import EmptyState from "./EmptyState";
import { iconForCommunication } from "./commIcons";
import type { ShellComm } from "./ParentShell";

export default function NotificationBell({ items, scope }: { items: ShellComm[]; scope: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { isUnread, markRead } = useReadState(scope);

  const unread = items.filter(isUnread);
  const shown = items.slice(0, 5);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-pp-ink hover:bg-pp-sunken"
      >
        <Bell size={20} aria-hidden />
        {unread.length > 0 ? (
          <span
            aria-hidden
            className="pp-num absolute right-1 top-1 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-pp-gold px-1 text-[0.6875rem] font-bold text-pp-ink ring-2 ring-pp-surface"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="pp-pop fixed left-3 right-3 top-[3.75rem] z-40 overflow-hidden rounded-lg border border-pp-rule bg-pp-surface shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[24rem]"
        >
          <div className="flex items-center justify-between border-b border-pp-rule px-4 py-3">
            <h2 className="text-[0.9375rem] font-semibold text-pp-ink">Notifications</h2>
            {unread.length > 0 ? (
              <button
                type="button"
                onClick={() => markRead(items.map((i) => i.id))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] font-medium text-pp-green hover:bg-pp-green-tint"
              >
                <CheckCheck size={15} aria-hidden /> Mark all as read
              </button>
            ) : null}
          </div>

          {shown.length === 0 ? (
            <div className="p-3">
              <EmptyState kind="notifications" compact />
            </div>
          ) : (
            <ul className="max-h-[min(26rem,60vh)] divide-y divide-pp-rule overflow-auto">
              {shown.map((n) => {
                const Icon = iconForCommunication(n.type);
                const isNew = isUnread(n);
                return (
                  <li key={n.id}>
                    <Link
                      href={n.scope === "school" ? "/parent/notices" : "/parent/messages"}
                      onClick={() => {
                        markRead([n.id]);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-pp-sunken ${isNew ? "bg-pp-green-tint/40" : ""}`}
                    >
                      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
                        <Icon size={17} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={`truncate text-[0.875rem] ${isNew ? "font-semibold" : "font-medium"} text-pp-ink`}>
                            {n.title}
                            {isNew ? <span className="sr-only"> (unread)</span> : null}
                          </span>
                          <span className="shrink-0 text-[0.75rem] text-pp-muted">{n.relative}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-snug text-pp-muted">{n.message}</span>
                      </span>
                      {isNew ? <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-pp-green" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex divide-x divide-pp-rule border-t border-pp-rule text-center text-[0.8125rem] font-medium">
            <Link href="/parent/messages" onClick={() => setOpen(false)} className="flex-1 py-3 text-pp-green hover:bg-pp-sunken">
              All messages
            </Link>
            <Link href="/parent/notices" onClick={() => setOpen(false)} className="flex-1 py-3 text-pp-green hover:bg-pp-sunken">
              All notices
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
