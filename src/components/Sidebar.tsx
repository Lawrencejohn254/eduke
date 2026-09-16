"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  CircleUser,
  UserPlus,
  UserCheck,
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
  Clock,
  FileBarChart,
  ClipboardCheck,
  Receipt,
  Award,
  Home,
  Heart,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/profile", icon: CircleUser },
  { label: "Students (Wanafunzi)", href: "/students", icon: Users },
  { label: "Staff", href: "/staff", icon: UserCog },
  { label: "Staff Requests", href: "/staff/requests", icon: UserPlus },
  { label: "Parent Requests", href: "/guardian-requests", icon: UserCheck },
  { label: "Staff Attendance", href: "/staff-attendance", icon: Clock },
  { label: "Attendance Reports", href: "/staff-attendance/reports", icon: FileBarChart },
  { label: "Student Attendance", href: "/student-attendance", icon: ClipboardCheck },
  { label: "Exams", href: "/exams", icon: BookOpen },
  { label: "Class Teachers", href: "/class-teachers", icon: Award },
  { label: "Timetable (Ratiba)", href: "/timetable", icon: CalendarDays },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, featured: true },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles, featured: true },
  { label: "Lesson Plans", href: "/lesson-plans", icon: ClipboardList },
  { label: "Schemes of Work", href: "/schemes-of-work", icon: NotebookPen },
  { label: "Fees (Ada)", href: "/fees/payments", icon: Wallet },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Reports", href: "/fees/reports", icon: BarChart3 },
  { label: "Communications", href: "/communications", icon: MessageSquare },
  { label: "Library", href: "/library", icon: Library },
  { label: "Audit Log", href: "/audit-log", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

/* =========================
   TEACHER NAVIGATION
========================= */

// Base nav — no enrollment item by default (matches current behavior).
const TEACHER_NAV_BASE: NavItem[] = [
  { label: "My Dashboard", href: "/teacher-dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/profile", icon: CircleUser },
  { label: "My Classes", href: "/my-classes", icon: BookOpen },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, featured: true },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles, featured: true },
  { label: "My Lesson Plans", href: "/lesson-plans", icon: ClipboardList },
  { label: "My Schemes of Work", href: "/schemes-of-work", icon: NotebookPen },
  { label: "Question Bank", href: "/question-bank", icon: HelpCircle },
  { label: "Attendance (Mahudhurio)", href: "/attendance", icon: CalendarCheck },
  { label: "Student Attendance", href: "/student-attendance", icon: ClipboardCheck },
  { label: "Mark Entry", href: "/exams", icon: PencilLine },
  { label: "My Timetable", href: "/timetable", icon: CalendarDays },
  { label: "Messages", href: "/communications", icon: MessageSquare },
];

// Inserted only when student_enrollment_enabled = true for the teacher's school.
const WANAFUNZI_NAV_ITEM: NavItem = {
  label: "Wanafunzi",
  href: "/students",
  icon: Users,
};

// Inserted only when the signed-in teacher/HOD has an active class-teacher
// assignment for the school's current term (see getActiveClassTeacherAssignments()).
// Hiding this link is a UX convenience only — /my-class re-checks the
// assignment server-side regardless of whether this item is shown.
const MY_CLASS_NAV_ITEM: NavItem = {
  label: "My Class",
  href: "/my-class",
  icon: Home,
};

// Inserted only when the signed-in account has at least one VERIFIED guardian
// link (see my_verified_children_count() RPC). This is role-independent by
// design — a teacher, HOD, bursar, etc. who is also a verified parent/guardian
// gets this item without any change to their staff role or permissions.
// Hiding this link is a UX convenience only — /my-children re-checks the
// verified link server-side (via RLS) regardless of whether this item is shown.
const MY_CHILDREN_NAV_ITEM: NavItem = {
  label: "My Children",
  href: "/my-children",
  icon: Heart,
};

/* =========================
   HOD NAVIGATION
========================= */

const HOD_NAV: NavItem[] = [
  { label: "My Dashboard", href: "/teacher-dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/profile", icon: CircleUser },
  { label: "My Classes", href: "/my-classes", icon: BookOpen },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles, featured: true },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles, featured: true },
  { label: "Lesson Plans (Review)", href: "/lesson-plans", icon: ClipboardList },
  { label: "Schemes of Work (Review)", href: "/schemes-of-work", icon: NotebookPen },
  { label: "Question Bank", href: "/question-bank", icon: HelpCircle },
  { label: "Attendance (Mahudhurio)", href: "/attendance", icon: CalendarCheck },
  { label: "Student Attendance", href: "/student-attendance", icon: ClipboardCheck },
  { label: "Mark Entry", href: "/exams", icon: PencilLine },
  { label: "My Timetable", href: "/timetable", icon: CalendarDays },
  { label: "Messages", href: "/communications", icon: MessageSquare },
];

