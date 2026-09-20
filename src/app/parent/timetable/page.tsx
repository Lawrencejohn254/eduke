import EmptyState from "@/components/parent/EmptyState";
import StudentPlate from "@/components/parent/StudentPlate";
import { PageHeader, Panel } from "@/components/parent/ui";
import { getParentContext, getSchoolInfo, getWeekLessons } from "@/lib/parent/queries";
import { getSchoolClock } from "@/lib/parent/time";
import ClassTimetableGrid from "./ClassTimetableGrid";
import DayView from "./DayView";

export default async function ParentTimetablePage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const params = await searchParams;
  const { profile, children, activeChild } = await getParentContext(params.child);

  if (!activeChild) {
    return (
      <div className="space-y-6">
        <PageHeader title="Timetable" description="Ratiba" />
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const child = activeChild;
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");
  const today = getSchoolClock(school.timezone).weekday;
  // Every subject slot for the child's stream, across all the teachers who teach that class.
  const lessons = await getWeekLessons(child.stream_id);

  return (
    <div className="space-y-6">
      <PageHeader title="Weekly timetable" description={`Ratiba · ${child.first_name}'s class schedule. This view is read-only.`} />
      <StudentPlate child={child} allChildren={children} schoolName={school.name} />

      {lessons.length === 0 ? (
        <EmptyState kind="timetable" />
      ) : (
        <Panel bodyClassName="p-0">
          <div className="hidden sm:block">
            <ClassTimetableGrid lessons={lessons} today={today} />
          </div>
          <div className="sm:hidden">
            <DayView lessons={lessons} today={today} />
          </div>
        </Panel>
      )}
    </div>
  );
}
