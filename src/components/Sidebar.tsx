"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CircleUser,
  UserPlus,
  BookOpen,
  Sparkles,
  ClipboardList,
  NotebookPen,
  HelpCircle,
  CalendarCheck,
  PencilLine,
  CalendarDays,
  Wallet,
  BarChart3,
  MessageSquare,
  Library,
  Settings,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  featured?: boolean;
};

/* =========================
   PRINCIPAL NAVIGATION
========================= */

const PRINCIPAL_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "My Profile",
    href: "/profile",
    icon: CircleUser,
  },

  {
    label: "Students (Wanafunzi)",
    href: "/students",
    icon: Users,
  },

  {
    label: "Staff",
    href: "/staff",
    icon: UserCog,
  },

  {
    label: "Staff Requests",
    href: "/staff/requests",
    icon: UserPlus,
  },

  {
    label: "Exams",
    href: "/exams",
    icon: BookOpen,
  },

  {
    label: "Timetable (Ratiba)",
    href: "/timetable",
    icon: CalendarDays,
  },

  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "AI Insights",
    href: "/ai-insights",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "Lesson Plans",
    href: "/lesson-plans",
    icon: ClipboardList,
  },

  {
    label: "Schemes of Work",
    href: "/schemes-of-work",
    icon: NotebookPen,
  },

  {
    label: "Fees (Ada)",
    href: "/fees/payments",
    icon: Wallet,
  },

  {
    label: "Reports",
    href: "/fees/reports",
    icon: BarChart3,
  },

  {
    label: "Communications",
    href: "/communications",
    icon: MessageSquare,
  },

  {
    label: "Library",
    href: "/library",
    icon: Library,
  },

  {
    label: "Audit Log",
    href: "/audit-log",
    icon: ShieldCheck,
  },

  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];


/* =========================
   TEACHER NAVIGATION
========================= */

const TEACHER_NAV: NavItem[] = [
  {
    label: "My Dashboard",
    href: "/teacher-dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "My Profile",
    href: "/profile",
    icon: CircleUser,
  },

  {
    label: "My Classes",
    href: "/my-classes",
    icon: BookOpen,
  },

  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "AI Insights",
    href: "/ai-insights",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "My Lesson Plans",
    href: "/lesson-plans",
    icon: ClipboardList,
  },

  {
    label: "My Schemes of Work",
    href: "/schemes-of-work",
    icon: NotebookPen,
  },

  {
    label: "Question Bank",
    href: "/question-bank",
    icon: HelpCircle,
  },

  {
    label: "Attendance (Mahudhurio)",
    href: "/attendance",
    icon: CalendarCheck,
  },

  {
    label: "Mark Entry",
    href: "/exams",
    icon: PencilLine,
  },

  {
    label: "My Timetable",
    href: "/timetable",
    icon: CalendarDays,
  },

  {
    label: "Messages",
    href: "/communications",
    icon: MessageSquare,
  },
];


/* =========================
   HOD NAVIGATION
========================= */

const HOD_NAV: NavItem[] = [
  {
    label: "My Dashboard",
    href: "/teacher-dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "My Profile",
    href: "/profile",
    icon: CircleUser,
  },

  {
    label: "My Classes",
    href: "/my-classes",
    icon: BookOpen,
  },

  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "AI Insights",
    href: "/ai-insights",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "Lesson Plans (Review)",
    href: "/lesson-plans",
    icon: ClipboardList,
  },

  {
    label: "Schemes of Work (Review)",
    href: "/schemes-of-work",
    icon: NotebookPen,
  },

  {
    label: "Question Bank",
    href: "/question-bank",
    icon: HelpCircle,
  },

  {
    label: "Attendance (Mahudhurio)",
    href: "/attendance",
    icon: CalendarCheck,
  },

  {
    label: "Mark Entry",
    href: "/exams",
    icon: PencilLine,
  },

  {
    label: "My Timetable",
    href: "/timetable",
    icon: CalendarDays,
  },

  {
    label: "Messages",
    href: "/communications",
    icon: MessageSquare,
  },
];


/* =========================
   BURSAR NAVIGATION
========================= */

const BURSAR_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/bursar-dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "My Profile",
    href: "/profile",
    icon: CircleUser,
  },

  {
    label: "AI Insights",
    href: "/ai-insights",
    icon: Sparkles,
    featured: true,
  },

  {
    label: "Fee Structure",
    href: "/fees/structure",
    icon: Wallet,
  },

  {
    label: "Fee Payments (Ada)",
    href: "/fees/payments",
    icon: Wallet,
  },

  {
    label: "Fee Defaulters",
    href: "/fees/defaulters",
    icon: BarChart3,
  },

  {
    label: "Finance Reports",
    href: "/fees/reports",
    icon: BarChart3,
  },

  {
    label: "Communications",
    href: "/communications",
    icon: MessageSquare,
  },
];


/* =========================
   ROLE NAVIGATION SELECTOR
========================= */

function navForRole(role: string): NavItem[] {
  switch (role) {
    case "principal":
    case "deputy_principal":
    case "super_admin":
    case "admin":
    case "school_admin":
      return PRINCIPAL_NAV;

    case "hod":
      return HOD_NAV;

    case "teacher":
      return TEACHER_NAV;

    case "bursar":
      return BURSAR_NAV;

    default:
      return TEACHER_NAV;
  }
}


/* =========================
   SIDEBAR CONTENT
========================= */

export function SidebarContent({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <>
      {/* LOGO */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <GraduationCap
          size={26}
          className="text-eduke-gold"
        />

        <div>
          <p className="font-bold text-lg leading-none">
            EduKe
          </p>

          <p className="text-[11px] text-white/70">
            🇰🇪 Kenyan Schools
          </p>
        </div>
      </div>


      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-white/15 font-semibold"
                  : "text-white/85 hover:bg-white/10"
              } ${
                item.featured
                  ? "ring-1 ring-eduke-gold/70"
                  : ""
              }`}
            >
              <Icon
                size={18}
                className={
                  item.featured
                    ? "text-eduke-gold"
                    : ""
                }
              />

              <span>{item.label}</span>

              {item.featured && (
                <span className="ml-auto text-[10px] bg-eduke-gold text-eduke-green-dark rounded-full px-1.5 py-0.5 font-bold">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}


/* =========================
   DESKTOP SIDEBAR
========================= */

export default function Sidebar({
  role,
}: {
  role: string;
}) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-eduke-green text-white h-screen sticky top-0">
      <SidebarContent role={role} />
    </aside>
  );
}