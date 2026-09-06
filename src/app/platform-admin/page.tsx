import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default async function PlatformAdminHome() {
  const admin = createAdminClient();

  // Existing schools
  const { data: schools } = await admin
    .from("schools")
    .select("id, name, county, school_type, curriculum, created_at")
    .order("created_at", { ascending: false });

  // Pending school signup requests
  const { data: pendingSignups, error: signupError } = await admin
    .from("school_signup_requests")
    .select(
      "id, school_name, county, sub_county, principal_first_name, principal_last_name, principal_email, created_at, status"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (signupError) {
    console.error(
      "Failed to load pending signup requests:",
      signupError
    );
  }

  const schoolsWithStats = await Promise.all(
    (schools ?? []).map(async (s) => {
      const [
        { count: studentCount },
        { count: staffCount },
        { data: lastLogin },
      ] = await Promise.all([
        admin
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("school_id", s.id)
          .eq("status", "Active"),

        admin
          .from("staff")
          .select("id", { count: "exact", head: true })
          .eq("school_id", s.id)
          .eq("status", "Active"),

        admin
          .from("login_sessions")
          .select("logged_in_at")
          .eq("school_id", s.id)
          .order("logged_in_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        ...s,
        studentCount: studentCount ?? 0,
        staffCount: staffCount ?? 0,
        lastLoginAt: lastLogin?.logged_in_at ?? null,
      };
    })
  );

  const totalStudents = schoolsWithStats.reduce(
    (sum, s) => sum + s.studentCount,
    0
  );

  const totalStaff = schoolsWithStats.reduce(
    (sum, s) => sum + s.staffCount,
    0
  );

  const visiblePendingSignups = pendingSignups ?? [];
  const pendingSignupCount = visiblePendingSignups.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            EduKe Platform Admin
          </h1>

          <p className="text-sm text-gray-400">
            Cross-school oversight — visible only to platform administrators.
          </p>
        </div>

        <SignOutButton variant="dark" />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Schools */}
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">
            Total Schools
          </p>

          <p className="text-2xl font-bold text-white mt-1">
            {schoolsWithStats.length}
          </p>
        </div>

        {/* Students */}
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">
            Total Active Students
          </p>

          <p className="text-2xl font-bold text-white mt-1">
            {totalStudents}
          </p>
        </div>

        {/* Staff */}
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400">
            Total Active Staff
          </p>

          <p className="text-2xl font-bold text-white mt-1">
            {totalStaff}
          </p>
        </div>

        {/* Pending Signups */}
        <Link
          href="/platform-admin/signups"
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 hover:bg-yellow-500/15 transition-colors"
        >
          <p className="text-xs text-yellow-400">
            Pending Signups
          </p>

          <div className="flex items-center justify-between mt-1">
            <p className="text-2xl font-bold text-white">
              {pendingSignupCount}
            </p>

            <span className="text-xs font-medium text-yellow-400">
              Review →
            </span>
          </div>
        </Link>
      </div>

      {/* Pending Signup Requests */}
      {pendingSignupCount > 0 && (
        <div className="bg-gray-800 rounded-xl overflow-hidden border border-yellow-500/20">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <div>
              <h2 className="text-base font-semibold text-white">
                Pending School Signup Requests
              </h2>

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
            {(pendingSignups ?? []).slice(0, 5).map((signup) => (
              <div
                key={signup.id}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-700/20"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {signup.school_name}
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    Principal:{" "}
                    <span className="text-gray-300">
                      {signup.principal_first_name}{" "}
                      {signup.principal_last_name}
                    </span>
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {signup.county || "No county"}
                    {signup.sub_county
                      ? ` · ${signup.sub_county}`
                      : ""}
                    {" · "}
                    {signup.principal_email}
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
      {schoolsWithStats.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center text-sm text-gray-400">
          No schools yet — use{" "}
          <code className="text-gray-300">
            npm run onboard-school
          </code>{" "}
          to create the first one.
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
                <th className="p-3">School</th>
                <th className="p-3">County</th>
                <th className="p-3">Type</th>
                <th className="p-3">Curriculum</th>
                <th className="p-3">Students</th>
                <th className="p-3">Staff</th>
                <th className="p-3">Last Login</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {schoolsWithStats.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30"
                >
                  <td className="p-3 font-medium text-white">
                    {s.name}
                  </td>

                  <td className="p-3 text-gray-300">
                    {s.county ?? "-"}
                  </td>

                  <td className="p-3 text-gray-300">
                    {s.school_type}
                  </td>

                  <td className="p-3 text-gray-300">
                    {s.curriculum ?? "-"}
                  </td>

                  <td className="p-3 text-gray-300">
                    {s.studentCount}
                  </td>

                  <td className="p-3 text-gray-300">
                    {s.staffCount}
                  </td>

                  <td className="p-3 text-gray-400 text-xs">
                    {s.lastLoginAt
                      ? new Date(
                          s.lastLoginAt
                        ).toLocaleString("en-KE", {
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
        </div>
      )}
    </div>
  );
}