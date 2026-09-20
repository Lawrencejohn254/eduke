import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import { MONTH_NAMES, type AttendanceRecord } from "@/lib/calendar";
import MonthAttendanceCalendar from "@/components/attendance/MonthAttendanceCalendar";
import MonthNav from "@/components/attendance/MonthNav";
import AttendanceTrendChart, { type MonthlyAttendancePoint } from "@/components/AttendanceTrendChart";

const EARLIEST_YEARS_BACK = 5;

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; year?: string; month?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return (
      <EmptyState
        title="No children linked yet"
        description="Contact the school office to link your account to your child's record."
      />
    );
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  // URL stores month 1-based (more natural in a link/query string); everything else uses 0-11.
  const month = params.month ? Math.min(11, Math.max(0, Number(params.month) - 1)) : now.getMonth();

  const supabase = await createClient();

  const { data: attendance } = await supabase
    .from("attendance")
    .select("date, status, notes")
    .eq("student_id", activeChild.id)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`)
    .order("date", { ascending: false });

  const yearRecords: AttendanceRecord[] = attendance ?? [];
  const monthRecords = yearRecords.filter((r) => Number(r.date.slice(5, 7)) - 1 === month);

  const present = yearRecords.filter((a) => a.status === "Present").length;
  const rate = yearRecords.length ? Math.round((present / yearRecords.length) * 100) : null;

  // Monthly attendance rate for the trend chart — null (gap in the line) for months with
  // no recorded school days yet, rather than pretending they were 0%.
  const monthlyTrend: MonthlyAttendancePoint[] = MONTH_NAMES.map((name, monthIndex) => {
    const recordsForMonth = yearRecords.filter((r) => Number(r.date.slice(5, 7)) - 1 === monthIndex);
    if (recordsForMonth.length === 0) return { month: name.slice(0, 3), rate: null };
    const monthPresent = recordsForMonth.filter((r) => r.status === "Present").length;
    return { month: name.slice(0, 3), rate: Math.round((monthPresent / recordsForMonth.length) * 100) };
  });

  const notedRecords = monthRecords.filter((r) => r.notes && r.notes.trim() !== "");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance (Mahudhurio)</h1>
          <p className="text-sm text-gray-500">
            {activeChild.first_name} {activeChild.last_name}
            {rate !== null && ` · ${rate}% attendance rate in ${year}`}
          </p>
        </div>
        <ChildSelector
          children={children.map((c) => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            className: c.className,
          }))}
        />
      </div>

      {yearRecords.length === 0 ? (
        <EmptyState
          title="No attendance records yet"
          description={`No attendance was recorded for ${year}. Daily attendance will appear here once recorded by the class teacher.`}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <p className="text-sm font-semibold text-gray-900 mb-2">Attendance trend</p>
          <AttendanceTrendChart data={monthlyTrend} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
          <MonthNav year={year} month={month} earliestYear={now.getFullYear() - EARLIEST_YEARS_BACK} />
        </div>
        <MonthAttendanceCalendar year={year} month={month} records={monthRecords} />
      </div>

      {notedRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 px-4 pt-4">
            Notes — {MONTH_NAMES[month]} {year}
          </p>
          <div className="eduke-table-wrap">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {notedRecords.map((a, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="p-3 text-gray-700 whitespace-nowrap">{formatDateDMY(a.date)}</td>
                    <td className="p-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-3 text-gray-500">{a.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}