"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GraduationCap, Menu, School, X } from "lucide-react";
import { useReadState } from "@/lib/parent/read-state";
import { ALL_NAV, BOTTOM_NAV_KEYS, NAV_GROUPS, isActive, withChild, type NavItem } from "./nav";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

export type ShellComm = {
  id: string;
  title: string;
  message: string;
  type: string;
  scope: "school" | "personal";
  relative: string;
  recent: boolean;
};

export type ShellUser = { name: string; firstName: string; lastName: string; photoUrl: string | null };

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/parent" className="flex min-h-11 items-center gap-2.5 rounded-md">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-pp-green text-pp-gold">
        <GraduationCap size={19} aria-hidden />
      </span>
      <span className={`font-display text-[1.25rem] font-semibold tracking-tight ${dark ? "text-white" : "text-pp-ink"}`}>EduKe</span>
    </Link>
  );
}

function NavList({
  childId,
  pathname,
  badges,
  onNavigate,
}: {
  childId: string | null;
  pathname: string;
  badges: Partial<Record<NavItem["key"], number>>;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="pp-dark-focus flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
      {NAV_GROUPS.map((group, gi) => (
        <ul key={gi} className={`flex flex-col gap-0.5 ${gi === NAV_GROUPS.length - 1 ? "mt-auto border-t border-white/10 pt-4" : ""}`}>
          {group.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            const badge = badges[item.key] ?? 0;
            return (
              <li key={item.key}>
                <Link
                  href={withChild(item.href, childId)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors ${
                    active ? "bg-white/12 font-semibold text-white" : "text-white/80 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {active ? <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-pp-gold" /> : null}
                  <Icon size={19} aria-hidden className={active ? "text-pp-gold" : ""} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.sw ? <span className="text-[0.75rem] font-normal text-white/55">{item.sw}</span> : null}
                  {badge > 0 ? (
                    <span className="pp-num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pp-gold px-1.5 text-[0.6875rem] font-bold text-pp-ink">
                      {badge}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </nav>
  );
}

export default function ParentShell({
  user,
  schoolName,
  readScope,
  communications,
  children,
}: {
  user: ShellUser;
  schoolName: string;
  readScope: string;
  communications: ShellComm[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isUnread } = useReadState(readScope);

  const unread = communications.filter(isUnread);
  const badges: Partial<Record<NavItem["key"], number>> = {
    messages: unread.filter((c) => c.scope === "personal").length,
    notices: unread.filter((c) => c.scope === "school").length,
  };

  // Drawer: lock scroll, Escape to close, keep Tab inside, hand focus back on close.
  useEffect(() => {
    if (!drawer) return;
    const trigger = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [drawer]);

  const bottomItems = BOTTOM_NAV_KEYS.map((k) => ALL_NAV.find((n) => n.key === k)!);

  return (
    <div className="pp-root min-h-dvh bg-pp-paper font-pp text-[0.9375rem] text-pp-ink antialiased">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-pp-surface focus:px-4 focus:py-2 focus:shadow-lg">
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-pp-green-deep text-white lg:flex">
        <div className="px-4 pb-3 pt-4">
          <Brand dark />
        </div>
        <NavList childId={childId} pathname={pathname} badges={badges} />
        <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4 text-[0.8125rem] text-white/70">
          <School size={16} aria-hidden className="shrink-0" />
          <span className="truncate">{schoolName}</span>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-pp-rule bg-pp-surface/95 px-2 backdrop-blur sm:px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-1">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              aria-expanded={drawer}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-pp-sunken lg:hidden"
            >
              <Menu size={22} aria-hidden />
            </button>
            <div className="lg:hidden">
              <Brand />
            </div>
            <p className="hidden items-center gap-2 truncate text-[0.875rem] text-pp-muted lg:flex">
              <School size={16} aria-hidden /> {schoolName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell items={communications} scope={readScope} />
            <ProfileMenu {...user} />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1120px] px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="pp-scrim absolute inset-0 bg-black/45" onClick={() => setDrawer(false)} aria-hidden />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="pp-drawer pp-dark-focus absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col bg-pp-green-deep text-white shadow-xl"
          >
            <div className="flex items-center justify-between px-4 pb-3 pt-4">
              <Brand dark />
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10">
                <X size={22} aria-hidden />
              </button>
            </div>
            <NavList childId={childId} pathname={pathname} badges={badges} onNavigate={() => setDrawer(false)} />
            <div className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[0.8125rem] text-white/70">
              <School size={16} aria-hidden className="shrink-0" />
              <span className="truncate">{schoolName}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-20 border-t border-pp-rule bg-pp-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {bottomItems.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            const badge = badges[item.key] ?? 0;
            return (
              <li key={item.key}>
                <Link
                  href={withChild(item.href, childId)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] ${active ? "font-semibold text-pp-green" : "text-pp-muted"}`}
                >
                  {active ? <span aria-hidden className="absolute inset-x-4 top-0 h-[3px] rounded-b bg-pp-gold" /> : null}
                  <span className="relative">
                    <Icon size={21} aria-hidden />
                    {badge > 0 ? (
                      <span className="pp-num absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-pp-gold px-1 text-[0.625rem] font-bold text-pp-ink">
                        {badge}
                        <span className="sr-only"> unread</span>
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
