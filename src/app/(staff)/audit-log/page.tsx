import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import AuditLogClient from "./AuditLogClient";

function extractField(details: Record<string, unknown> | null, field: string): string | null {
  if (!details) return null;
  if (typeof details[field] === "string") return details[field] as string;
  const after = details.after as Record<string, unknown> | undefined;
  const before = details.before as Record<string, unknown> | undefined;
  if (after && typeof after[field] === "string") return after[field] as string;
  if (before && typeof before[field] === "string") return before[field] as string;
  return null;
}

export default async function AuditLogPage() {
  const profile = await getProfileOrRedirect();
  if (!["principal", "deputy_principal", "super_admin"].includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();

  const { data: activity } = await supabase
    .from("audit_log")
    .select("id, actor_name, actor_role, action, entity_type, entity_id, details, created_at")
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = activity ?? [];

  const studentIds = Array.from(
    new Set(rows.map((r) => extractField(r.details as Record<string, unknown> | null, "student_id")).filter((v): v is string => Boolean(v)))
  );
  const subjectIds = Array.from(
    new Set(
      rows
        .filter((r) => r.entity_type === "exam_result")
        .map((r) => extractField(r.details as Record<string, unknown> | null, "subject_id"))
        .filter((v): v is string => Boolean(v))
    )
  );

  const { data: studentsLookup } = studentIds.length
    ? await supabase.from("students").select("id, first_name, last_name, admission_number, class:classes(name)").in("id", studentIds)
    : { data: [] };
  const studentMap = new Map((studentsLookup ?? []).map((s) => [s.id, s]));

  const { data: subjectsLookup } = subjectIds.length
    ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
    : { data: [] };
  const subjectMap = new Map((subjectsLookup ?? []).map((s) => [s.id, s.name]));

  const enrichedActivity = rows.map((r) => {
    const details = r.details as Record<string, unknown> | null;
    const studentId = extractField(details, "student_id");
    const subjectId = extractField(details, "subject_id");
    const student = studentId ? studentMap.get(studentId) : undefined;
    const klass = student?.class as unknown as { name: string } | null;
    return {
      ...r,
      studentName: student ? `${student.first_name} ${student.last_name}` : null,
      admissionNumber: student?.admission_number ?? null,
      className: klass?.name ?? null,
      subjectName: subjectId ? subjectMap.get(subjectId) ?? null : null,
    };
  });

  const { data: logins } = await supabase
    .from("login_sessions")
    .select("id, user_name, user_role, logged_in_at, user_agent")
    .eq("school_id", profile.school_id)
    .order("logged_in_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={20} /> Audit Log</h1>
        <p className="text-sm text-gray-500">
          Full record of logins, fee changes, mark entries, and timetable edits across the school. Visible only to you.
        </p>
      </div>
      <AuditLogClient activity={enrichedActivity} logins={logins ?? []} />
    </div>
  );
}