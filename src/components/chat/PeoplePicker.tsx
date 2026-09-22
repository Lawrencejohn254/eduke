"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import type { DirectoryEntry } from "@/lib/chat/types";
import { cleanName, roleLabel, roleTone } from "@/lib/chat/roles";
import ChatAvatar from "./ChatAvatar";

/** Searchable list of staff. `multiple` = checkboxes (groups), otherwise a click picks one person. */
export default function PeoplePicker({
  people,
  selected,
  onToggle,
  multiple,
  emptyText = "No colleagues found",
}: {
  people: DirectoryEntry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  multiple: boolean;
  emptyText?: string;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people
      .map((p) => ({ p, name: cleanName(p.first_name, p.last_name) }))
      .filter((x) => !needle || x.name.toLowerCase().includes(needle) || roleLabel(x.p.role).toLowerCase().includes(needle) || (x.p.department ?? "").toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, q]);

  return (
    <div>
      <label className="relative mb-2 block">
        <span className="sr-only">Search colleagues</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" className="min-h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm focus:border-eduke-green focus:outline-none" />
      </label>
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
        {list.length === 0 ? <li className="px-3 py-6 text-center text-sm text-gray-500">{emptyText}</li> : null}
        {list.map(({ p, name }) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id} className="border-b border-gray-50 last:border-0">
              <button
                type="button"
                role={multiple ? "checkbox" : undefined}
                aria-checked={multiple ? on : undefined}
                onClick={() => onToggle(p.id)}
                className={`flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${on ? "bg-eduke-green/5" : ""}`}
              >
                <ChatAvatar name={name} photo={p.photo_url} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">{name}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${roleTone(p.role)}`}>{roleLabel(p.role)}</span>
                    {p.department ? <span className="truncate text-[11px] text-gray-500">{p.department}</span> : null}
                  </span>
                </span>
                {multiple ? (
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded border ${on ? "border-eduke-green bg-eduke-green text-white" : "border-gray-300"}`}>{on ? <Check size={13} aria-hidden /> : null}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
