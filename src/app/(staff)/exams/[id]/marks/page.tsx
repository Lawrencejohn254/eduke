import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import MarkEntryClient from "./MarkEntryClient";
import { notFound } from "next/navigation";

export default async function MarkEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: exam } = await supabase.from("exams").select("id, name, class_id, out_of, class:classes(name, curriculum_type)").eq("id", id).maybeSingle();
  if (!exam) notFound();

  // subjects is now a school-wide catalog; which subjects this class offers
  // comes from class_subjects (auto-populated when the class/subject was created).
  const { data: classSubjectRows } = await supabase
    .from("class_subjects")
    .select("subject:subjects(id, name)")
    .eq("class_id", exam.class_id);

  const subjects = (classSubjectRows ?? [])
    .map((r) => r.subject as unknown as { id: string; name: string } | null)
    .filter((s): s is { id: string; name: string } => !!s)
    .sort((a, b) => a.name.localeCompare(b.name));

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number")
    .eq("class_id", exam.class_id)
    .eq("status", "Active")
    .order("first_name");

  const klass = exam.class as unknown as { name: string; curriculum_type: "CBC" | "8-4-4" | null } | null;

  return (
    <MarkEntryClient
      examId={exam.id}
      examName={exam.name}
      className={klass?.name ?? ""}
      curriculumType={klass?.curriculum_type ?? "8-4-4"}
      outOf={exam.out_of}
      subjects={subjects ?? []}
      students={students ?? []}
      staffId={profile.staff_id}
    />
  );
}