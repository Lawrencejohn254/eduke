import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import {
  Users,
  LogIn,
  LogOut,
  Clock,
  UserX,
  AlertCircle,
} from "lucide-react";
import StaffAttendanceFilters from "./StaffAttendanceFilters";

export default async function StaffAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    status?: string;
    role?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;

  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  /*
   * =====================================================
   * AUTHORIZATION
   * =====================================================
   */

  const allowedRoles = [
    "principal",
    "deputy_principal",
    "super_admin",
  ];

  const canViewAttendance = allowedRoles.includes(profile.role);

  if (!canViewAttendance) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={24} />

          <div>
            <h1 className="font-semibold text-red-800">
              Access Denied
            </h1>

            <p className="text-sm text-red-600 mt-1">
              You do not have permission to view staff attendance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =====================================================
   * SCHOOL TIMEZONE
   * =====================================================
   */

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone =
    school?.timezone ?? "Africa/Nairobi";

  /*
   * =====================================================
   * SELECTED DATE
   * =====================================================
   */

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const selectedDate =
    params.date || today;

  /*
   * =====================================================
   * ACTIVE STAFF
   * =====================================================
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
        staff_number,
        status
      `)
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name");

  /*
   * =====================================================
   * ATTENDANCE FOR SELECTED DATE
   * =====================================================
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
      sign_in_method,
      sign_out_method,
      status,
      minutes_late
    `)
    .eq("school_id", profile.school_id)
    .eq("attendance_date", selectedDate);

  /*
   * =====================================================
   * ERROR HANDLING
   * =====================================================
   */

  if (staffError || attendanceError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h1 className="font-semibold text-red-800">
          Could not load attendance
        </h1>

        <p className="text-sm text-red-600 mt-2">
          {staffError?.message ||
            attendanceError?.message}
        </p>
      </div>
    );
  }

  /*
   * =====================================================
   * CREATE ATTENDANCE MAP
   * =====================================================
   */

  const attendanceMap = new Map(
    (attendance ?? []).map((record) => [
      record.staff_id,
      record,
    ])
  );

  /*
   * =====================================================
   * MERGE STAFF + ATTENDANCE
   * =====================================================
   */

  let staffRows = (staff ?? []).map(
    (staffMember) => {
      const record = attendanceMap.get(
        staffMember.id
      );

      let attendanceStatus:
        | "not_signed_in"
        | "on_duty"
        | "completed"
        | "late" =
        "not_signed_in";

      if (record?.sign_in_at) {
        attendanceStatus = "on_duty";
      }

      if (record?.sign_out_at) {
        attendanceStatus = "completed";
      }

      if (
        record?.status === "late" &&
        !record?.sign_out_at
      ) {
        attendanceStatus = "late";
      }

      return {
        ...staffMember,
        attendance: record ?? null,
        attendanceStatus,
      };
    }
  );

  /*
   * =====================================================
   * FILTER BY ROLE
   * =====================================================
   */

  if (params.role && params.role !== "all") {
    staffRows = staffRows.filter(
      (staffMember) =>
        staffMember.role === params.role
    );
  }

  /*
   * =====================================================
   * FILTER BY STATUS
   * =====================================================
   */

  if (
    params.status &&
    params.status !== "all"
  ) {
    staffRows = staffRows.filter(
      (staffMember) =>
        staffMember.attendanceStatus ===
        params.status
    );
  }

  /*
   * =====================================================
   * SEARCH STAFF
   * =====================================================
   */

  if (params.search) {
    const search =
      params.search.toLowerCase();

    staffRows = staffRows.filter(
      (staffMember) => {
        const fullName =
          `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase();

        return (
          fullName.includes(search) ||
          staffMember.staff_number
            ?.toLowerCase()
            .includes(search) ||
          staffMember.role
            ?.toLowerCase()
            .includes(search)
        );
      }
    );
  }

  /*
   * =====================================================
   * SUMMARY COUNTS
   * Use unfiltered attendance
   * =====================================================
   */

  const totalStaff =
    staff?.length ?? 0;

  const signedIn =
  attendance?.filter(
    (record) => record.sign_in_at !== null
  ).length ?? 0;

  const signedOut =
    attendance?.filter(
      (record) =>
        record.sign_out_at !== null
    ).length ?? 0;

  const onDuty =
    attendance?.filter(
      (record) =>
        record.sign_in_at !== null &&
        record.sign_out_at === null
    ).length ?? 0;

  const notSignedIn = Math.max(
    totalStaff - signedIn,
    0
  );

  const lateCount =
    attendance?.filter(
      (record) =>
        record.status === "late"
    ).length ?? 0;

  /*
   * =====================================================
   * UNIQUE ROLES
   * =====================================================
   */

  const roles = Array.from(
    new Set(
      (staff ?? [])
        .map((s) => s.role)
        .filter(Boolean)
    )
  );

  /*
   * =====================================================
   * TIME FORMATTER
   * =====================================================
   */

  function formatTime(
    timestamp: string | null | undefined
  ) {
    if (!timestamp) return "—";

    return new Intl.DateTimeFormat(
      "en-KE",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timezone,
      }
    ).format(new Date(timestamp));
  }

  function formatDuration(
  signIn: string | null | undefined,
  signOut: string | null | undefined
) {
  if (!signIn || !signOut) return "—";

  const start = new Date(signIn).getTime();
  const end = new Date(signOut).getTime();

  const difference = end - start;

  if (difference < 0) return "—";

  const totalMinutes = Math.floor(
    difference / 60000
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

  /*
   * =====================================================
   * DATE DISPLAY
   * =====================================================
   */

  const formattedDate =
    new Intl.DateTimeFormat("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(
      new Date(`${selectedDate}T12:00:00`)
    );

  return (
    <div className="space-y-6">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Staff Attendance
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Monitor staff sign-in and sign-out activity.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          {formattedDate}
        </div>

      </div>


      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

        <SummaryCard
          label="Total Staff"
          value={totalStaff}
          icon={<Users size={18} />}
          color="gray"
        />

        <SummaryCard
          label="Signed In"
          value={signedIn}
          icon={<LogIn size={18} />}
          color="green"
        />

        <SummaryCard
          label="Signed Out"
          value={signedOut}
          icon={<LogOut size={18} />}
          color="blue"
        />

        <SummaryCard
          label="On Duty"
          value={onDuty}
          icon={<Clock size={18} />}
          color="orange"
        />

        <SummaryCard
          label="Not Signed In"
          value={notSignedIn}
          icon={<UserX size={18} />}
          color="red"
        />

        <SummaryCard
          label="Late"
          value={lateCount}
          icon={<AlertCircle size={18} />}
          color="yellow"
        />

      </div>


      {/* =================================================
          FILTERS
      ================================================= */}

      <StaffAttendanceFilters
        selectedDate={selectedDate}
        selectedStatus={
          params.status ?? "all"
        }
        selectedRole={
          params.role ?? "all"
        }
        search={params.search ?? ""}
        roles={roles as string[]}
      />


      {/* =================================================
          ATTENDANCE TABLE
      ================================================= */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">

          <div>
            <h2 className="font-semibold text-gray-900">
              Staff Attendance Records
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {staffRows.length} staff member
              {staffRows.length !== 1 ? "s" : ""}
            </p>
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-gray-50 border-b border-gray-100">

              <tr>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Staff
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Role
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Sign In
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Sign Out
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Late
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Duration
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Issues
                </th>

                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-gray-100">

              {staffRows.length === 0 ? (

                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    No staff attendance records found.
                  </td>
                </tr>

              ) : (

                staffRows.map((staffMember) => {

                  const record =
                    staffMember.attendance;

                    const issues: string[] = [];

                  /*
                  * Staff did not sign in
                  */

                  if (!record?.sign_in_at) {
                    issues.push("No sign-in");
                  }

                  /*
                  * Signed in but has not signed out
                  */

                  if (
                    record?.sign_in_at &&
                    !record?.sign_out_at &&
                    selectedDate !== today
                  ) {
                    issues.push("No sign-out");
                  }

                  /*
                  * Late arrival
                  */

                  if (
                    record?.minutes_late &&
                    record.minutes_late > 0
                  ) {
                    issues.push(
                      `${record.minutes_late} min late`
                    );
                  }

                  /*
                  * Short working day
                  *
                  * Only evaluate completed attendance.
                  */

                  if (
                    record?.sign_in_at &&
                    record?.sign_out_at
                  ) {
                    const start = new Date(
                      record.sign_in_at
                    ).getTime();

                    const end = new Date(
                      record.sign_out_at
                    ).getTime();

                    const workedMinutes =
                      Math.floor((end - start) / 60000);

                    /*
                    * Example threshold:
                    * Less than 4 hours.
                    *
                    * Later this should become
                    * configurable per school.
                    */

                    if (workedMinutes < 240) {
                      issues.push("Short workday");
                    }
                  }

                  let statusLabel =
                    "Not Signed In";

                  let statusClass =
                    "bg-gray-100 text-gray-600";

                  if (
                    staffMember.attendanceStatus ===
                    "on_duty"
                  ) {
                    statusLabel =
                      "On Duty";

                    statusClass =
                      "bg-orange-50 text-orange-700";
                  }

                  if (
                    staffMember.attendanceStatus ===
                    "completed"
                  ) {
                    statusLabel =
                      "Completed";

                    statusClass =
                      "bg-blue-50 text-blue-700";
                  }

                  if (
                    staffMember.attendanceStatus ===
                    "late"
                  ) {
                    statusLabel =
                      "Late / On Duty";

                    statusClass =
                      "bg-red-50 text-red-700";
                  }

                  return (

                    <tr
                      key={staffMember.id}
                      className="hover:bg-gray-50 transition-colors"
                    >

                      {/* STAFF */}

                      <td className="px-5 py-4">

                        <div className="font-medium text-gray-900">
                          {staffMember.first_name}{" "}
                          {staffMember.last_name}
                        </div>

                        {staffMember.staff_number && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {staffMember.staff_number}
                          </div>
                        )}

                      </td>


                      {/* ROLE */}

                      <td className="px-5 py-4">

                        <div className="text-gray-700 capitalize">
                          {staffMember.role ??
                            "Staff"}
                        </div>

                        {staffMember.department && (
                          <div className="text-xs text-gray-500">
                            {staffMember.department}
                          </div>
                        )}

                      </td>


                      {/* SIGN IN */}

                      <td className="px-5 py-4 font-medium text-gray-800">

                        {formatTime(
                          record?.sign_in_at
                        )}

                      </td>


                      {/* SIGN OUT */}

                      <td className="px-5 py-4 font-medium text-gray-800">

                        {formatTime(
                          record?.sign_out_at
                        )}

                      </td>


                      {/* MINUTES LATE */}

                      <td className="px-5 py-4">

                        {record?.minutes_late &&
                        record.minutes_late > 0 ? (

                          <span className="text-red-600 font-medium">
                            {record.minutes_late} min
                          </span>

                        ) : (

                          <span className="text-gray-400">
                            —
                          </span>

                        )}

                      </td>

                      {/* WORKING DURATION */}

                    <td className="px-5 py-4">

                      <span className="font-medium text-gray-700">

                        {formatDuration(
                          record?.sign_in_at,
                          record?.sign_out_at
                        )}

                      </span>

                    </td>

                    {/* ATTENDANCE ISSUES */}

                    <td className="px-5 py-4">

                      {issues.length > 0 ? (

                        <div className="flex flex-wrap gap-1">

                          {issues.map((issue) => (

                            <span
                              key={issue}
                              className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700"
                            >
                              {issue}
                            </span>

                          ))}

                        </div>

                      ) : (

                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                          No issues
                        </span>

                      )}

                    </td>


                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>

                      </td>

                    </tr>
                  );
                })

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
 * SUMMARY CARD COMPONENT
 * =========================================================
 */

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color:
    | "gray"
    | "green"
    | "blue"
    | "orange"
    | "red"
    | "yellow";
}) {

  const colors = {
    gray: {
      bg: "bg-gray-50",
      border: "border-gray-100",
      text: "text-gray-700",
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

    orange: {
      bg: "bg-orange-50",
      border: "border-orange-100",
      text: "text-orange-700",
      icon: "text-orange-600",
    },

    red: {
      bg: "bg-red-50",
      border: "border-red-100",
      text: "text-red-700",
      icon: "text-red-600",
    },

    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      text: "text-yellow-700",
      icon: "text-yellow-600",
    },
  };

  const theme = colors[color];

  return (
    <div
      className={`rounded-xl border ${theme.bg} ${theme.border} p-4`}
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