import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import Link from "next/link";
import { formatDateDMY, formatMinutesLate } from "@/lib/format";
import { isTaskOverdue, moduleForDepartment, buildNotifications } from "@/lib/support-staff";
import StatusBadge from "@/components/StatusBadge";
import { Megaphone, Bell, ArrowRight } from "lucide-react";

export default async function SupportDashboardPage() {
  const profile = await getProfileOrRedirect();

  if (
    profile.role !== "support_staff" &&
    !["principal", "deputy_principal", "super_admin"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();
  const timezone = school?.timezone ?? "Africa/Nairobi";

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: staffRecord } = await supabase
    .from("staff")
    .select("id, department, staff_number, status")
    .eq("profile_id", profile.id)
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .maybeSingle();

  const staffId = staffRecord?.id ?? null;
  const moduleInfo = moduleForDepartment(staffRecord?.department ?? null);

  const [{ data: todayAttendance }, { data: tasks }, { data: notices }] = await Promise.all([
    staffId
      ? supabase
          .from("staff_attendance")
          .select("id, sign_in_at, sign_out_at, minutes_late, status")
          .eq("staff_id", staffId)
          .eq("attendance_date", today)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    staffId
      ? supabase
          .from("staff_tasks")
          .select("id, title, due_date, priority, status, created_at, completed_at")
          .eq("assigned_to", staffId)
          .order("due_date", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("notices")
      .select("id, title, message, audience, created_at")
      .eq("school_id", profile.school_id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const allTasks = tasks ?? [];
  const currentTasks = allTasks.filter((t) => t.status === "In Progress");
  const pendingTasks = allTasks.filter((t) => t.status === "Pending");
  const completedTasks = allTasks.filter((t) => t.status === "Completed");
  const overdueTasks = allTasks.filter((t) => isTaskOverdue(t.status, t.due_date));
  const recentNotices = notices ?? [];

  const notifications = buildNotifications(recentNotices, overdueTasks).slice(0, 6);

  const recentActivity = [
    ...allTasks
      .filter((t) => t.status === "Completed" && t.completed_at)
      .map((t) => ({ key: `done-${t.id}`, text: `Completed "${t.title}"`, at: t.completed_at as string })),
    ...recentNotices.map((n) => ({ key: `notice-act-${n.id}`, text: `Notice posted: ${n.title}`, at: n.created_at })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Support Staff Dashboard</h1>
        <p className="text-sm text-gray-500">
          {staffRecord?.department ? `${staffRecord.department} · ` : ""}Welcome, {profile.first_name}.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Today&apos;s Attendance</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {todayAttendance?.sign_in_at ? (todayAttendance.sign_out_at ? "Signed Out" : "On Duty") : "Not Signed In"}
          </p>
          {todayAttendance?.sign_in_at && (
            <p className="text-xs text-gray-500 mt-1">
              Signed in at{" "}
              {new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone }).format(new Date(todayAttendance.sign_in_at))}
              {todayAttendance.minutes_late > 0 && ` · ${formatMinutesLate(todayAttendance.minutes_late)} late`}
            </p>
          )}
          <Link href="/support-dashboard/attendance" className="text-xs font-medium text-eduke-green hover:underline mt-2 inline-flex items-center gap-1">
            Go to Attendance <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Tasks</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{pendingTasks.length + currentTasks.length} open</p>
          <p className="text-xs text-gray-500 mt-1">
            {currentTasks.length} in progress · {pendingTasks.length} pending · {completedTasks.length} completed
            {overdueTasks.length > 0 && <span className="text-red-600 font-medium"> · {overdueTasks.length} overdue</span>}
          </p>
          <Link href="/support-dashboard/tasks" className="text-xs font-medium text-eduke-green hover:underline mt-2 inline-flex items-center gap-1">
            View My Tasks <ArrowRight size={12} />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">My Module</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{moduleInfo.label}</p>
          <p className="text-xs text-gray-500 mt-1">{moduleInfo.description}</p>
          <Link href="/support-dashboard/module" className="text-xs font-medium text-eduke-green hover:underline mt-2 inline-flex items-center gap-1">
            Open Module <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <TaskColumn title="Current Tasks" tasks={currentTasks} />
        <TaskColumn title="Pending Tasks" tasks={pendingTasks} />
        <TaskColumn title="Completed Tasks" tasks={completedTasks.slice(0, 5)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Megaphone size={16} /> Recent Notices
            </h2>
            <Link href="/support-dashboard/notices" className="text-xs font-semibold text-eduke-green hover:underline">
              View all →
            </Link>
          </div>
          {recentNotices.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No notices yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentNotices.slice(0, 4).map((n) => (
                <div key={n.id} className="p-3">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{formatDateDMY(n.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bell size={16} /> Notifications
            </h2>
            <Link href="/support-dashboard/notifications" className="text-xs font-semibold text-eduke-green hover:underline">
              View all →
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Nothing new.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <div key={n.key} className="p-3 text-sm text-gray-700">
                  {n.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentActivity.map((a) => (
                <div key={a.key} className="p-3 text-sm text-gray-700">
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  tasks,
}: {
  title: string;
  tasks: { id: string; title: string; due_date: string | null; priority: string; status: string }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">
          {title} ({tasks.length})
        </h2>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nothing here.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {tasks.map((t) => (
            <div key={t.id} className="p-3">
              <p className="text-sm font-medium text-gray-900">{t.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={t.priority} />
                {t.due_date && <span className="text-xs text-gray-400">Due {formatDateDMY(t.due_date)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}