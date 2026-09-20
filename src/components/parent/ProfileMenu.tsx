"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LoaderCircle, LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./ui";

export default function ProfileMenu({ name, firstName, lastName, photoUrl }: { name: string; firstName: string; lastName: string; photoUrl: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  // Same sign-out behaviour the portal has always had.
  async function handleLogout() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const itemClass = "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[0.875rem] text-pp-ink hover:bg-pp-sunken focus-visible:bg-pp-sunken";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-md px-1.5 hover:bg-pp-sunken sm:pl-2 sm:pr-2.5"
      >
        <Avatar first={firstName} last={lastName} src={photoUrl} size={32} />
        <span className="hidden max-w-40 truncate text-[0.875rem] font-medium text-pp-ink sm:inline">{name}</span>
        <ChevronDown size={16} aria-hidden className="hidden text-pp-muted sm:block" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="pp-pop absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-pp-rule bg-pp-surface p-1.5 shadow-lg"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-[0.875rem] font-semibold text-pp-ink">{name}</p>
            <p className="text-[0.75rem] text-pp-muted">Parent account</p>
          </div>
          <div className="my-1 border-t border-pp-rule" />
          <Link role="menuitem" tabIndex={-1} href="/parent/settings#profile" onClick={() => setOpen(false)} className={itemClass}>
            <UserRound size={17} aria-hidden className="text-pp-muted" /> Parent profile
          </Link>
          <Link role="menuitem" tabIndex={-1} href="/parent/settings" onClick={() => setOpen(false)} className={itemClass}>
            <Settings size={17} aria-hidden className="text-pp-muted" /> Account settings
          </Link>
          <Link role="menuitem" tabIndex={-1} href="/parent/settings#notifications" onClick={() => setOpen(false)} className={itemClass}>
            <Bell size={17} aria-hidden className="text-pp-muted" /> Notification preferences
          </Link>
          <div className="my-1 border-t border-pp-rule" />
          <button role="menuitem" tabIndex={-1} type="button" onClick={handleLogout} disabled={signingOut} className={`${itemClass} disabled:opacity-60`}>
            {signingOut ? <LoaderCircle size={17} aria-hidden className="animate-spin text-pp-muted" /> : <LogOut size={17} aria-hidden className="text-pp-muted" />}
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
