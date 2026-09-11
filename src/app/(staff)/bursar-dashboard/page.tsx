import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import StatCard from "@/components/StatCard";
import { formatKES, formatDateDMY } from "@/lib/format";
import { Wallet, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import StaffAttendanceCard from "@/components/StaffAttendanceCard";

export default async function BursarDashboardPage() {
  const profile = await getProfileOrRedirect();
  if (profile.role !== "bursar" && !["principal", "deputy_principal", "super_admin"].includes(profile.role)) {
    redirect("/teacher-dashboard");
  }

  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone = school?.timezone ?? "Africa/Nairobi";

  const attendanceToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: myStaffRecord } = await supabase
    .from("staff")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const { data: myTodayAttendance } = myStaffRecord
    ? await supabase
        .from("staff_attendance")
        .select(`
          id,
          school_id,
          staff_id,
          attendance_date,
          sign_in_at,
          sign_out_at,
          sign_in_method,
          sign_out_method,
          status,
          minutes_late,
          created_at,
          updated_at
        `)
        .eq("staff_id", myStaffRecord.id)
        .eq("attendance_date", attendanceToday)
        .maybeSingle()
    : { data: null };

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data: allPayments } = currentTerm
    ? await supabase
        .from("fee_payments")
        .select("amount, payment_date, payment_method, receipt_number, status, student:students!inner(first_name, last_name, admission_number, school_id)")
        .eq("term_id", currentTerm.id)
        .eq("student.school_id", profile.school_id)
        .order("payment_date", { ascending: false })
    : { data: [] };

  const confirmed = (allPayments ?? []).filter((p) => p.status === "Confirmed");
  const todayTotal = confirmed.filter((p) => p.payment_date?.slice(0, 10) === today).reduce((s, p) => s + Number(p.amount), 0);
  const weekTotal = confirmed.filter((p) => new Date(p.payment_date) >= weekAgo).reduce((s, p) => s + Number(p.amount), 0);
  const monthTotal = confirmed.filter((p) => new Date(p.payment_date) >= monthAgo).reduce((s, p) => s + Number(p.amount), 0);
  const termTotal = confirmed.reduce((s, p) => s + Number(p.amount), 0);

  const pending = (allPayments ?? []).filter((p) => p.status === "Pending");
  const recent = confirmed.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Bursar Dashboard</h1>
        <p className="text-sm text-gray-500">
          {currentTerm ? `${(currentTerm.academic_year as unknown as { year: number })?.year} · ${currentTerm.term_number}` : "No current term set"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Collected Today" value={formatKES(todayTotal)} icon={Wallet} />
        <StatCard label="Collected This Week" value={formatKES(weekTotal)} icon={TrendingUp} />
        <StatCard label="Collected Last 30 Days" value={formatKES(monthTotal)} icon={TrendingUp} />
        <StatCard label="Collected This Term" value={formatKES(termTotal)} icon={Receipt} />
      </div>

      <div className="lg:max-w-sm">
        <StaffAttendanceCard initialAttendance={myTodayAttendance} timezone={timezone} />
      </div>

      {pending.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
            <AlertTriangle size={16} /> {pending.length} payment(s) pending confirmation
          </p>
          <p className="text-xs text-orange-700 mt-1">These are usually payments initiated online that haven't been confirmed yet.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Recent Payments</p>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded yet this term.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((p, i) => {
                const student = p.student as unknown as { first_name: string; last_name: string; admission_number: string };
                return (
                  <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <div>
                      <p className="text-gray-800">{student.first_name} {student.last_name}</p>
                      <p className="text-xs text-gray-400">{p.receipt_number} · {p.payment_method}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatKES(p.amount)}</p>
                      <p className="text-xs text-gray-400">{formatDateDMY(p.payment_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</p>
            <div className="space-y-2">
              <Link href="/fees/payments" className="block text-sm text-eduke-green font-medium hover:underline">Record a payment →</Link>
              <Link href="/fees/defaulters" className="block text-sm text-eduke-green font-medium hover:underline">View fee defaulters →</Link>
              <Link href="/fees/structure" className="block text-sm text-eduke-green font-medium hover:underline">Manage fee structure →</Link>
              <Link href="/fees/reports" className="block text-sm text-eduke-green font-medium hover:underline">Finance reports →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
