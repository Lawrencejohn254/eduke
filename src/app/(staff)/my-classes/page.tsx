import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import MyClassesClient from "./MyClassesClient";

export default async function MyClassesPage() {
  const profile = await getProfileOrRedirect();
  if (!["teacher", "hod"].includes(profile.role)) redirect("/dashboard");
  if (!profile.staff_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BookOpen size={20} /> My Classes</h1>
        <p className="text-sm text-gray-500">Your account isn&apos;t linked to a staff record yet — ask your principal to link it.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("name");

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("school_id", profile.school_id)
    .order("name");

  const { data: classSubjects } = await supabase
    .from("class_subjects")
    .select("class_id, subject_id")
    .in("class_id", (classes ?? []).map((c) => c.id));

  const { data: streams } = await supabase
    .from("streams")
    .select("id, name, class_id")
    .in("class_id", (classes ?? []).map((c) => c.id))
    .order("name");

  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select("id, subject:subjects(name), stream:streams(name, class:classes(name)), term:terms(term_number)")
    .eq("teacher_id", profile.staff_id)
    .order("id", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BookOpen size={20} /> My Classes</h1>
        <p className="text-sm text-gray-500">
          Assign yourself to the subjects and streams you teach. This determines which classes you see for Attendance and the AI Teaching Assistant.
        </p>
      </div>

      {!currentTerm ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          No current term is set — ask your principal to set one in Settings before assigning yourself to classes.
        </p>
      ) : (
        <MyClassesClient
          staffId={profile.staff_id}
          termId={currentTerm.id}
          termLabel={`${currentTerm.term_number} ${(currentTerm.academic_year as unknown as { year: number })?.year ?? ""}`}
          classes={classes ?? []}
          subjects={subjects ?? []}
          classSubjects={classSubjects ?? []}
          streams={streams ?? []}
          initialAssignments={(assignments ?? []).map((a) => {
            const subject = a.subject as unknown as { name: string } | null;
            const stream = a.stream as unknown as { name: string; class: { name: string } | null } | null;
            const term = a.term as unknown as { term_number: string } | null;
            return {
              id: a.id,
              subjectName: subject?.name ?? "-",
              className: stream?.class?.name ?? "-",
              streamName: stream?.name ?? "-",
              termLabel: term?.term_number ?? "-",
            };
          })}
        />
      )}
    </div>
  );
}