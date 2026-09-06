import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import LessonPlanRow from "./LessonPlanRow";

export default async function LessonPlansPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canReview = ["principal", "deputy_principal", "hod", "super_admin"].includes(profile.role);

  let query = supabase
    .from("lesson_plans")
    .select(
      "id, topic, subtopic, week_number, status, ai_generated, submitted_at, hod_comments, content, subject:subjects(name), stream:streams(name, class:classes(name)), teacher:staff!lesson_plans_teacher_id_fkey(first_name, last_name)"
    )
    .order("submitted_at", { ascending: false, nullsFirst: false });

  if (!canReview && profile.staff_id) {
    query = query.eq("teacher_id", profile.staff_id);
  }

  const { data: plans, error: plansError } = await query;
  console.log("[DEBUG lesson-plans] profile.id:", profile.id, "| staff_id:", profile.staff_id, "| role:", profile.role);
  console.log("[DEBUG lesson-plans] query error:", plansError);
  console.log("[DEBUG lesson-plans] rows returned:", plans?.length);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{canReview ? "Lesson Plans" : "My Lesson Plans"}</h1>
        <p className="text-sm text-gray-500">
          {canReview ? "Review and approve lesson plans submitted by teachers." : "Track your submitted and draft lesson plans."}
        </p>
      </div>

      {plansError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load lesson plans.</p>
          <p className="mt-1 font-mono text-xs">{plansError.message}</p>
        </div>
      )}

      {!plansError && (!plans || plans.length === 0) ? (
        <EmptyState title="No lesson plans yet" description="Use the AI Teaching Assistant to generate your first lesson plan." />
      ) : plans && plans.length > 0 ? (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Topic</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Class/Stream</th>
                <th className="p-3">Week</th>
                {canReview && <th className="p-3">Teacher</th>}
                <th className="p-3">AI</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((lp) => {
                const subject = lp.subject as unknown as { name: string } | null;
                const stream = lp.stream as unknown as { name: string; class: { name: string } | null } | null;
                const teacher = lp.teacher as unknown as { first_name: string; last_name: string } | null;
                return (
                  <LessonPlanRow
                    key={lp.id}
                    id={lp.id}
                    topic={lp.topic}
                    subject={subject?.name ?? "-"}
                    classStream={stream ? `${stream.class?.name ?? ""} ${stream.name}` : "-"}
                    week={lp.week_number}
                    teacher={teacher ? `${teacher.first_name} ${teacher.last_name}` : "-"}
                    aiGenerated={lp.ai_generated}
                    status={lp.status}
                    submitted={formatDateDMY(lp.submitted_at)}
                    content={lp.content ?? ""}
                    hodComments={lp.hod_comments}
                    canReview={canReview}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
