import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { CalendarDays } from "lucide-react";
import TimetableGrid, { Slot } from "./TimetableGrid";
import TeacherSelector from "./TeacherSelector";
import { EmptyState } from "@/components/Loaders";

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const params = await searchParams;
  const isStaffViewer = ["principal", "deputy_principal", "super_admin", "hod"].includes(profile.role);

  const { data: currentTerm } = await supabase.from("terms").select("id").eq("is_current", true).maybeSingle();
  const { data: streamRows } = await supabase
    .from("streams")
    .select("id, name, class:classes!inner(name, school_id)")
    .eq("class.school_id", profile.school_id)
    .order("name");
  const streams = (streamRows ?? []) as unknown as { id: string; name: string; class: { name: string } | null }[];

  // Principal / HOD: read-only view, pick a teacher to inspect their schedule.
  if (isStaffViewer) {
    const { data: teachers } = await supabase
      .from("staff")
      .select("id, first_name, last_name")
      .eq("school_id", profile.school_id)
      .in("role", ["teacher", "hod"])
      .order("first_name");

    const selectedTeacherId = params.teacher || teachers?.[0]?.id;

    if (!selectedTeacherId) {
      return (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} /> Timetables</h1>
          <EmptyState title="No staff yet" description="Add teachers first — each teacher builds and owns their own timetable." />
        </div>
      );
    }

    const [{ data: slots }, { data: settings }] = await Promise.all([
      supabase
        .from("timetable_slots")
        .select("id, title, description, color, day_of_week, start_time, end_time, stream_id, stream:streams(name, class:classes(name))")
        .eq("teacher_id", selectedTeacherId)
        .order("id", { ascending: true }),
      supabase.from("timetable_settings").select("title").eq("teacher_id", selectedTeacherId).maybeSingle(),
    ]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} /> Timetables</h1>
            <p className="text-sm text-gray-500">Read-only — each teacher builds and manages their own weekly schedule.</p>
          </div>
          <TeacherSelector teachers={teachers ?? []} />
        </div>
        <TimetableGrid
          key={selectedTeacherId}
          teacherId={selectedTeacherId}
          schoolId={profile.school_id}
          termId={currentTerm?.id ?? null}
          streams={streams}
          initialSlots={(slots ?? []) as unknown as Slot[]}
          initialTitle={settings?.title ?? "Weekly Schedule"}
          readOnly
        />
      </div>
    );
  }

  // Teacher / HOD-as-teacher: full editable builder for their own schedule.
  if (!profile.staff_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} /> My Timetable</h1>
        <EmptyState title="No staff record linked" description="Your account isn't linked to a staff record yet — ask your principal to link it." />
      </div>
    );
  }

  const [{ data: slots }, { data: settings }] = await Promise.all([
    supabase
      .from("timetable_slots")
      .select("id, title, description, color, day_of_week, start_time, end_time, stream_id, stream:streams(name, class:classes(name))")
      .eq("teacher_id", profile.staff_id)
      .order("id", { ascending: true }),
    supabase.from("timetable_settings").select("title").eq("teacher_id", profile.staff_id).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><CalendarDays size={20} /> My Timetable</h1>
        <p className="text-sm text-gray-500">Build your weekly schedule. Your principal can see this — they can't edit it.</p>
      </div>
      <TimetableGrid
        teacherId={profile.staff_id}
        schoolId={profile.school_id}
        termId={currentTerm?.id ?? null}
        streams={streams}
        initialSlots={(slots ?? []) as unknown as Slot[]}
        initialTitle={settings?.title ?? "Weekly Schedule"}
      />
    </div>
  );
}
