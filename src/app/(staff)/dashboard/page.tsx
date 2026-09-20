import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import StaffAttendanceCard from "@/components/StaffAttendanceCard";
import StudentSearchBar from "@/components/StudentSearchBar";
import StatCard from "@/components/StatCard";
import {
  FeeCollectionChart,
  AttendancePieChart,
  SubjectAveragesChart,
} from "@/components/DashboardCharts";
import { formatKES } from "@/lib/format";
import {
  Users,
  UserCog,
  UserCheck,
  Wallet,
  AlertTriangle,
  Megaphone,
  FileWarning,
  Download,
  LogIn,
  LogOut,
  Clock,
  UserX,
  ArrowRight,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await getProfileOrRedirect();

  /*
   * =========================================================
   * ROLE-BASED REDIRECT
   * =========================================================
   *
   * This page is the Principal's dashboard. Other roles get
   * their own dedicated dashboard route instead.
   */

  if (profile.role === "teacher" || profile.role === "hod") {
    redirect("/teacher-dashboard");
  }

  if (profile.role === "bursar") {
    redirect("/bursar-dashboard");
  }

  if (profile.role === "librarian") {
    redirect("/librarian-dashboard");
  }

  if (profile.role === "support_staff") {
    redirect("/support-dashboard");
  }

  const supabase = await createClient();



  /*
   * =========================================================
   * SCHOOL SETTINGS
   * =========================================================
   */

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone = school?.timezone ?? "Africa/Nairobi";

      /*
    * =========================================================
    * LOGGED-IN USER STAFF RECORD
    * =========================================================
    *
    * Every employee, including Principal and Deputy Principal,
    * can have personal attendance.
    */

    const { data: currentStaff } = await supabase
      .from("staff")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .maybeSingle();

  /*
   * =========================================================
   * CURRENT TERM
   * =========================================================
   */

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  /*
   * =========================================================
   * TODAY'S DATE
   * =========================================================
   */

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  /*
   * =========================================================
   * MY (PERSONAL) ATTENDANCE
   * =========================================================
   */

  const { data: myTodayAttendance } = currentStaff
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
        .eq("staff_id", currentStaff.id)
        .eq("attendance_date", today)
        .maybeSingle()
    : { data: null };

  /*
   * =========================================================
   * BASIC COUNTS
   * =========================================================
   */

  const [{ count: studentCount }, { count: staffCount }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", profile.school_id)
        .eq("status", "Active"),

      supabase
        .from("staff")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("school_id", profile.school_id)
        .eq("status", "Active"),
    ]);

  /*
   * =========================================================
   * STAFF ATTENDANCE SUMMARY
   * =========================================================
   */

  const { data: staffAttendance } = await supabase
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
    .eq("attendance_date", today);

  const attendanceRows = staffAttendance ?? [];

  // Everyone who has signed in today
  const signedInCount = attendanceRows.length;

  // Staff who completed their day
  const signedOutCount = attendanceRows.filter(
    (record) => record.sign_out_at !== null
  ).length;

  // Staff currently signed in and working
  const currentlyOnDutyCount = attendanceRows.filter(
    (record) =>
      record.sign_in_at !== null &&
      record.sign_out_at === null
  ).length;

  // Active staff without attendance record today
  const notSignedInCount = Math.max(
    (staffCount ?? 0) - signedInCount,
    0
  );

  /*
   * =========================================================
   * FEES
   * =========================================================
   */

  let feeCollected = 0;
  let feeExpected = 0;

  let feeByMonth: {
    month: string;
    amount: number;
  }[] = [];

  if (currentTerm) {
    const { data: payments } = await supabase
      .from("fee_payments")
      .select(`
        amount,
        payment_date,
        student:students!inner(school_id)
      `)
      .eq("term_id", currentTerm.id)
      .eq("status", "Confirmed")
      .eq("student.school_id", profile.school_id);

    feeCollected = (payments ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const monthMap = new Map<string, number>();

    for (const payment of payments ?? []) {
      const date = new Date(
        payment.payment_date as string
      );

      const month = date.toLocaleString("en-KE", {
        month: "short",
        timeZone: timezone,
      });

      monthMap.set(
        month,
        (monthMap.get(month) ?? 0) +
          Number(payment.amount)
      );
    }

    feeByMonth = Array.from(
      monthMap.entries()
    ).map(([month, amount]) => ({
      month,
      amount,
    }));

    const { data: structure } = await supabase
      .from("fee_structure")
      .select(`
        amount,
        class:classes!inner(school_id)
      `)
      .eq("term_id", currentTerm.id)
      .eq("class.school_id", profile.school_id);

    const {
      data: activeStudentRows,
      count: activeStudents,
    } = await supabase
      .from("students")
      .select("balance_brought_forward", {
        count: "exact",
      })
      .eq("school_id", profile.school_id)
      .eq("status", "Active");

    const totalPerStudent = (
      structure ?? []
    ).reduce(
      (sum, fee) => sum + Number(fee.amount),
      0
    );

    const totalBroughtForward = (
      activeStudentRows ?? []
    ).reduce(
      (sum, student) =>
        sum +
        Number(student.balance_brought_forward ?? 0),
      0
    );

    feeExpected =
      totalPerStudent * (activeStudents ?? 0) +
      totalBroughtForward;
  }

  const outstandingBalance = Math.max(
    feeExpected - feeCollected,
    0
  );

  /*
   * =========================================================
   * STUDENT ATTENDANCE THIS WEEK
   * =========================================================
   */

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: attendanceRowsThisWeek } =
    await supabase
      .from("attendance")
      .select(`
        status,
        student:students!inner(school_id)
      `)
      .gte(
        "date",
        weekAgo.toISOString().slice(0, 10)
      )
      .eq(
        "student.school_id",
        profile.school_id
      );

  const attendanceCounts: Record<string, number> = {};

  for (const row of attendanceRowsThisWeek ?? []) {
    attendanceCounts[row.status] =
      (attendanceCounts[row.status] ?? 0) + 1;
  }

  const attendancePieData = Object.entries(
    attendanceCounts
  ).map(([name, value]) => ({
    name,
    value,
  }));

  /*
   * =========================================================
   * LAST EXAM SUBJECT AVERAGES
   * =========================================================
   */

  const { data: lastExam } = await supabase
    .from("exams")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("start_date", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  let subjectAverages: {
    subject: string;
    average: number;
  }[] = [];

  if (lastExam) {
    const { data: results } = await supabase
      .from("exam_results")
      .select(`
        marks_obtained,
        subject:subjects(name)
      `)
      .eq("exam_id", lastExam.id);

    const bySubject = new Map<string, number[]>();

    for (const result of results ?? []) {
      const subjectName =
        (
          result.subject as unknown as {
            name: string;
          } | null
        )?.name ?? "Unknown";

      const marks =
        bySubject.get(subjectName) ?? [];

      if (result.marks_obtained !== null) {
        marks.push(Number(result.marks_obtained));
      }

      bySubject.set(subjectName, marks);
    }

    subjectAverages = Array.from(
      bySubject.entries()
    ).map(([subject, marks]) => ({
      subject,
      average: marks.length
        ? Math.round(
            (marks.reduce((a, b) => a + b, 0) /
              marks.length) *
              10
          ) / 10
        : 0,
    }));
  }

  /*
   * =========================================================
   * DATE FORMATTER
   * =========================================================
   */

  const formattedToday =
    new Intl.DateTimeFormat("en-KE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date());

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h1 className="text-xl font-bold text-gray-900">
      Principal Dashboard
    </h1>

    <p className="text-sm text-gray-500">
      {currentTerm
        ? `${
            (
              currentTerm.academic_year as unknown as {
                year: number;
              }
            )?.year
          } · Term ${currentTerm.term_number}`
        : "No current term set"}
    </p>
  </div>

  <StudentSearchBar />
</div>

      {/* =====================================================
          MAIN SCHOOL STATS
      ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          label="Total Students Enrolled"
          value={String(studentCount ?? 0)}
          icon={Users}
        />

        <StatCard
          label="Total Active Staff"
          value={String(staffCount ?? 0)}
          icon={UserCog}
        />

        <StatCard
          label="Fee Collected This Term"
          value={formatKES(feeCollected)}
          icon={Wallet}
        />

        <StatCard
          label="Outstanding Fee Balance"
          value={formatKES(outstandingBalance)}
          icon={AlertTriangle}
          tone="danger"
        />

      </div>

      {/* =====================================================
          STAFF ATTENDANCE
      ====================================================== */}

      <div className="grid lg:grid-cols-3 gap-4">

        {/* MY ATTENDANCE */}

        <div className="lg:col-span-1">
          <StaffAttendanceCard
            initialAttendance={myTodayAttendance}
            timezone={timezone}
          />
        </div>

        {/* SCHOOL-WIDE SUMMARY */}

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">

        {/* CARD HEADER */}

        <div className="flex items-center justify-between p-5 border-b border-gray-100">

          <div>
            <h2 className="text-base font-bold text-gray-900">
              Staff Attendance
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {formattedToday}
            </p>
          </div>

          <Link
            href="/staff-attendance"
            className="flex items-center gap-2 text-sm font-semibold text-eduke-green hover:underline"
          >
            View Full Attendance
            <ArrowRight size={16} />
          </Link>

        </div>

        {/* ATTENDANCE SUMMARY */}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-5">

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">
              Total Staff
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              {staffCount ?? 0}
            </p>
          </div>

          <div className="rounded-lg border border-green-100 bg-green-50 p-4">

            <div className="flex items-center gap-2">
              <LogIn
                size={15}
                className="text-green-600"
              />

              <p className="text-xs font-medium text-green-700">
                Signed In
              </p>
            </div>

            <p className="text-2xl font-bold text-green-700 mt-1">
              {signedInCount}
            </p>

          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">

            <div className="flex items-center gap-2">
              <LogOut
                size={15}
                className="text-blue-600"
              />

              <p className="text-xs font-medium text-blue-700">
                Signed Out
              </p>
            </div>

            <p className="text-2xl font-bold text-blue-700 mt-1">
              {signedOutCount}
            </p>

          </div>

          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">

            <div className="flex items-center gap-2">
              <Clock
                size={15}
                className="text-orange-600"
              />

              <p className="text-xs font-medium text-orange-700">
                On Duty
              </p>
            </div>

            <p className="text-2xl font-bold text-orange-700 mt-1">
              {currentlyOnDutyCount}
            </p>

          </div>

          <div className="rounded-lg border border-red-100 bg-red-50 p-4">

            <div className="flex items-center gap-2">
              <UserX
                size={15}
                className="text-red-600"
              />

              <p className="text-xs font-medium text-red-700">
                Not Signed In
              </p>
            </div>

            <p className="text-2xl font-bold text-red-700 mt-1">
              {notSignedInCount}
            </p>

          </div>

        </div>

        </div>

      </div>

      {/* =====================================================
          ANALYTICS
      ====================================================== */}

      <div className="grid lg:grid-cols-3 gap-4">

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

          <p className="text-sm font-semibold text-gray-700 mb-2">
            Fee Collection Per Month
          </p>

          {feeByMonth.length ? (
            <FeeCollectionChart data={feeByMonth} />
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">
              No payments recorded yet this term.
            </p>
          )}

        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

          <p className="text-sm font-semibold text-gray-700 mb-2">
            Student Attendance This Week
          </p>

          {attendancePieData.length ? (
            <AttendancePieChart
              data={attendancePieData}
            />
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">
              No attendance recorded this week.
            </p>
          )}

        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

          <p className="text-sm font-semibold text-gray-700 mb-2">
            Average Marks Per Subject{" "}
            {lastExam ? `(${lastExam.name})` : ""}
          </p>

          {subjectAverages.length ? (
            <SubjectAveragesChart
              data={subjectAverages}
            />
          ) : (
            <p className="text-sm text-gray-400 py-16 text-center">
              No exam results yet.
            </p>
          )}

        </div>

      </div>

      {/* =====================================================
          QUICK ACTIONS
      ====================================================== */}

      <div className="flex flex-wrap gap-3">

        <Link
          href="/communications"
          className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors"
        >
          <Megaphone size={16} />
          Send School Announcement
        </Link>

        <Link
          href="/guardian-requests"
          className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:border-eduke-green transition-colors"
        >
          <UserCheck size={16} />
          Parent Account Requests
        </Link>

        <Link
          href="/staff-attendance"
          className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:border-eduke-green transition-colors"
        >
          <Clock size={16} />
          Staff Attendance
        </Link>

        <Link
          href="/fees/defaulters"
          className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:border-eduke-green transition-colors"
        >
          <FileWarning size={16} />
          View Fee Defaulters
        </Link>

        <Link
          href="/fees/reports"
          className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:border-eduke-green transition-colors"
        >
          <Download size={16} />
          Download Term Report
        </Link>

        <Link
          href="/settings/school-location"
          className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-lg hover:border-eduke-green transition-colors"
        >
          <MapPin size={16} />
          School Location & Geofence
        </Link>

      </div>

    </div>
  );
}