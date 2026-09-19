import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

interface HealthRow {
  id: string;
  name: string;
  status: "active" | "suspended" | "pending_setup";
  last_login_at: string | null;
  last_attendance_at: string | null;
  last_exam_at: string | null;
  last_fee_payment_at: string | null;
  active_staff_count: number;
  active_student_count: number;
  has_classes: boolean;
  has_subjects: boolean;
  days_since_activity: number | null;
  health_status: "setup_incomplete" | "inactive" | "low_activity" | "attention_required" | "active";
}

const HEALTH_LABEL: Record<HealthRow["health_status"], { label: string; className: string }> = {
  active: { label: "Active", className: "border-green-500/20 bg-green-500/10 text-green-400" },
  low_activity: { label: "Low Activity", className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400" },
  inactive: { label: "Inactive", className: "border-red-500/20 bg-red-500/10 text-red-400" },
  setup_incomplete: { label: "Setup Incomplete", className: "border-blue-500/20 bg-blue-500/10 text-blue-400" },
  attention_required: { label: "Attention Required", className: "border-orange-500/20 bg-orange-500/10 text-orange-400" },
};

export default async function SchoolHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin("view_schools");
  const params = await searchParams;
  const filter = params.status as HealthRow["health_status"] | undefined;

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc("platform_school_health");

  if (error) console.error("Failed to load school health:", error);

  const allRows = (data as HealthRow[] | null) ?? [];
  const rows = filter ? allRows.filter((r) => r.health_status === filter) : allRows;

  const counts = allRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.health_status] = (acc[r.health_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">School Health</h1>
          <p className="text-sm text-gray-400">
            Monitoring only — nothing here automatically suspends a school.
          </p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/platform-admin/health"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
            !filter ? "bg-eduke-gold text-gray-900 border-eduke-gold" : "text-gray-300 border-gray-700 hover:bg-gray-800"
          }`}
        >
          All ({allRows.length})
        </Link>
        {(Object.keys(HEALTH_LABEL) as HealthRow["health_status"][]).map((key) => (
          <Link
            key={key}
            href={`?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
              filter === key ? "bg-eduke-gold text-gray-900 border-eduke-gold" : "text-gray-300 border-gray-700 hover:bg-gray-800"
            }`}
          >
            {HEALTH_LABEL[key].label} ({counts[key] ?? 0})
          </Link>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="p-3">School</th>
              <th className="p-3">Health</th>
              <th className="p-3">Last Activity</th>
              <th className="p-3">Last Login</th>
              <th className="p-3">Last Attendance</th>
              <th className="p-3">Last Exam</th>
              <th className="p-3">Last Fee Payment</th>
              <th className="p-3">Staff</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                <td className="p-3 font-medium text-white">
                  {r.name}
                  {(!r.has_classes || !r.has_subjects) && (
                    <p className="text-[10px] text-blue-400 mt-0.5">
                      Missing {!r.has_classes && "classes"}
                      {!r.has_classes && !r.has_subjects && " & "}
                      {!r.has_subjects && "subjects"}
                    </p>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${HEALTH_LABEL[r.health_status].className}`}
                  >
                    {HEALTH_LABEL[r.health_status].label}
                  </span>
                </td>
                <td className="p-3 text-gray-300 text-xs">
                  {r.days_since_activity === null ? "No activity yet" : `${r.days_since_activity} days ago`}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.last_login_at
                    ? new Date(r.last_login_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                    : "Never"}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.last_attendance_at
                    ? new Date(r.last_attendance_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                    : "Never"}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.last_exam_at
                    ? new Date(r.last_exam_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                    : "Never"}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.last_fee_payment_at
                    ? new Date(r.last_fee_payment_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                    : "Never"}
                </td>
                <td className="p-3 text-gray-300">{r.active_staff_count}</td>
                <td className="p-3">
                  <Link
                    href={`/platform-admin/${r.id}`}
                    className="text-xs font-medium text-eduke-gold hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-gray-400">
                  No schools in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}