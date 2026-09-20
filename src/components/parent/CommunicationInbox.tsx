"use client";

import { useState } from "react";
import { CheckCheck, ChevronDown, Mail, Phone } from "lucide-react";
import { useReadState } from "@/lib/parent/read-state";
import type { CommunicationItem } from "@/lib/parent/queries";
import EmptyState, { type EmptyKind } from "./EmptyState";
import { iconForCommunication, labelForCommunication } from "./commIcons";

/**
 * Read-only inbox of what the school has sent. Rows expand in place (works the same on phones and desktops),
 * opening a row marks it read on this device. There is no compose/reply here — that needs backend support
 * that doesn't exist yet, so the school office contact details are shown instead.
 */
export default function CommunicationInbox({
  items,
  readScope,
  emptyKind,
  contact,
}: {
  items: CommunicationItem[];
  readScope: string;
  emptyKind: EmptyKind;
  contact: { schoolName: string; phone: string | null; email: string | null };
}) {
  const { ready, isUnread, markRead } = useReadState(readScope);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const unreadCount = items.filter(isUnread).length;
  const shown = filter === "unread" ? items.filter(isUnread) : items;

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) markRead([id]);
  }

  if (items.length === 0) return <EmptyState kind={emptyKind} />;

  const tabClass = (active: boolean) =>
    `inline-flex min-h-10 items-center gap-1.5 rounded-md px-3.5 text-[0.875rem] font-medium ${active ? "bg-pp-green text-white" : "text-pp-ink hover:bg-pp-sunken"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter messages" className="inline-flex gap-1 rounded-lg border border-pp-rule bg-pp-surface p-1">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={tabClass(filter === "all")}>
            All <span className="pp-num text-[0.75rem] opacity-80">{items.length}</span>
          </button>
          <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")} className={tabClass(filter === "unread")}>
            Unread {ready ? <span className="pp-num text-[0.75rem] opacity-80">{unreadCount}</span> : null}
          </button>
        </div>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => markRead(items.map((i) => i.id))} className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-[0.875rem] font-medium text-pp-green hover:bg-pp-green-tint">
            <CheckCheck size={16} aria-hidden /> Mark all as read
          </button>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <EmptyState kind="notifications" compact />
      ) : (
        <ul className="divide-y divide-pp-rule overflow-hidden rounded-lg border border-pp-rule bg-pp-surface">
          {shown.map((n) => {
            const Icon = iconForCommunication(n.type);
            const open = openId === n.id;
            const unread = isUnread(n);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`msg-${n.id}`}
                  onClick={() => toggle(n.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-pp-sunken sm:px-5 ${unread ? "bg-pp-green-tint/40" : ""}`}
                >
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`flex min-w-0 items-center gap-2 text-[0.9375rem] ${unread ? "font-semibold" : "font-medium"}`}>
                        <span className="truncate">{n.title}</span>
                        {unread ? <span className="shrink-0 rounded-full bg-pp-gold px-2 py-px text-[0.6875rem] font-bold text-pp-ink">New</span> : null}
                      </span>
                      <span className="shrink-0 text-[0.8125rem] text-pp-muted">{n.relative}</span>
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] text-pp-muted">
                      {n.title === n.type ? n.audience : `${labelForCommunication(n.type)} · ${n.audience}`}
                    </span>
                    {!open ? <span className="mt-1.5 line-clamp-2 block text-[0.875rem] leading-snug text-pp-muted">{n.message}</span> : null}
                  </span>
                  <ChevronDown size={18} aria-hidden className={`mt-1 shrink-0 text-pp-faint transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <div id={`msg-${n.id}`} className="border-t border-pp-rule bg-pp-surface px-4 py-4 sm:pl-[4.25rem] sm:pr-5">
                    <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed">{n.message}</p>
                    <p className="mt-3 text-[0.8125rem] text-pp-muted">Sent {n.absolute}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-pp-rule bg-pp-surface px-4 py-3.5 text-[0.875rem] text-pp-muted sm:px-5">
        <span>To reply, contact {contact.schoolName}:</span>
        {contact.phone ? (
          <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-pp-green hover:underline">
            <Phone size={15} aria-hidden /> {contact.phone}
          </a>
        ) : null}
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-pp-green hover:underline">
            <Mail size={15} aria-hidden /> {contact.email}
          </a>
        ) : null}
        {!contact.phone && !contact.email ? <span>the school office.</span> : null}
      </div>
    </div>
  );
}
