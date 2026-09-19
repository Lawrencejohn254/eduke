import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import Link from "next/link";

interface DashboardOverview {
  total_schools: number;
  active_schools: number;
  suspended_schools: number;
  pending_setup_schools: number;
  pending_signups: number;
  total_active_students: number;
  total_active_staff: number;
  active_parents: number;
  schools_active_today: number;
}

interface SchoolWithStats {
  id: string;
  name: string;
  county: string | null;
  sub_county: string | null;
  school_type: string;
  curriculum: string | null;
  status: "active" | "suspended" | "pending_setup";
  created_at: string;
  student_count: number;
  staff_count: number;
  parent_count: number;
  last_login_at: string | null;
}

interface GrowthPoint {
  month: string;
  new_schools: number;
  new_students: number;
  new_staff: number;
}

interface PendingSignup {
  id: string;
  school_name: string;
  county: string | null;
  sub_county: string | null;
  principal_first_name: string | null;
  principal_last_name: string | null;
  principal_email: string | null;
  created_at: string;
  status: string;
}

const STATUS_BADGE: Record<SchoolWithStats["status"], string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  pending_setup: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function OverviewCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "gold" | "yellow";
}) {
  return (
    <div
      className={
        accent === "yellow"
          ? "bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4"
          : "bg-gray-800 rounded-xl p-4"
      }
    >
      <p className={accent === "yellow" ? "text-xs text-yellow-400" : "text-xs text-gray-400"}>
        {label}
      </p>
      <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

/** Dependency-free grouped bar chart. Keeps the dashboard lightweight
 * per spec (no charting library added just for three thin bars/month). */
function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const max =
    Math.max(1, ...data.flatMap((d) => [d.new_schools, d.new_students, d.new_staff])) || 1;
  const chartHeight = 120;
  const barGroupWidth = 64;
  const width = Math.max(320, data.length * barGroupWidth);

  const bar = (value: number, x: number, color: string) => {
    const h = (value / max) * chartHeight;
    return (
      <rect
        key={`${x}-${color}`}
        x={x}
        y={chartHeight - h}
        width={14}
        height={h}
        rx={2}
        fill={color}
      />
    );
  };

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${chartHeight + 24}`} width={width} height={chartHeight + 24}>
        {data.map((d, i) => {
          const groupX = i * barGroupWidth + 8;
          return (
            <g key={d.month}>
              {bar(d.new_schools, groupX, "#eab308")}
              {bar(d.new_students, groupX + 16, "#22c55e")}
              {bar(d.new_staff, groupX + 32, "#38bdf8")}
              <text
                x={groupX + 24}
                y={chartHeight + 16}
                fontSize="9"
                fill="#9ca3af"
                textAnchor="middle"
              >
                {new Date(d.month).toLocaleDateString("en-KE", { month: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#eab308" }} />
          Schools
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#22c55e" }} />
          Students
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#38bdf8" }} />
          Staff
        </span>
      </div>
    </div>
  );
}

export default async function PlatformAdminHome() {
  // Page-level check for the specific permission this page needs, on top
  // of the layout's generic "is a platform admin" gate.
  await requirePlatformAdmin("view_schools");

  const admin = createAdminClient();

  const [
    { data: overviewRows, error: overviewError },
    { data: schools, error: schoolsError },
    { data: growth, error: growthError },
    { data: pendingSignups, error: signupError },
  ] = await Promise.all([
    admin.rpc("platform_dashboard_overview"),
    admin.rpc("platform_schools_with_stats"),
    admin.rpc("platform_growth_series", { months: 6 }),
    admin
      .from("school_signup_requests")
      .select(
        "id, school_name, county, sub_county, principal_first_name, principal_last_name, principal_email, created_at, status"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (overviewError) console.error("Failed to load dashboard overview:", overviewError);
  if (schoolsError) console.error("Failed to load schools with stats:", schoolsError);
  if (growthError) console.error("Failed to load growth series:", growthError);
  if (signupError) console.error("Failed to load pending signup requests:", signupError);

  const overview: DashboardOverview | null = (overviewRows as DashboardOverview[] | null)?.[0] ?? null;
  const schoolsWithStats = (schools as SchoolWithStats[] | null) ?? [];
  const growthSeries = (growth as GrowthPoint[] | null) ?? [];
  const visiblePendingSignups = (pendingSignups as PendingSignup[] | null) ?? [];
  const pendingSignupCount = visiblePendingSignups.length;

  const loadError = overviewError || schoolsError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">EduKe Platform Admin</h1>
        <p className="text-sm text-gray-400">
          Cross-school oversight — visible only to platform administrators.
        </p>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          Some dashboard data failed to load. Numbers below may be incomplete — check server logs.
        </div>
      )}

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OverviewCard label="Total Schools" value={overview?.total_schools ?? 0} />
        <OverviewCard label="Active Schools" value={overview?.active_schools ?? 0} />
        <OverviewCard label="Suspended Schools" value={overview?.suspended_schools ?? 0} />
        <Link href="/platform-admin/signups">
          <OverviewCard
            label="Pending Signups"
            value={overview?.pending_signups ?? pendingSignupCount}
            accent="yellow"
          />
        </Link>
        <OverviewCard label="Total Active Students" value={overview?.total_active_students ?? 0} />
        <OverviewCard label="Total Active Staff" value={overview?.total_active_staff ?? 0} />
        <OverviewCard label="Active Parents" value={overview?.active_parents ?? 0} />
        <OverviewCard label="Schools Active Today" value={overview?.schools_active_today ?? 0} />
      </div>

      {/* Growth chart */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Growth (last 6 months)</h2>
        {growthSeries.length > 0 ? (
          <GrowthChart data={growthSeries} />
        ) : (
          <p className="text-sm text-gray-500">No growth data yet.</p>
        )}
      </div>

      {/* Pending Signup Requests */}
      {pendingSignupCount > 0 && (
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-yellow-500/20">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <div>
              <h2 className="text-base font-semibold text-white">Pending School Signup Requests</h2>
              <p className="text-xs text-gray-400 mt-1">
                These schools have registered and are waiting for your approval.
              </p>
            </div>
            <Link
              href="/platform-admin/signups"
              className="text-xs font-medium text-eduke-gold hover:underline"
            >
              View all →
            </Link>
          </div>

          <div className="divide-y divide-gray-700/50">
            {visiblePendingSignups.slice(0, 5).map((signup) => (
              <div
                key={signup.id}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/20"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">{signup.school_name}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Principal:{" "}
                    <span className="text-gray-300">
                      {signup.principal_first_name} {signup.principal_last_name}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {signup.county || "No county"}
                    {signup.sub_county ? ` · ${signup.sub_county}` : ""} · {signup.principal_email}
                  </p>
                </div>
                <Link
                  href="/platform-admin/signups"
                  className="shrink-0 rounded-lg bg-eduke-gold px-4 py-2 text-xs font-semibold text-gray-900 hover:opacity-90 transition-opacity"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Schools */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Schools</h2>
        <Link
          href="/platform-admin/schools"
          className="text-xs font-medium text-eduke-gold hover:underline"
        >
          Manage all schools →
        </Link>
      </div>

      {schoolsWithStats.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center text-sm text-gray-400">
          No schools yet — use{" "}
          <code className="text-gray-300">npm run onboard-school</code> to create the first one.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="p-3">School</th>
                <th className="p-3">County</th>
                <th className="p-3">Type</th>
                <th className="p-3">Curriculum</th>
                <th className="p-3">Status</th>
                <th className="p-3">Students</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Last Login</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {schoolsWithStats.slice(0, 25).map((s) => (
                <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-3 font-medium text-white">{s.name}</td>
                  <td className="p-3 text-gray-300">{s.county ?? "-"}</td>
                  <td className="p-3 text-gray-300">{s.school_type}</td>
                  <td className="p-3 text-gray-300">{s.curriculum ?? "-"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[s.status]}`}
                    >
                      {s.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-gray-300">{s.student_count}</td>
                  <td className="p-3 text-gray-300">{s.staff_count}</td>
                  <td className="p-3 text-gray-400 text-xs">
                    {s.last_login_at
                      ? new Date(s.last_login_at).toLocaleString("en-KE", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/platform-admin/${s.id}`}
                      className="text-eduke-gold hover:underline text-xs font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {schoolsWithStats.length > 25 && (
            <div className="px-5 py-3 text-center text-xs text-gray-500 border-t border-gray-700">
              Showing 25 of {schoolsWithStats.length} schools —{" "}
              <Link href="/platform-admin/schools" className="text-eduke-gold hover:underline">
                view all with search &amp; filters
              </Link>
              .
            </div>
          )}
        </div>
      )}
    </div>
  );
}