import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";
import { colorOf, DAY_NAMES } from "@/lib/timetable-colors";

export default async function ParentTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return <EmptyState title="No children linked yet" description="Contact the school office to link your account to your child's record." />;
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const supabase = await createClient();

  const { data: student } = await supabase.from("students").select("stream_id").eq("id", activeChild.id).single();

  const { data: slots } = student?.stream_id
    ? await supabase
        .from("timetable_slots")
        .select("id, title, description, color, day_of_week, start_time, end_time, teacher:staff(first_name, last_name)")
        .eq("stream_id", student.stream_id)
        .order("day_of_week")
        .order("start_time")
    : { data: [] };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Timetable (Ratiba)</h1>
          <p className="text-sm text-gray-500">{activeChild.first_name} {activeChild.last_name}'s weekly class schedule.</p>
        </div>
        <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, className: c.className }))} />
      </div>

      {!slots || slots.length === 0 ? (
        <EmptyState title="No timetable yet" description="Your child's class schedule will appear here once their teachers set it up." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {DAY_NAMES.map((dayName, i) => {
            const day = i + 1;
            const dayow = slots.filter((s) => s.day_of_week === day);
            if (dayow.length === 0) return null;
            return (
              <div key={day} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-sm font-semibold text-gray-800 mb-2">{dayName}</p>
                <div className="space-y-2">
                  {dayow.map((s) => {
                    const c = colorOf(s.color);
                    const teacher = s.teacher as unknown as { first_name: string; last_name: string } | null;
                    return (
                      <div key={s.id} className="rounded-lg p-2 border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-semibold" style={{ color: c.text }}>{s.title}</p>
                          <span className="text-[11px] shrink-0" style={{ color: c.text }}>
                            {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                          </span>
                        </div>
                        {s.description && <p className="text-xs mt-0.5" style={{ color: c.text, opacity: 0.8 }}>{s.description}</p>}
                        {teacher && <p className="text-[11px] mt-1" style={{ color: c.text, opacity: 0.7 }}>{teacher.first_name} {teacher.last_name}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
