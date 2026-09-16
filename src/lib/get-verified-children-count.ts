import { createClient } from "@/lib/supabase/server";

/**
 * Returns how many VERIFIED children (student_guardians.is_verified = true)
 * are linked to the currently signed-in account, regardless of role.
 *
 * This is what powers the "My Children" sidebar item for a teacher/HOD/bursar
 * who is also a verified parent/guardian — and it's the same signal a plain
 * parent account would produce. Backed by public.my_verified_children_count(),
 * which reads profiles.guardian_id -> student_guardians (is_verified = true).
 *
 * Being staff never affects this number on its own; it strictly follows a
 * verified guardian-student link set up by a Principal/Admin.
 */
export async function getVerifiedChildrenCount(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_verified_children_count");

  if (error) {
    console.error("getVerifiedChildrenCount failed:", error.message);
    return 0;
  }

  return typeof data === "number" ? data : Number(data ?? 0);
}