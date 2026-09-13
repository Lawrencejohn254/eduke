import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { getDateInTimezone } from "@/lib/date";
import AIBanner from "@/components/AIBanner";
import StaffAttendanceCard from "@/components/StaffAttendanceCard";
import TimetableFloatingWidget from "@/components/TimetableFloatingWidget";
import { DAY_NAMES } from "@/lib/timetable-colors";
import Link from "next/link";
import { EmptyState } from "@/components/Loaders";

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const profile = await getProfileOrRedirect();
  const resolvedSearchParams = await searchParams;
  const enrollmentClosed = resolvedSearchParams?.enrollment === "closed";
  const supabase = await createClient();

  const staffId = profile.staff_id;
  const isHod = profile.role === "hod";

  /*
   * SCHOOL TIMEZONE
   *
   * This has to be fetched first because the timetable query below
   * (today's day-of-week) depends on it.
   */

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone = school?.timezone ?? "Africa/Nairobi";
  const today = getDateInTimezone(timezone);

  const todayWeekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(new Date());

  // DAY_NAMES is Monday-first, matching timetable_slots.day_of_week (1=Monday...7=Sunday) exactly.
  const todayIsoDay = DAY_NAMES.indexOf(todayWeekdayName) + 1;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  /*
   * Everything below is independent of everything else — none of these
   * eight queries need the result of another one — so they're fired
   * together instead of one after another. This is the single biggest
   * latency win on this page: eight sequential round trips becomes one.
   */

  const [
    { data: todaySlots },
    { data: todayStaffAttendance },
    { data: assignments },
    { data: lessonPlans },
    { data: lessonPlansToReview },
    { data: schemes },
    { data: schemesToReview },
    { count: pendingMarks },
  ] = await Promise.all([
    /* TODAY'S TIMETABLE (for the floating current/next-class widget) */
    staffId
      ? supabase
          .from("timetable_slots")
          .select("id, title, color, start_time, end_time, stream:streams(name, class:classes(name))")
          .eq("teacher_id", staffId)
          .eq("day_of_week", todayIsoDay)
          .order("start_time")
      : Promise.resolve({ data: [] as never[] }),

    /* TODAY'S STAFF ATTENDANCE — StaffAttendanceCard handles sign-in/out via RPC */
    staffId
      ? supabase
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
          .eq("staff_id", staffId)
          .eq("attendance_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    /* TEACHING ASSIGNMENTS */
    staffId
      ? supabase
          .from("teacher_subjects")
          .select(`
            subject:subjects(name),
            stream:streams(
              name,
              class:classes(name)
            )
          `)
          .eq("teacher_id", staffId)
      : Promise.resolve({ data: [] as never[] }),

    /* LESSON PLANS THIS WEEK (teacher's own submissions) */
    staffId && !isHod
      ? supabase
          .from("lesson_plans")
          .select("status")
          .eq("teacher_id", staffId)
          .gte("created_at", weekAgo.toISOString())
      : Promise.resolve({ data: [] as never[] }),

    /* HOD REVIEW COUNTS (lesson plans) — "what's been sent to me to review" */
    isHod
      ? supabase
          .from("lesson_plans")
          .select("status")
          .or(`assigned_hod_id.eq.${staffId},assigned_hod_id.is.null`)
      : Promise.resolve({ data: [] as never[] }),

    /* SCHEMES OF WORK (teacher's own) */
    staffId && !isHod
      ? supabase.from("schemes_of_work").select("status").eq("teacher_id", staffId)
      : Promise.resolve({ data: [] as never[] }),

    /* SCHEMES OF WORK (HOD review queue) */
    isHod
      ? supabase
          .from("schemes_of_work")
          .select("status")
          .or(`assigned_hod_id.eq.${staffId},assigned_hod_id.is.null`)
      : Promise.resolve({ data: [] as never[] }),

    /* PENDING MARK ENTRY */
    staffId
      ? supabase
          .from("exam_results")
          .select("id", { count: "exact", head: true })
          .eq("entered_by", staffId)
          .is("marks_obtained", null)
      : Promise.resolve({ count: 0 }),
  ]);

  const classesStreams = Array.from(
    new Set(
      (assignments ?? [])
        .map((assignment) => {
          const stream = assignment.stream as unknown as {
            name: string;
            class: {
              name: string;
            } | null;
          } | null;

          if (!stream) return "";

          return `${stream.class?.name ?? ""} ${stream.name}`;
        })
        .filter(Boolean)
    )
  );

  const lpCounts = {
    Submitted: 0,
    Draft: 0,
    Returned: 0,
  };

  for (const lessonPlan of lessonPlans ?? []) {
    if (lessonPlan.status in lpCounts) {
      lpCounts[
        lessonPlan.status as keyof typeof lpCounts
      ]++;
    }
  }

  const hodLpCounts = {
    Submitted: 0,
    Approved: 0,
    Returned: 0,
  };

  for (const lp of lessonPlansToReview ?? []) {
    if (lp.status in hodLpCounts) {
      hodLpCounts[lp.status as keyof typeof hodLpCounts]++;
    }
  }

  const hodSchemeCounts = {
    Submitted: 0,
    Approved: 0,
    Returned: 0,
  };

  for (const sc of schemesToReview ?? []) {
    if (sc.status in hodSchemeCounts) {
      hodSchemeCounts[sc.status as keyof typeof hodSchemeCounts]++;
    }
  }

  /*
   * HOD PENDING REVIEWS
   *
   * This one legitimately runs after the block above — it's a separate,
   * heavier query (joins in teacher names) that's only needed for HODs,
   * so there's no benefit to bundling it into the Promise.all above.
   */

  let pendingReviews: {
    id: string;
    topic: string;
    teacher: string | null;
    type: "Lesson Plan" | "Scheme of Work";
    href: string;
  }[] = [];

  if (isHod) {
    const [{ data: lpData }, { data: scData }] = await Promise.all([
      supabase
        .from("lesson_plans")
        .select(`
          id,
          topic,
          status,
          teacher:staff!lesson_plans_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq("status", "Submitted")
        // Show plans sent specifically to me, plus older/legacy submissions
        // that predate this feature and were never assigned to anyone.
        .or(`assigned_hod_id.eq.${staffId},assigned_hod_id.is.null`)
        .limit(10),
      supabase
        .from("schemes_of_work")
        .select(`
          id,
          title,
          status,
          teacher:staff!schemes_of_work_teacher_id_fkey(
            first_name,
            last_name
          )
        `)
        .eq("status", "Submitted")
        .or(`assigned_hod_id.eq.${staffId},assigned_hod_id.is.null`)
        .limit(10),
    ]);

    const lpReviews = (lpData ?? []).map((item) => {
      const teacher = item.teacher as unknown as {
        first_name: string;
        last_name: string;
      } | null;

      return {
        id: item.id,
        topic: item.topic,
        teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
        type: "Lesson Plan" as const,
        href: "/lesson-plans",
      };
    });

    const scReviews = (scData ?? []).map((item) => {
      const teacher = item.teacher as unknown as {
        first_name: string;
        last_name: string;
      } | null;

      return {
        id: item.id,
        topic: item.title,
        teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
        type: "Scheme of Work" as const,
        href: "/schemes-of-work",
      };
    });

    pendingReviews = [...lpReviews, ...scReviews].slice(0, 10);
  }

  return (
    <div className="space-y-6">

      <TimetableFloatingWidget slots={(todaySlots ?? []) as never} timezone={timezone} />

      {/* PAGE HEADER */}

      <div>
        <h1 className="text-xl font-bold text-gray-900">
          My Dashboard
        </h1>

        <p className="text-sm text-gray-500">
          Welcome back, {profile.first_name}.
        </p>
      </div>


      {/* ENROLLMENT CLOSED NOTICE */}

      {enrollmentClosed && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          <p className="font-semibold">Student enrollment is currently closed.</p>
          <p className="mt-1">
            Please contact your school administrator if you need access to student enrollment.
          </p>
        </div>
      )}


      {/* AI BANNER */}

      <AIBanner />


      {/* STAFF ATTENDANCE + STATISTICS */}

      <div className="grid lg:grid-cols-3 gap-4">

        {/* STAFF ATTENDANCE */}

        <div className="lg:col-span-1">
          <StaffAttendanceCard
            initialAttendance={todayStaffAttendance}
            timezone={timezone}
          />
        </div>


        {/* TEACHER STATISTICS */}

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">

          {/* CLASSES */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

            <p className="text-xs font-medium text-gray-500">
              My Classes &amp; Streams
            </p>

            <p className="text-sm font-semibold text-gray-900 mt-1">
              {classesStreams.length
                ? classesStreams.join(", ")
                : "No streams assigned yet"}
            </p>

          </div>


          {/* LESSON PLANS */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

            <p className="text-xs font-medium text-gray-500">
              {isHod ? "Lesson Plans to Review" : "Lesson Plans This Week"}
            </p>

            {isHod ? (
              <p className="text-sm text-gray-900 mt-1">
                {hodLpCounts.Submitted} pending
                {" · "}
                {hodLpCounts.Approved} approved
                {" · "}
                {hodLpCounts.Returned} returned
              </p>
            ) : (
              <p className="text-sm text-gray-900 mt-1">
                {lpCounts.Submitted} submitted
                {" · "}
                {lpCounts.Draft} pending
                {" · "}
                {lpCounts.Returned} returned
              </p>
            )}

          </div>


          {/* SCHEMES */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

            <p className="text-xs font-medium text-gray-500">
              {isHod ? "Schemes of Work to Review" : "Schemes of Work"}
            </p>

            {isHod ? (
              <p className="text-sm text-gray-900 mt-1">
                {hodSchemeCounts.Submitted} pending
                {" · "}
                {hodSchemeCounts.Approved} approved
                {" · "}
                {hodSchemeCounts.Returned} returned
              </p>
            ) : (
              <p className="text-sm text-gray-900 mt-1">
                {(schemes ?? []).length} total
              </p>
            )}

          </div>


          {/* PENDING MARKS */}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

            <p className="text-xs font-medium text-gray-500">
              Pending Mark Entry
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              {pendingMarks ?? 0}
            </p>

          </div>

        </div>

      </div>


      {/* HOD PENDING REVIEWS */}

      {isHod && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">

          <p className="text-sm font-semibold text-gray-700 mb-3">
            Pending Reviews
          </p>

          {pendingReviews.length === 0 ? (
            <EmptyState
              title="Nothing to review"
              description="Submitted lesson plans from your department will appear here."
            />
          ) : (
            <div className="space-y-2">

              {pendingReviews.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                >

                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.topic}
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {item.type}
                      </span>
                    </p>

                    <p className="text-xs text-gray-500">
                      by {item.teacher ?? "Teacher"}
                    </p>
                  </div>

                  <Link
                    href={item.href}
                    className="text-xs font-semibold text-eduke-green hover:underline"
                  >
                    Review →
                  </Link>

                </div>
              ))}

            </div>
          )}

        </div>
      )}

    </div>
  );
}