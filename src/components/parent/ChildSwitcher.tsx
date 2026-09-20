"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Avatar } from "./ui";

export type SwitcherChild = { id: string; firstName: string; lastName: string; subtitle: string };

/**
 * Accessible listbox for choosing which child the portal is showing. Selecting rewrites ?child=
 * and keeps every other query param, so switching child on the Results page stays on Results.
 * Only ever built from the authenticated parent's real linked children (passed in by the server).
 */
export default function ChildSwitcher({
  options: kids,
  activeId,
  variant = "identity",
}: {
  options: SwitcherChild[];
  activeId: string;
  variant?: "identity" | "button-dark";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const active = kids.find((k) => k.id === activeId) ?? kids[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = rootRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    (selected ?? rootRef.current?.querySelector<HTMLElement>('[role="option"]'))?.focus();
  }, [open]);

  function choose(id: string) {
    setOpen(false);
    triggerRef.current?.focus();
    if (id === activeId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("child", id);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    const options = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
    const index = options.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      options[(index + 1) % options.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      options[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      options[options.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  if (!active) return null;

  const triggerClass =
    variant === "button-dark"
      ? "inline-flex min-h-11 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3.5 text-[0.875rem] font-medium text-white hover:bg-white/15"
      : "flex min-h-14 w-full items-center gap-3 rounded-lg border border-pp-rule bg-pp-surface px-3.5 py-2 text-left hover:border-pp-rule-strong";

  return (
    <div ref={rootRef} className={`relative ${variant === "identity" ? "w-full sm:w-auto sm:min-w-72" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        {variant === "identity" ? (
          <>
            <Avatar first={active.firstName} last={active.lastName} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] font-semibold text-pp-ink">
                {active.firstName} {active.lastName}
              </span>
              <span className="block truncate text-[0.8125rem] text-pp-muted">{active.subtitle}</span>
            </span>
          </>
        ) : (
          <span>Switch child</span>
        )}
        {pending ? <LoaderCircle size={16} className="animate-spin" aria-label="Loading" /> : <ChevronDown size={16} aria-hidden className={variant === "identity" ? "text-pp-muted" : ""} />}
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Choose a child"
          onKeyDown={onListKeyDown}
          className="pp-pop absolute right-0 z-40 mt-2 max-h-80 w-full min-w-72 overflow-auto rounded-lg border border-pp-rule bg-pp-surface p-1.5 text-pp-ink shadow-lg"
        >
          {kids.map((k) => {
            const selected = k.id === active.id;
            return (
              <li
                key={k.id}
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onClick={() => choose(k.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    choose(k.id);
                  }
                }}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 hover:bg-pp-sunken focus-visible:bg-pp-sunken"
              >
                <Avatar first={k.firstName} last={k.lastName} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-semibold">
                    {k.firstName} {k.lastName}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-pp-muted">{k.subtitle}</span>
                </span>
                {selected ? <Check size={16} aria-hidden className="text-pp-green" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
