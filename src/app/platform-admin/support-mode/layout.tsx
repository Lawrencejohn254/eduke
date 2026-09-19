import Link from "next/link";
import {
  requirePlatformAdmin,
  type PlatformAdminContext,
  type PlatformPermission,
} from "@/lib/supabase/platform-admin-guard";
import SignOutButton from "@/components/SignOutButton";

interface NavItem {
  label: string;
  href: string;
  permission?: PlatformPermission; // undefined = visible to any platform admin
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "PLATFORM",
    items: [
      { label: "Dashboard", href: "/platform-admin" },
      { label: "Schools", href: "/platform-admin/schools", permission: "view_schools" },
      { label: "School Signups", href: "/platform-admin/signups", permission: "approve_signups" },
      { label: "Users", href: "/platform-admin/users", permission: "manage_users" },
      { label: "Analytics", href: "/platform-admin/analytics", permission: "view_schools" },
    ],
  },
  {
    heading: "OPERATIONS",
    items: [
      { label: "Support", href: "/platform-admin/support", permission: "view_support_tickets" },
      { label: "Notifications", href: "/platform-admin/notifications", permission: "manage_notifications" },
      { label: "School Health", href: "/platform-admin/health", permission: "view_schools" },
    ],
  },
  {
    heading: "SECURITY",
    items: [
      { label: "Security Center", href: "/platform-admin/security", permission: "manage_security" },
      { label: "Audit Log", href: "/platform-admin/audit", permission: "view_audit_logs" },
      { label: "Sessions", href: "/platform-admin/security/sessions", permission: "manage_security" },
      { label: "Support Mode", href: "/platform-admin/support-mode", permission: "use_support_mode" },
    ],
  },
  {
    heading: "FINANCE",
    items: [{ label: "Billing", href: "/platform-admin/billing", permission: "view_billing" }],
  },
  {
    heading: "CONFIGURATION",
    items: [
      { label: "Feature Flags", href: "/platform-admin/features", permission: "manage_feature_flags" },
      { label: "Platform Settings", href: "/platform-admin/settings", permission: "manage_platform_settings" },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "System Health", href: "/platform-admin/system", permission: "manage_platform_settings" },
      { label: "Backups", href: "/platform-admin/backups", permission: "manage_platform_settings" },
    ],
  },
];

function visibleGroups(admin: PlatformAdminContext): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || admin.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single choke point: unauthenticated -> /login, not a platform admin ->
  // 404. Every nested page/server action should ALSO call
  // requirePlatformAdmin(permission) itself before touching data — this
  // layout check is not sufficient on its own for, e.g., a server action
  // invoked directly, only for page rendering.
  const admin = await requirePlatformAdmin();
  const groups = visibleGroups(admin);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-64 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-sm font-bold text-white">EduKe Platform</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{admin.email}</p>
        </div>

        <form action="/platform-admin/search" method="get" className="px-3 pt-3">
          <input
            type="text"
            name="q"
            placeholder="Search schools, staff, students…"
            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-1.5 text-xs text-white placeholder:text-gray-500"
          />
        </form>

        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {groups.map((group) => (
            <div key={group.heading} className="px-3">
              <p className="px-2 text-[10px] font-semibold tracking-wider text-gray-500 mb-1">
                {group.heading}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <SignOutButton variant="dark" />
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}