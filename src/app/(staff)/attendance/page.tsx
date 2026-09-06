import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import AttendanceClient from "./AttendanceClient";

export default async function AttendancePage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const { data: assignments } = profile.staff_id
    ? await supabase
        .from("teacher_subjects")
        .select("stream:streams(id, name, class:classes(id, name))")
        .eq("teacher_id", profile.staff_id)
    : { data: [] };

  type StreamRow = { id: string; name: string; class: { id: string; name: string } | null };
  const streams = Array.from(
    new Map(
      (assignments ?? [])
        .map((a) => a.stream as unknown as StreamRow | null)
        .filter((s): s is StreamRow => Boolean(s))
        .map((s) => [s.id, s])
    ).values()
  );

  return <AttendanceClient streams={streams} staffId={profile.staff_id} />;
}
