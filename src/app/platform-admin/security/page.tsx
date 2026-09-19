import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { terminateSession } from "./actions";

export const dynamic = "force-dynamic";

interface SecurityOverview {
  failed_otp_attempts_24h: number;
  locked_accounts: number;
  active_sessions: number;
  recent_security_actions_7d: number;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  school_id: string | null;
  school_name: string | null;
  ip: string | null;
  user_agent: string | null;
  updated_at: string;
  not_after: string | null;
  total_count: number;
}

interface FailedOtpRow {
  id: string;
  user_id: string;
  email: string;
  purpose: string;
  attempts: number;
  created_at: string;
  total_count: number;
}

interface AuditRow {
  id: string;
  actor_name: string;
  action: string;
  school_name: string | null;
  created_at: string;
  details: Record<string, unknown> & { result?: string };
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function SecurityCenterPage() {
  const admin = await requirePlatformAdmin("manage_security");
  const supabaseAdmin = createAdminClient();

  const [
    { data: overviewRows, error: overviewError },
    { data: sessions, error: sessionsError },
    { data: failedOtps, error: otpError },
    { data: recentActions, error: actionsError },
  ] = await Promise.all([
    supabaseAdmin.rpc("platform_security_overview"),
    supabaseAdmin.rpc("platform_active_sessions", { page_size: 30, page_offset: 0 }),
    supabaseAdmin.rpc("platform_failed_otp_attempts", { page_size: 20, page_offset: 0 }),
    supabaseAdmin
      .from("audit_log")
      .select("id, actor_name, action, created_at, details, school_id")
      .eq("actor_role", "platform_admin")
      .in("action", ["user.disable", "user.force_logout", "security.terminate_session", "school.suspend"])
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  if (overviewError) console.error("Failed to load security overview:", overviewError);
  if (sessionsError) console.error("Failed to load active sessions:", sessionsError);
  if (otpError) console.error("Failed to load failed OTP attempts:", otpError);
  if (actionsError) console.error("Failed to load recent security actions:", actionsError);

  const overview: SecurityOverview | null = (overviewRows as SecurityOverview[] | null)?.[0] ?? null;
  const sessionRows = (sessions as SessionRow[] | null) ?? [];
  const otpRows = (failedOtps as FailedOtpRow[] | null) ?? [];
  const actionRows = (recentActions as AuditRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Center</h1>
          <p className="text-sm text-gray-400">Sessions, failed logins, and recent security actions.</p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OverviewCard label="Failed OTP Attempts (24h)" value={overview?.failed_otp_attempts_24h ?? 0} />
        <OverviewCard label="Locked Accounts" value={overview?.locked_accounts ?? 0} />
        <OverviewCard label="Active Sessions" value={overview?.active_sessions ?? 0} />
        <OverviewCard label="Security Actions (7d)" value={overview?.recent_security_actions_7d ?? 0} />
      </div>

      {/* Active sessions */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Active Sessions</h2>
        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">School</th>
                <th className="p-3">IP</th>
                <th className="p-3">Device</th>
                <th className="p-3">Last Active</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessionRows.map((s) => (
                <tr key={s.session_id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="p-3 text-white font-medium">
                    {s.first_name} {s.last_name}
                    <p className="text-[10px] text-gray-500 font-normal">{s.email}</p>
                  </td>
                  <td className="p-3 text-gray-300">{s.role ?? "-"}</td>
                  <td className="p-3 text-gray-300">{s.school_name ?? "-"}</td>
                  <td className="p-3 text-gray-400 text-xs">{s.ip ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs truncate max-w-[200px]">{s.user_agent ?? "-"}</td>
                  <td className="p-3 text-gray-400 text-xs">
                    {new Date(s.updated_at).toLocaleString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3">
                    <FormDialogButton
                      triggerLabel="Terminate"
                      triggerClassName="text-xs font-medium text-red-400 hover:underline"
                      title="Terminate this session?"
                      description={`Immediately signs out ${s.first_name ?? s.email} on this device.`}
                      variant="danger"
                      action={terminateSession}
                      hiddenFields={{
                        sessionId: s.session_id,
                        userLabel: `${s.first_name ?? ""} ${s.last_name ?? ""} (${s.email})`,
                      }}
                      confirmLabel="Terminate session"
                    />
                  </td>
                </tr>
              ))}
              {sessionRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-gray-400">
                    No active sessions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failed OTP attempts */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Failed OTP Attempts</h2>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {otpRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No failed OTP attempts recorded.</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {otpRows.map((o) => (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white">{o.email}</p>
                    <p className="text-xs text-gray-500">
                      {o.purpose} · {o.attempts} attempt{o.attempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(o.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent security-related admin actions */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Recent Security Actions</h2>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          {actionRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No recent security actions.</div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {actionRows.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-white font-mono text-xs">{a.action}</span>
                    <span className="text-gray-400 text-xs"> by {a.actor_name}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(a.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Full history: <Link href="/platform-admin/audit" className="text-eduke-gold hover:underline">Audit Log →</Link>
        </p>
      </div>
    </div>
  );
}