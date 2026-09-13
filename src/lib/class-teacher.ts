import { createClient } from "@/lib/supabase/server";

export type ActiveClassTeacherAssignment = {
  id: string;
  school_id: string;
  class_id: string;
  class_name: string;
  stream_id: string;
  stream_name: string;
  teacher_id: string;
  academic_year_id: string;
  academic_year: number;
  term_id: string;
  term_number: string;
  start_date: string;
};

/**
 * Resolves the CURRENT teacher's active class-teacher assignment(s) for the
 * school's current term, via the my_active_class_teacher_assignments() RPC.
 *
 * This is intentionally the single place the app asks "is this person a
 * class teacher right now" — the sidebar link and the /my-class page guard
 * both call this, so there's exactly one source of truth. The RPC itself is
 * SECURITY DEFINER and resolves off auth.uid() server-side; nothing here
 * trusts a class/stream id supplied by the caller.
 */
export async function getActiveClassTeacherAssignments(): Promise<ActiveClassTeacherAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_active_class_teacher_assignments");

  if (error) {
    console.error("getActiveClassTeacherAssignments failed:", error);
    return [];
  }

  return (data ?? []) as ActiveClassTeacherAssignment[];
}

/**
 * Resolves ONE assignment to render the dashboard for, honoring an optional
 * ?assignment=<id> query param (used by the class selector when a teacher
 * legitimately has more than one active assignment). The requested id is
 * always checked against the caller's own resolved assignment list — never
 * trusted on its own — so a teacher cannot use the query string to view a
 * class they aren't assigned to.
 */
export async function resolveClassTeacherAssignment(
  requestedId?: string
): Promise<{ assignment: ActiveClassTeacherAssignment | null; all: ActiveClassTeacherAssignment[] }> {
  const all = await getActiveClassTeacherAssignments();

  if (all.length === 0) return { assignment: null, all };

  if (requestedId) {
    const match = all.find((a) => a.id === requestedId);
    if (match) return { assignment: match, all };
  }

  return { assignment: all[0], all };
}
