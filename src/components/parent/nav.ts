import {
  Award,
  CalendarCheck,
  CalendarClock,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: "dashboard" | "children" | "results" | "attendance" | "timetable" | "fees" | "messages" | "notices" | "settings";
  label: string;
  /** Swahili name, shown alongside the English label where the school portal has always used it */
  sw?: string;
  href: string;
  icon: LucideIcon;
  /** match only this exact path (used for the dashboard, which is a prefix of every other route) */
  exact?: boolean;
};

export const NAV_GROUPS: NavItem[][] = [
  [
    { key: "dashboard", label: "Dashboard", href: "/parent", icon: LayoutDashboard, exact: true },
    { key: "children", label: "My children", href: "/parent/children", icon: Users },
  ],
  [
    { key: "results", label: "Results", sw: "Matokeo", href: "/parent/results", icon: Award },
    { key: "attendance", label: "Attendance", sw: "Mahudhurio", href: "/parent/attendance", icon: CalendarCheck },
    { key: "timetable", label: "Timetable", sw: "Ratiba", href: "/parent/timetable", icon: CalendarClock },
  ],
  [
    { key: "fees", label: "Fees", sw: "Ada", href: "/parent/fees", icon: Wallet },
    { key: "messages", label: "Messages", href: "/parent/messages", icon: MessageSquare },
    { key: "notices", label: "Notices", href: "/parent/notices", icon: Megaphone },
  ],
  [{ key: "settings", label: "Settings", href: "/parent/settings", icon: Settings }],
];

export const ALL_NAV: NavItem[] = NAV_GROUPS.flat();

/** The five destinations parents use most, for the compact mobile bottom bar. */
export const BOTTOM_NAV_KEYS: NavItem["key"][] = ["dashboard", "results", "attendance", "fees", "messages"];

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Keeps the selected child when moving between pages: /parent/fees → /parent/fees?child=<id> */
export function withChild(href: string, childId: string | null | undefined): string {
  return childId ? `${href}?child=${encodeURIComponent(childId)}` : href;
}
