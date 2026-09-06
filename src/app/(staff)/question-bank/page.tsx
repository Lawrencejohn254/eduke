import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { EmptyState } from "@/components/Loaders";

export default async function QuestionBankPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  let query = supabase
    .from("question_bank")
    .select("id, question_text, question_type, difficulty, marks, topic, ai_generated, subject:subjects(name), class:classes(name)")
    .order("id", { ascending: false });

  if (profile.staff_id && profile.role !== "principal" && profile.role !== "deputy_principal" && profile.role !== "super_admin") {
    query = query.eq("teacher_id", profile.staff_id);
  }

  const { data: questions } = await query;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Question Bank</h1>
        <p className="text-sm text-gray-500">Questions saved from the AI Teaching Assistant, ready to reuse in future exams.</p>
      </div>

      {!questions || questions.length === 0 ? (
        <EmptyState title="No saved questions yet" description="Generate exam questions in the AI Teaching Assistant and save them here." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {questions.map((q) => {
            const subject = q.subject as unknown as { name: string } | null;
            const klass = q.class as unknown as { name: string } | null;
            return (
              <div key={q.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="badge badge-blue">{q.question_type ?? "Question"}</span>
                  <span className="badge badge-grey">{q.difficulty ?? "Mixed"}</span>
                  <span className="badge badge-green">{q.marks} marks</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{subject?.name} · {klass?.name} {q.topic ? `· ${q.topic}` : ""}</p>
                <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">{q.question_text}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
