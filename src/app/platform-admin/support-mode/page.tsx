import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { getActiveSupportSession } from "@/lib/platform-admin/support-mode";
import { startSupportSession, endSupportSession } from "./actions";

export const dynamic = "force-dynamic";

const ROLES = ["principal", "deputy_principal", "hod", "teacher", "bursar"];

interface SchoolDetail {
  active_student_count: number;
  active_staff_count: number;
  active_parent_count: number;
  class_count: number;
  stream_count: number;
  subject_count: number;
  last_principal_login_at: string | null;
  last_staff_login_at: string | null;
  last_parent_login_at: string | null;
}

function fmt(v: string | null) {
  if (!v) return "Never";
  return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function SupportModePage() {
  const admin = await requirePlatformAdmin("use_support_mode");
  const session = await getActiveSupportSession(admin);
  const supabaseAdmin = createAdminClient();

  if (!session) {
    const { data: schools } = await supabaseAdmin.from("schools").select("id, name").eq("status", "active").order("name");

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Mode</h1>
          <p className="text-sm text-gray-400">Temporary, read-only, time-boxed access to a school for troubleshooting.</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300">
          This does not log you in as anyone else, and no write actions are available here. It opens a 30-minute,
          read-only view of the school&apos;s data inside the platform-admin console, and closes automatically. It is
          not a live view of the exact interface a teacher or principal sees — that would require support mode
          awareness inside the school-facing app itself, which this build doesn&apos;t touch.
        </div>

        <form action={startSupportSession} className="bg-gray-800 rounded-xl p-5 space-y-4 max-w-lg">
          <div>
            <label className="block text-xs text-gray-400 mb-1">School</label>
            <select name="schoolId" required defaultValue="" className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
              <option value="" disabled>
                Select a school…
              </option>
              {(schools ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">View as role</label>
            <select name="role" required defaultValue={ROLES[0]} className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Used for labeling and the audit record — the data shown is the same read-only overview regardless of role.
            </p>
          </div>

          <button type="submit" className="rounded-lg bg-eduke-gold px-5 py-2.5 text-sm font-semibold text-gray-900 hover:opacity-90">
            Start 30-minute support session
          </button>
        </form>
      </div>
    );
  }

  // Active session: render the read-only mirror.
  const { data: detailRows } = await supabaseAdmin.rpc("platform_school_detail", {
    target_school_id: session.target_school_id,
  });
  const school: SchoolDetail | null = (detailRows as SchoolDetail[] | null)?.[0] ?? null;
  const expiresIn = Math.max(0, Math.round((new Date(session.expires_at).getTime() - Date.now()) / 60000));

  return (
    <div className="space-y-6">
      {/* Required banner */}
      <div className="bg-orange-500/15 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-orange-300">
          SUPPORT MODE — You are viewing {session.target_name} as {session.role_used.replace("_", " ")}.
          Read-only. Expires in {expiresIn} minute{expiresIn === 1 ? "" : "s"}.
        </p>
        <form action={endSupportSession}>
          <input type="hidden" name="sessionId" value={session.id} />
          <button type="submit" className="text-xs font-semibold text-orange-200 underline hover:no-underline">
            End session now
          </button>
        </form>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{session.target_name}</h1>
        <p className="text-sm text-gray-400">Read-only overview. No edits are possible from this view.</p>
      </div>

      {school ? (
        <div className="bg-gray-800 rounded-xl p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400">Active Students</p>
              <p className="text-lg font-semibold text-white">{school.active_student_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Active Staff</p>
              <p className="text-lg font-semibold text-white">{school.active_staff_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Active Parents</p>
              <p className="text-lg font-semibold text-white">{school.active_parent_count}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Classes / Streams / Subjects</p>
              <p className="text-lg font-semibold text-white">
                {school.class_count} / {school.stream_count} / {school.subject_count}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last Principal Login</p>
              <p className="text-sm text-white">{fmt(school.last_principal_login_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Last Staff Login</p>
              <p className="text-sm text-white">{fmt(school.last_staff_login_at)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">Could not load school data.</p>
      )}

      <p className="text-xs text-gray-500">
        Full detail page:{" "}
        <Link href={`/platform-admin/${session.target_school_id}`} className="text-eduke-gold hover:underline">
          View {session.target_name} →
        </Link>
      </p>
    </div>
  );
}