import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { getActiveClassTeacherAssignments } from "@/lib/class-teacher";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfileOrRedirect();

  if (profile.role === "parent") redirect("/parent");

  // Only teacher/hod can ever hold a class-teacher assignment — skip the
  // extra round trip for every other role.
  const hasActiveClassTeacherAssignment =
    ["teacher", "hod"].includes(profile.role) && profile.staff_id
      ? (await getActiveClassTeacherAssignments()).length > 0
      : false;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={profile.role}
        studentEnrollmentEnabled={profile.school?.student_enrollment_enabled ?? false}
        hasActiveClassTeacherAssignment={hasActiveClassTeacherAssignment}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
  role={profile.role}
  name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()}
  schoolName={profile.school?.name}
  studentEnrollmentEnabled={profile.school?.student_enrollment_enabled ?? false}
  hasActiveClassTeacherAssignment={hasActiveClassTeacherAssignment}
/>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}