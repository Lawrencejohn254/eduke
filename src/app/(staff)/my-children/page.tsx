
import Link from "next/link";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import { formatKES } from "@/lib/format";
import {
  Heart,
  Wallet,
  Award,
  CalendarCheck,
  Clock,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

export default async function MyChildrenPage() {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);

  if (children.length === 0) {
    return (
      <EmptyState
        title="No children linked yet"
        description="Ask your Principal/Admin to link your account to your child's student record under Student → Guardians."
      />
    );
  }

  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id")
    .eq("is_current", true)
    .maybeSingle();

  // Per-child summary stats (balance + attendance rate), same math as the
  // parent dashboard's overview cards, just computed for every child at once.
  const childSummaries = await Promise.all(
    children.map(async (child) => {
      let balance: number | null = null;

      if (currentTerm && child.class_id) {
        const { data: structure } = await supabase
          .from("fee_structure")
          .select("amount")
          .eq("term_id", currentTerm.id)
          .eq("class_id", child.class_id);
        const expected = (structure ?? []).reduce((s, f) => s + Number(f.amount), 0);

        const { data: payments } = await supabase
          .from("fee_payments")
          .select("amount")
          .eq("student_id", child.id)
          .eq("term_id", currentTerm.id)
          .eq("status", "Confirmed");
        const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);

        balance = Math.max(expected - paid, 0);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", child.id)
        .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));

      const present = (attendanceRows ?? []).filter((a) => a.status === "Present").length;
      const attendanceRate =
        attendanceRows && attendanceRows.length
          ? Math.round((present / attendanceRows.length) * 100)
          : null;

      return { child, balance, attendanceRate };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
          <Heart size={18} className="text-pink-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">My Children</h1>
          <p className="text-sm text-gray-500">
            Children verified as linked to your account by your school&apos;s admin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {childSummaries.map(({ child, balance, attendanceRate }) => {
          const initial = child.first_name?.[0]?.toUpperCase() ?? "?";

          return (
            <div
              key={child.id}
              className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
            >
              {/* Child header */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-eduke-green text-white flex items-center justify-center text-base font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {child.className} {child.streamName}
                    {child.admission_number ? ` · Adm No: ${child.admission_number}` : ""}
                  </p>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Fee Balance</p>
                  <p
                    className={`text-sm font-semibold ${
                      balance && balance > 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {balance === null ? "—" : formatKES(balance)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-[11px] text-gray-500">Attendance (30d)</p>
                  <p
                    className={`text-sm font-semibold ${
                      attendanceRate !== null && attendanceRate < 80
                        ? "text-red-600"
                        : "text-gray-900"
                    }`}
                  >
                    {attendanceRate === null ? "No data" : `${attendanceRate}%`}
                  </p>
                </div>
              </div>

              {/* Quick actions -> existing parent-portal pages, ?child= scoped */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/parent/fees?child=${child.id}`}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 border border-gray-100 rounded-lg px-3 py-2 hover:border-eduke-green"
                >
                  <Wallet size={14} /> Fees
                </Link>
                <Link
                  href={`/parent/results?child=${child.id}`}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 border border-gray-100 rounded-lg px-3 py-2 hover:border-eduke-green"
                >
                  <Award size={14} /> Performance
                </Link>
                <Link
                  href={`/parent/attendance?child=${child.id}`}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 border border-gray-100 rounded-lg px-3 py-2 hover:border-eduke-green"
                >
                  <CalendarCheck size={14} /> Attendance
                </Link>
                <Link
                  href={`/parent/timetable?child=${child.id}`}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 border border-gray-100 rounded-lg px-3 py-2 hover:border-eduke-green"
                >
                  <Clock size={14} /> Timetable
                </Link>
              </div>

              {/*
                Homework, Reports and School announcements/notices for this
                child live inside the full parent dashboard below (whatever
                nav/tabs app/parent/* already exposes for them). Rather than
                guess route names here, we link straight into the same
                parent-style dashboard the spec calls for reusing.
              */}
              <Link
                href={`/parent?child=${child.id}`}
                className="flex items-center justify-between gap-2 bg-eduke-green/5 text-eduke-green text-sm font-semibold rounded-lg px-3 py-2.5 hover:bg-eduke-green/10"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap size={16} /> Open full parent dashboard
                </span>
                <ChevronRight size={16} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}