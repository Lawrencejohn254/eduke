import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { notFound } from "next/navigation";
import Link from "next/link";
import DisciplinaryNotes from "@/components/DisciplinaryNotes";
import {
  ArrowLeft,
  User,
  BookOpen,
  ClipboardList,
  NotebookPen,
  CalendarDays,
  Briefcase,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import { EmptyState } from "@/components/Loaders";
import TimetableGrid, { Slot } from "../../timetable/TimetableGrid";

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900 mt-1">
        {value !== null && value !== undefined && value !== ""
          ? value
          : "-"}
      </p>
    </div>
  );
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const { id } = await params;
  const supabase = await createClient();

  // ==========================================
  // PERMISSIONS
  // ==========================================

  const authorizedRoles = [
    "principal",
    "bursar",
    "hr",
    "admin",
    "school_admin",
  ];

  const currentUserRole = (profile.role ?? "").toLowerCase();

  const canViewSensitive = authorizedRoles.includes(currentUserRole);

  // ==========================================
  // STAFF INFORMATION
  // ==========================================

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (!staff) notFound();

  // ==========================================
  // TEACHING ASSIGNMENTS
  // ==========================================

  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select(
      "subject:subjects(name), stream:streams(name, class:classes(name))"
    )
    .eq("teacher_id", id);

  // ==========================================
  // LESSON PLANS
  // ==========================================

  const { data: lessonPlans } = await supabase
    .from("lesson_plans")
    .select("status")
    .eq("teacher_id", id);

  // ==========================================
  // SCHEMES OF WORK
  // ==========================================

  const { data: schemes } = await supabase
    .from("schemes_of_work")
    .select("status")
    .eq("teacher_id", id);

  const lpCounts: Record<string, number> = {};

  for (const lp of lessonPlans ?? []) {
    if (lp.status) {
      lpCounts[lp.status] = (lpCounts[lp.status] ?? 0) + 1;
    }
  }

  const scCounts: Record<string, number> = {};

  for (const sc of schemes ?? []) {
    if (sc.status) {
      scCounts[sc.status] = (scCounts[sc.status] ?? 0) + 1;
    }
  }

  // ==========================================
  // STREAMS
  // ==========================================

  const { data: streamRows } = await supabase
    .from("streams")
    .select("id, name, class:classes!inner(name, school_id)")
    .eq("class.school_id", profile.school_id)
    .order("name");

  const streams = (streamRows ?? []) as unknown as {
    id: string;
    name: string;
    class: { name: string } | null;
  }[];

  // ==========================================
  // TIMETABLE
  // ==========================================

  const [{ data: slots }, { data: settings }] = await Promise.all([
    supabase
      .from("timetable_slots")
      .select(
        "id, title, description, color, day_of_week, start_time, end_time, stream_id, stream:streams(name, class:classes(name))"
      )
      .eq("teacher_id", id)
      .order("id", { ascending: true }),

    supabase
      .from("timetable_settings")
      .select("title")
      .eq("teacher_id", id)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* BACK BUTTON */}
      <Link
        href="/staff"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-eduke-green w-fit"
      >
        <ArrowLeft size={15} />
        Back to Staff
      </Link>

      {/* STAFF HEADER */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {staff.photo_url ? (
            <img
              src={staff.photo_url}
              alt={`${staff.first_name} ${staff.last_name}`}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-eduke-green/10 flex items-center justify-center text-eduke-green">
              <User size={26} />
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {staff.first_name} {staff.last_name}
            </h1>

            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {staff.staff_number ?? "No Staff Number"} ·{" "}
              {staff.role?.replaceAll("_", " ")} ·{" "}
              {staff.department ?? "No Department"}
            </p>
          </div>
        </div>

        <StatusBadge status={staff.status ?? "Active"} />
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">
            Subjects/Streams Taught
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {assignments?.length ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Lesson Plans</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {lessonPlans?.length ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Schemes of Work</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {schemes?.length ?? 0}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Date Joined</p>
          <p className="text-sm font-bold text-gray-900 mt-1">
            {staff.date_joined
              ? formatDateDMY(staff.date_joined)
              : "-"}
          </p>
        </div>
      </div>

      {/* PERSONAL INFORMATION */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <User size={16} />
          Personal Information
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="First Name" value={staff.first_name} />
          <InfoItem label="Last Name" value={staff.last_name} />
          <InfoItem label="Gender" value={staff.gender} />
          <InfoItem label="Phone" value={staff.phone} />
          <InfoItem label="Email" value={staff.email} />
        </div>
      </div>

      {/* EMPLOYMENT INFORMATION */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Briefcase size={16} />
          Employment Information
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
          <InfoItem label="Staff Number" value={staff.staff_number} />
          <InfoItem label="TSC Number" value={staff.tsc_number} />

          <InfoItem
            label="Role"
            value={
              staff.role
                ?.replaceAll("_", " ")
                .replace(/\b\w/g, (char: string) =>
                  char.toUpperCase()
                )
            }
          />

          <InfoItem label="Department" value={staff.department} />
          <InfoItem label="Contract Type" value={staff.contract_type} />

          <InfoItem
            label="Date Joined"
            value={
              staff.date_joined
                ? formatDateDMY(staff.date_joined)
                : null
            }
          />

          <div>
            <p className="text-xs text-gray-500">
              Employment Status
            </p>
            <div className="mt-1">
              <StatusBadge status={staff.status ?? "Active"} />
            </div>
          </div>
        </div>
      </div>

      {/* CONFIDENTIAL INFORMATION */}
      {canViewSensitive && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
              <ShieldCheck size={16} />
              Confidential Information
            </p>

            <p className="text-xs text-gray-400 mb-4">
              Restricted to authorized school administrators.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <InfoItem
                label="National ID"
                value={staff.national_id}
              />

              <InfoItem
                label="KRA PIN"
                value={staff.kra_pin}
              />

              <InfoItem
                label="NHIF / SHA Number"
                value={staff.nhif_number}
              />

              <InfoItem
                label="NSSF Number"
                value={staff.nssf_number}
              />
            </div>
          </div>

          {/* PAYROLL INFORMATION */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Wallet size={16} />
              Payroll Information
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
              <InfoItem
                label="Basic Salary"
                value={
                  staff.basic_salary !== null &&
                  staff.basic_salary !== undefined
                    ? `KES ${Number(
                        staff.basic_salary
                      ).toLocaleString()}`
                    : null
                }
              />
            </div>
          </div>
        </>
      )}

      {/* DISCIPLINARY & ADDITIONAL NOTES */}
      <DisciplinaryNotes
        schoolId={profile.school_id}
        profileId={profile.id}
        role={profile.role}
        targetType="staff"
        targetId={staff.id}
      />
  

      {/* SUBJECTS & STREAMS */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <BookOpen size={16} />
          Subjects &amp; Streams Taught
        </p>

        {!assignments || assignments.length === 0 ? (
          <p className="text-sm text-gray-400">
            No teaching assignments yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {assignments.map((a, i) => {
              const subject = a.subject as unknown as {
                name: string;
              } | null;

              const stream = a.stream as unknown as {
                name: string;
                class: { name: string } | null;
              } | null;

              return (
                <div
                  key={i}
                  className="flex justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0"
                >
                  <span className="text-gray-700">
                    {subject?.name ?? "-"}
                  </span>

                  <span className="text-gray-500">
                    {stream?.class?.name ?? ""}{" "}
                    {stream?.name ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LESSON PLANS & SCHEMES */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <ClipboardList size={16} />
          Lesson Plans &amp; Schemes of Work
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">
              Lesson Plans
            </p>

            {Object.keys(lpCounts).length === 0 ? (
              <p className="text-sm text-gray-400">None yet.</p>
            ) : (
              Object.entries(lpCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex justify-between text-sm border-b border-gray-50 py-1 last:border-0"
                >
                  <StatusBadge status={status} />
                  <span className="text-gray-600">{count}</span>
                </div>
              ))
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
              <NotebookPen size={13} />
              Schemes of Work
            </p>

            {Object.keys(scCounts).length === 0 ? (
              <p className="text-sm text-gray-400">None yet.</p>
            ) : (
              Object.entries(scCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="flex justify-between text-sm border-b border-gray-50 py-1 last:border-0"
                >
                  <StatusBadge status={status} />
                  <span className="text-gray-600">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TIMETABLE */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <CalendarDays size={16} />
          Timetable
        </p>

        {!slots || slots.length === 0 ? (
          <EmptyState
            title="No timetable yet"
            description="This teacher hasn't built their weekly schedule yet."
          />
        ) : (
          <TimetableGrid
            teacherId={id}
            schoolId={profile.school_id}
            termId={null}
            streams={streams}
            initialSlots={(slots ?? []) as unknown as Slot[]}
            initialTitle={settings?.title ?? "Weekly Schedule"}
            readOnly
          />
        )}
      </div>
    </div>
  );
}