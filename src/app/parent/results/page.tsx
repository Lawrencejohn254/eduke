import { getProfileOrRedirect } from "@/lib/get-profile";
import { getChildrenForGuardian } from "@/lib/get-children";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/Loaders";
import ChildSelector from "@/components/ChildSelector";

export default async function ParentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const children = await getChildrenForGuardian(profile.guardian_id);
  const params = await searchParams;

  if (children.length === 0) {
    return <EmptyState title="No children linked yet" description="Contact the school office to link your account to your child's record." />;
  }

  const activeChild = children.find((c) => c.id === params.child) ?? children[0];
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("exam_results")
    .select("marks_obtained, grade, points, teacher_comment, subject:subjects(name), exam:exams(name, out_of, term:terms(term_number))")
    .eq("student_id", activeChild.id)
    .order("id", { ascending: false });

  const byExam = new Map<string, { name: string; rows: typeof results }>();
  for (const r of results ?? []) {
    const exam = r.exam as unknown as { name: string } | null;
    const key = exam?.name ?? "Unknown Exam";
    if (!byExam.has(key)) byExam.set(key, { name: key, rows: [] });
    byExam.get(key)!.rows!.push(r);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Results (Matokeo)</h1>
          <p className="text-sm text-gray-500">{activeChild.first_name} {activeChild.last_name}</p>
        </div>
        <ChildSelector children={children.map((c) => ({ id: c.id, first_name: c.first_name, last_name: c.last_name, className: c.className }))} />
      </div>

      {byExam.size === 0 ? (
        <EmptyState title="No results yet" description="Exam results will appear here once released by the school." />
      ) : (
        Array.from(byExam.values()).map((group) => (
          <div key={group.name} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">{group.name}</p>
            <div className="space-y-1.5">
              {group.rows!.map((r, i) => {
                const subject = r.subject as unknown as { name: string } | null;
                return (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
                    <span className="text-gray-700">{subject?.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-500">{r.marks_obtained ?? "-"}</span>
                      <span className="badge badge-blue">{r.grade ?? "-"}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
