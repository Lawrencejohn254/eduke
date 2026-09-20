import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import StaffAttendanceCard from "@/components/StaffAttendanceCard";
import { formatDateDMY, formatMinutesLate } from "@/lib/format";

export default async function SupportAttendancePage() {
  const profile = await getProfileOrRedirect();
  if (
    profile.role !== "support_staff" &&
    !["principal", "deputy_principal", "super_admin"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: school } = await supabase.from("schools").select("timezone").eq("id", profile.school_id).maybeSingle();
  const timezone = school?.timezone ?? "Africa/Nairobi";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const [{ data: todayAttendance }, { data: history }] = await Promise.all([
    staffRecord
      ? supabase.from("staff_attendance").select("*").eq("staff_id", staffRecord.id).eq("attendance_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    staffRecord
      ? supabase
          .from("staff_attendance")
          .select("id, attendance_date, sign_in_at, sign_out_at, status, minutes_late")
          .eq("staff_id", staffRecord.id)
          .order("attendance_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock size={20} /> Attendance
        </h1>
        <p className="text-sm text-gray-500">Sign in, sign out, and review your attendance history.</p>
      </div>

      <div className="max-w-sm">
        <StaffAttendanceCard initialAttendance={todayAttendance as never} timezone={timezone} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">My Attendance History</h2>
        </div>
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No attendance recorded yet.</p>
        ) : (
          <div className="eduke-table-wrap">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Sign In</th>
                  <th className="p-3">Sign Out</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Late</th>
                </tr>
              </thead>
              <tbody>
                {(history ?? []).map((h) => (
                  <tr key={h.id} className="border-b border-gray-50">
                    <td className="p-3 text-gray-700">{formatDateDMY(h.attendance_date)}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {h.sign_in_at
                        ? new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone }).format(new Date(h.sign_in_at))
                        : "-"}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {h.sign_out_at
                        ? new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone }).format(new Date(h.sign_out_at))
                        : "-"}
                    </td>
                    <td className="p-3 text-gray-600 capitalize">{h.status}</td>
                    <td className="p-3 text-xs text-gray-500">{h.minutes_late > 0 ? formatMinutesLate(h.minutes_late) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}