/* =========================
   BURSAR NAVIGATION
========================= */

const BURSAR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/bursar-dashboard", icon: LayoutDashboard },
  { label: "My Profile", href: "/profile", icon: CircleUser },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles, featured: true },
  { label: "Fee Structure", href: "/fees/structure", icon: Wallet },
  { label: "Fee Payments (Ada)", href: "/fees/payments", icon: Wallet },
  { label: "Fee Defaulters", href: "/fees/defaulters", icon: BarChart3 },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Finance Reports", href: "/fees/reports", icon: BarChart3 },
  { label: "Communications", href: "/communications", icon: MessageSquare },
];

/* =========================
   ROLE NAVIGATION SELECTOR
========================= */

function navForRole(
  role: string,
  studentEnrollmentEnabled: boolean,
  hasActiveClassTeacherAssignment: boolean,
  hasVerifiedChildren: boolean
): NavItem[] {
  let items: NavItem[];

  switch (role) {
    case "principal":
    case "deputy_principal":
    case "super_admin":
    case "admin":
    case "school_admin":
      items = [...PRINCIPAL_NAV];
      break;

    case "hod": {
      const [dashboard, profile, ...rest] = HOD_NAV;
      const built = [dashboard, profile];
      if (hasActiveClassTeacherAssignment) built.push(MY_CLASS_NAV_ITEM);
      items = [...built, ...rest];
      break;
    }

    case "teacher": {
      // isTeacher && school.student_enrollment_enabled, per spec section 3.
      // UX only — real enforcement is in middleware + RLS, not here.
      const [dashboard, profile, ...rest] = TEACHER_NAV_BASE;
      const built = [dashboard, profile];
      if (hasActiveClassTeacherAssignment) built.push(MY_CLASS_NAV_ITEM);
      if (studentEnrollmentEnabled) built.push(WANAFUNZI_NAV_ITEM);
      items = [...built, ...rest];
      break;
    }

    case "bursar":
      items = [...BURSAR_NAV];
      break;

    default:
      items = [...TEACHER_NAV_BASE];
  }

  // Role-independent: shown for ANY signed-in account (teacher, HOD, bursar,
  // principal, ...) that has at least one verified guardian-student link.
  // Being staff never implies this — it strictly follows a verified link.
  if (hasVerifiedChildren) {
    items = [...items, MY_CHILDREN_NAV_ITEM];
  }

  return items;
}

/* =========================
   SIDEBAR CONTENT
========================= */

export function SidebarContent({
  role,
  studentEnrollmentEnabled = false,
  hasActiveClassTeacherAssignment = false,
  hasVerifiedChildren = false,
}: {
  role: string;
  studentEnrollmentEnabled?: boolean;
  hasActiveClassTeacherAssignment?: boolean;
  hasVerifiedChildren?: boolean;
}) {
  const pathname = usePathname();
  const items = navForRole(
    role,
    studentEnrollmentEnabled,
    hasActiveClassTeacherAssignment,
    hasVerifiedChildren
  );

  return (
    <>
      {/* LOGO */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <GraduationCap size={26} className="text-eduke-gold" />
        <div>
          <p className="font-bold text-lg leading-none">EduKe</p>
          <p className="text-[11px] text-white/70">🇰🇪 Kenyan Schools</p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-white/15 font-semibold" : "text-white/85 hover:bg-white/10"
              } ${item.featured ? "ring-1 ring-eduke-gold/70" : ""}`}
            >
              <Icon size={18} className={item.featured ? "text-eduke-gold" : ""} />
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
  studentEnrollmentEnabled = false,
  hasActiveClassTeacherAssignment = false,
  hasVerifiedChildren = false,
}: {
  role: string;
  studentEnrollmentEnabled?: boolean;
  hasActiveClassTeacherAssignment?: boolean;
  hasVerifiedChildren?: boolean;
}) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-eduke-green text-white h-screen sticky top-0">
      <SidebarContent
        role={role}
        studentEnrollmentEnabled={studentEnrollmentEnabled}
        hasActiveClassTeacherAssignment={hasActiveClassTeacherAssignment}
        hasVerifiedChildren={hasVerifiedChildren}
      />
    </aside>
  );
}