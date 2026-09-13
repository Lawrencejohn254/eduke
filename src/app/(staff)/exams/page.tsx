import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import NewExamForm from "./NewExamForm";
import ExamClassFilter from "./ExamClassFilter";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canCreate = ["principal", "deputy_principal", "super_admin"].includes(profile.role);
  const canViewAnalytics = ["principal", "deputy_principal", "super_admin", "hod"].includes(profile.role);
  const params = await searchParams;

  let examsQuery = supabase
    .from("exams")
    .select("id, name, exam_type, start_date, end_date, status, class:classes(name)")
    .eq("school_id", profile.school_id)
    .order("start_date", { ascending: false });

  if (params.class) examsQuery = examsQuery.eq("class_id", params.class);

  const [
    { data: classes },
    { data: exams },
    { data: currentTerm },
  ] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
    examsQuery,
    supabase.from("terms").select("id").eq("is_current", true).maybeSingle(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Exams</h1>
          <p className="text-sm text-gray-500">Manage exams, enter marks, and release results.</p>
        </div>
        {canViewAnalytics && (
          <Link href="/exams/performance" className="flex items-center gap-1.5 bg-white border border-gray-200 text-sm font-medium px-3 py-2 rounded-lg hover:border-eduke-green transition-colors">
            <BarChart3 size={15} /> Performance Analytics
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        {canCreate && <NewExamForm classes={classes ?? []} termId={currentTerm?.id ?? null} />}
        <ExamClassFilter classes={classes ?? []} />
      </div>

      {!exams || exams.length === 0 ? (
        <EmptyState title="No exams yet" description="Create an exam to begin recording marks." />
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Exam</th>
                <th className="p-3">Type</th>
                <th className="p-3">Class</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => {
                const klass = ex.class as unknown as { name: string } | null;
                return (
                  <tr key={ex.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">{ex.name}</td>
                    <td className="p-3 text-gray-600">{ex.exam_type}</td>
                    <td className="p-3 text-gray-600">{klass?.name ?? "-"}</td>
                    <td className="p-3 text-gray-500 text-xs">{formatDateDMY(ex.start_date)} – {formatDateDMY(ex.end_date)}</td>
                    <td className="p-3"><StatusBadge status={ex.status} /></td>
                    <td className="p-3 flex gap-3">
                      <Link href={`/exams/${ex.id}/marks`} className="text-xs font-semibold text-eduke-green hover:underline">Enter Marks</Link>
                      <Link href={`/exams/${ex.id}/results`} className="text-xs font-semibold text-eduke-green hover:underline">Results</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
