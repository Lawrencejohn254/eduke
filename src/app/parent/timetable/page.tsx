import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import { CalendarDays } from "lucide-react";
import ClassTimetableGrid, { type ClassSlot } from "./ClassTimetableGrid";

export default async function ParentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
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
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("stream_id").eq("id", activeChild.id).single();

  // Every subject slot for the child's stream, across all the different teachers who teach
  // that class — this is the class's fixed weekly schedule, not any one teacher's schedule.
  const { data: slots } = student?.stream_id
    ? await supabase
        .from("timetable_slots")
        .select("id, title, description, color, day_of_week, start_time, end_time, teacher:staff(first_name, last_name)")
        .eq("stream_id", student.stream_id)
        .order("day_of_week")
        .order("start_time")
    : { data: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays size={20} /> Timetable (Ratiba)
          </h1>
          <p className="text-sm text-gray-500">
            {activeChild.first_name} {activeChild.last_name}&apos;s weekly class schedule — read-only.
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

      {!slots || slots.length === 0 ? (
        <EmptyState
          title="No timetable yet"
          description="Your child's class schedule will appear here once their teachers set it up."
        />
      ) : (
        <ClassTimetableGrid slots={slots as unknown as ClassSlot[]} />
      )}
    </div>
  );
}