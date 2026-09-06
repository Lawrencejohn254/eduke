import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import AIAssistantClient from "./AIAssistantClient";

export default async function AIAssistantPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: assignments } = profile.staff_id
    ? await supabase
        .from("teacher_subjects")
        .select(
          "subject:subjects(id, name, curriculum_type), stream:streams(id, name, class:classes(id, name, curriculum_type)), term:terms(id, term_number)"
        )
        .eq("teacher_id", profile.staff_id)
    : { data: [] };

  const { data: currentTerm } = await supabase
    .from("terms")
    .select("id, term_number, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();

  type Assignment = {
    subject: { id: string; name: string; curriculum_type: string } | null;
    stream: { id: string; name: string; class: { id: string; name: string; curriculum_type: string } | null } | null;
  };

  const typedAssignments = (assignments ?? []) as unknown as Assignment[];

  const subjects = Array.from(
    new Map(typedAssignments.filter((a) => a.subject).map((a) => [a.subject!.id, a.subject!])).values()
  );
  const classes = Array.from(
    new Map(
      typedAssignments
        .filter((a) => a.stream?.class)
        .map((a) => [a.stream!.class!.id, a.stream!.class!])
    ).values()
  );
  const streams = Array.from(
    new Map(typedAssignments.filter((a) => a.stream).map((a) => [a.stream!.id, a.stream!])).values()
  );

  return (
    <AIAssistantClient
      staffId={profile.staff_id}
      subjects={subjects}
      classes={classes}
      streams={streams}
      currentTerm={
        currentTerm
          ? {
              id: currentTerm.id,
              label: `${currentTerm.term_number} ${(currentTerm.academic_year as unknown as { year: number })?.year ?? ""}`,
              termNumber: currentTerm.term_number,
            }
          : null
      }
    />
  );
}
