import { createClient } from "@/lib/supabase/server";

export type ChildOption = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string | null;
  className: string | null;
  streamName: string | null;
};

export async function getChildrenForGuardian(guardianId: string | null): Promise<ChildOption[]> {
  if (!guardianId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_guardians")
    .select("student:students(id, first_name, last_name, admission_number, class_id, class:classes(name), stream:streams(name))")
    .eq("guardian_id", guardianId);

  return (data ?? [])
    .map((row) => row.student as unknown as {
      id: string; first_name: string; last_name: string; admission_number: string; class_id: string | null;
      class: { name: string } | null; stream: { name: string } | null;
    } | null)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      admission_number: s.admission_number,
      class_id: s.class_id,
      className: s.class?.name ?? null,
      streamName: s.stream?.name ?? null,
    }));
}
