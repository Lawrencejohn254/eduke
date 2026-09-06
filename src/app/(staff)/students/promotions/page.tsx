import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/Loaders";
import ExamScopeFilter from "./ExamScopeFilter";
import PromotionsClient from "./PromotionsClient";

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  if (!["principal", "deputy_principal", "super_admin"].includes(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const params = await searchParams;

  const { data: school } = await supabase.from("schools").select("promotion_threshold").eq("id", profile.school_id).single();
  const threshold = Number(school?.promotion_threshold ?? 50);

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date")
    .eq("school_id", profile.school_id)
    .order("start_date", { ascending: false });

  const selectedExamId = params.exam || exams?.[0]?.id;

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, next_class_id")
    .eq("school_id", profile.school_id)
    .order("name");

  const { data: streams } = await supabase
    .from("streams")
    .select("id, name, class_id")
    .in("class_id", (classes ?? []).map((c) => c.id));

  const { data: currentTerm } = await supabase.from("terms").select("id").eq("is_current", true).maybeSingle();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class_id, stream_id, balance_brought_forward")
    .eq("school_id", profile.school_id)
    .eq("status", "Active")
    .order("first_name");

  let averagesByStudent = new Map<string, number>();
  if (selectedExamId) {
    const { data: results } = await supabase
      .from("exam_results")
      .select("student_id, marks_obtained")
      .eq("exam_id", selectedExamId);

    const sums = new Map<string, { sum: number; count: number }>();
    for (const r of results ?? []) {
      if (r.marks_obtained === null) continue;
      const entry = sums.get(r.student_id) ?? { sum: 0, count: 0 };
      entry.sum += Number(r.marks_obtained);
      entry.count += 1;
      sums.set(r.student_id, entry);
    }
    averagesByStudent = new Map(
      Array.from(sums.entries()).map(([id, v]) => [id, Math.round((v.sum / v.count) * 10) / 10])
    );
  }

  if (!exams || exams.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Promotions</h1>
        <EmptyState title="No exams yet" description="Create and enter results for an exam first — promotion eligibility is based on exam performance." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500">
            Students averaging <strong>{threshold}%</strong> or above on the selected exam are auto-checked for promotion. Override any selection manually before confirming.
          </p>
        </div>
        <ExamScopeFilter exams={exams} />
      </div>

      <PromotionsClient
        classes={classes ?? []}
        streams={streams ?? []}
        students={(students ?? []).map((s) => ({
          ...s,
          average: averagesByStudent.get(s.id) ?? null,
          balance_brought_forward: Number(s.balance_brought_forward ?? 0),
        }))}
        threshold={threshold}
        currentTermId={currentTerm?.id ?? null}
      />
    </div>
  );
}
