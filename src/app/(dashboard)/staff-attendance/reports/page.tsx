import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import {
  Users,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  UserX,
  TrendingUp,
  FileBarChart,
} from "lucide-react";

import StaffAttendanceReportFilters from "./StaffAttendanceReportFilters";
import StaffAttendanceExportButton from "./StaffAttendanceExportButton";

type SearchParams = {
  start?: string;
  end?: string;
  role?: string;
  staff?: string;
};

export default async function StaffAttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  /*
   * =========================================================
   * AUTHORIZATION
   * =========================================================
   */

  const allowedRoles = [
    "principal",
    "deputy_principal",
    "super_admin",
  ];

  if (!allowedRoles.includes(profile.role)) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h1 className="font-semibold text-red-800">
          Access Denied
        </h1>

        <p className="text-sm text-red-600 mt-1">
          You do not have permission to view attendance reports.
        </p>
      </div>
    );
  }

  /*
   * =========================================================
   * SCHOOL TIMEZONE
   * =========================================================
   */

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone =
    school?.timezone ?? "Africa/Nairobi";

  /*
   * =========================================================
   * DEFAULT DATE RANGE
   * LAST 30 DAYS
   * =========================================================
   */

  const now = new Date();

  const defaultEnd =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

  const thirtyDaysAgo = new Date();

  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() - 29
  );

  const defaultStart =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(thirtyDaysAgo);

  const startDate =
    params.start ?? defaultStart;

  const endDate =
    params.end ?? defaultEnd;

  /*
   * =========================================================
   * FETCH ACTIVE STAFF
   * =========================================================
   */

  const { data: staff, error: staffError } =
    await supabase
      .from("staff")
      .select(`
        id,
        first_name,
        last_name,
        role,
        department,
        staff_number
      `)
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name");

  if (staffError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h1 className="font-semibold text-red-800">
          Could not load staff
        </h1>

        <p className="text-sm text-red-600 mt-1">
          {staffError.message}
        </p>
      </div>
    );
  }

  /*
   * =========================================================
   * FETCH ATTENDANCE RANGE
   * =========================================================
   */

  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from("staff_attendance")
    .select(`
      id,
      staff_id,
      attendance_date,
      sign_in_at,
      sign_out_at,
      status,
      minutes_late
    `)
    .eq("school_id", profile.school_id)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate);

  if (attendanceError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h1 className="font-semibold text-red-800">
          Could not load attendance reports
        </h1>

        <p className="text-sm text-red-600 mt-1">
          {attendanceError.message}
        </p>
      </div>
    );
  }

  /*
   * =========================================================
   * FILTER STAFF BY ROLE
   * =========================================================
   */

  let filteredStaff = staff ?? [];

  if (
    params.role &&
    params.role !== "all"
  ) {
    filteredStaff = filteredStaff.filter(
      (member) =>
        member.role === params.role
    );
  }

  /*
   * =========================================================
   * FILTER BY STAFF MEMBER
   * =========================================================
   */

  if (
    params.staff &&
    params.staff !== "all"
  ) {
    filteredStaff = filteredStaff.filter(
      (member) =>
        member.id === params.staff
    );
  }

  /*
   * =========================================================
   * CALCULATE WORKING DAYS
   *
   * Currently Monday–Friday.
   * Later we can integrate the school's calendar.
   * =========================================================
   */

  function calculateWorkingDays(
    start: string,
    end: string
  ) {
    let count = 0;

    const current = new Date(
      `${start}T12:00:00`
    );

    const last = new Date(
      `${end}T12:00:00`
    );

    while (current <= last) {
      const day = current.getDay();

      if (day !== 0 && day !== 6) {
        count++;
      }

      current.setDate(
        current.getDate() + 1
      );
    }

    return count;
  }

  const workingDays =
    calculateWorkingDays(
      startDate,
      endDate
    );

  /*
   * =========================================================
   * CREATE STAFF REPORTS
   * =========================================================
   */

  const staffReports = filteredStaff.map(
    (member) => {
      const records = (attendance ?? []).filter(
        (record) =>
          record.staff_id === member.id
      );

      const present =
        records.filter(
          (record) =>
            record.sign_in_at !== null
        ).length;

      const late =
        records.filter(
          (record) =>
            record.status === "late"
        ).length;

      const completed =
        records.filter(
          (record) =>
            record.sign_out_at !== null
        ).length;

      const absent = Math.max(
        workingDays - present,
        0
      );

      const attendanceRate =
        workingDays > 0
          ? Math.round(
              (present / workingDays) * 100
            )
          : 0;

      return {
        ...member,
        workingDays,
        present,
        late,
        absent,
        completed,
        attendanceRate,
      };
    }
  );

  /*
   * =========================================================
   * OVERALL SUMMARY
   * =========================================================
   */

  const totalStaff =
    filteredStaff.length;

  const expectedAttendance =
    totalStaff * workingDays;

  const totalPresent =
    staffReports.reduce(
      (sum, staff) =>
        sum + staff.present,
      0
    );

  const totalLate =
    staffReports.reduce(
      (sum, staff) =>
        sum + staff.late,
      0
    );

  const totalAbsent =
    staffReports.reduce(
      (sum, staff) =>
        sum + staff.absent,
      0
    );

  const overallAttendanceRate =
    expectedAttendance > 0
      ? Math.round(
          (totalPresent /
            expectedAttendance) *
            100
        )
      : 0;

  /*
   * =========================================================
   * UNIQUE ROLES
   * =========================================================
   */

  const roles = Array.from(
    new Set(
      (staff ?? [])
        .map(
          (member) =>
            member.role
        )
        .filter(Boolean)
    )
  );

  /*
   * =========================================================
   * FORMAT DATE RANGE
   * =========================================================
   */

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(
      "en-KE",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: timezone,
      }
    ).format(
      new Date(`${date}T12:00:00`)
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
            <div className="flex items-center gap-2">

            <FileBarChart
                size={24}
                className="text-eduke-green"
            />

            <h1 className="text-xl font-bold text-gray-900">
                Attendance Reports
            </h1>

            </div>

            <p className="text-sm text-gray-500 mt-1">
            Analyze staff attendance performance and trends.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

            <div className="text-sm text-gray-500">
            {formatDate(startDate)}
            {" — "}
            {formatDate(endDate)}
            </div>

            <StaffAttendanceExportButton
            reports={staffReports}
            startDate={startDate}
            endDate={endDate}
            />

        </div>

        </div>


      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

        <ReportCard
          label="Staff"
          value={totalStaff}
          icon={<Users size={18} />}
          color="gray"
        />

        <ReportCard
          label="Working Days"
          value={workingDays}
          icon={<CalendarDays size={18} />}
          color="blue"
        />

        <ReportCard
          label="Present"
          value={totalPresent}
          icon={<CheckCircle2 size={18} />}
          color="green"
        />

        <ReportCard
          label="Late"
          value={totalLate}
          icon={<AlertTriangle size={18} />}
          color="yellow"
        />

        <ReportCard
          label="Absent"
          value={totalAbsent}
          icon={<UserXIcon />}
          color="red"
        />

        <ReportCard
          label="Attendance Rate"
          value={`${overallAttendanceRate}%`}
          icon={<TrendingUp size={18} />}
          color="purple"
        />

      </div>


      {/* FILTERS */}

      <StaffAttendanceReportFilters
        startDate={startDate}
        endDate={endDate}
        selectedRole={
          params.role ?? "all"
        }
        selectedStaff={
          params.staff ?? "all"
        }
        roles={roles as string[]}
        staff={staff ?? []}
      />


      {/* REPORT TABLE */}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-100">

          <h2 className="font-semibold text-gray-900">
            Staff Attendance Summary
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Individual attendance performance for the selected period.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-50">

              <tr>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Staff
                </th>

                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Working Days
                </th>

                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Present
                </th>

                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Late
                </th>

                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Absent
                </th>

                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Attendance
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100">

              {staffReports.length === 0 ? (

                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No staff records found.
                  </td>
                </tr>

              ) : (

                staffReports.map(
                  (member) => (

                    <tr
                      key={member.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-5 py-4">

                        <p className="font-medium text-gray-900">
                          {member.first_name}{" "}
                          {member.last_name}
                        </p>

                        <p className="text-xs text-gray-500 mt-0.5 capitalize">
                          {member.role ??
                            "Staff"}
                        </p>

                      </td>


                      <td className="px-4 py-4 text-center">
                        {member.workingDays}
                      </td>


                      <td className="px-4 py-4 text-center font-medium text-green-700">
                        {member.present}
                      </td>


                      <td className="px-4 py-4 text-center font-medium text-orange-600">
                        {member.late}
                      </td>


                      <td className="px-4 py-4 text-center font-medium text-red-600">
                        {member.absent}
                      </td>


                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex-1 max-w-[120px] h-2 rounded-full bg-gray-100 overflow-hidden">

                            <div
                              className="h-full bg-eduke-green rounded-full"
                              style={{
                                width: `${member.attendanceRate}%`,
                              }}
                            />

                          </div>

                          <span className="font-semibold text-gray-800 text-xs">
                            {member.attendanceRate}%
                          </span>

                        </div>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}


/*
 * =========================================================
 * REPORT CARD
 * =========================================================
 */

function ReportCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color:
    | "gray"
    | "green"
    | "blue"
    | "yellow"
    | "red"
    | "purple";
}) {

  const themes = {

    gray: {
      bg: "bg-gray-50",
      border: "border-gray-100",
      text: "text-gray-800",
      icon: "text-gray-500",
    },

    green: {
      bg: "bg-green-50",
      border: "border-green-100",
      text: "text-green-700",
      icon: "text-green-600",
    },

    blue: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      text: "text-blue-700",
      icon: "text-blue-600",
    },

    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      text: "text-yellow-700",
      icon: "text-yellow-600",
    },

    red: {
      bg: "bg-red-50",
      border: "border-red-100",
      text: "text-red-700",
      icon: "text-red-600",
    },

    purple: {
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-700",
      icon: "text-purple-600",
    },

  };

  const theme = themes[color];

  return (
    <div
      className={`rounded-xl border p-4 ${theme.bg} ${theme.border}`}
    >

      <div className="flex items-center justify-between">

        <p className="text-xs font-medium text-gray-500">
          {label}
        </p>

        <div className={theme.icon}>
          {icon}
        </div>

      </div>

      <p
        className={`text-2xl font-bold mt-2 ${theme.text}`}
      >
        {value}
      </p>

    </div>
  );
}


/*
 * Small internal icon to avoid another import
 */

function UserXIcon() {
  return <span className="text-lg">✕</span>;
}