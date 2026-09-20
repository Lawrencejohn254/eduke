import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Users } from "lucide-react";
import StudentsLibraryList from "./StudentsLibraryList";

export default async function LibraryStudentsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const [{ data: students }, { data: borrowings }] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, admission_number, class:classes(name)")
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name"),
    supabase
      .from("book_borrowings")
      .select("student_id, status, due_date, book:books!inner(school_id)")
      .eq("book.school_id", profile.school_id)
      .eq("status", "Borrowed"),
  ]);

  const countByStudent = new Map<string, number>();
  const overdueByStudent = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);
  for (const b of borrowings ?? []) {
    if (!b.student_id) continue;
    countByStudent.set(b.student_id, (countByStudent.get(b.student_id) ?? 0) + 1);
    if (b.due_date && b.due_date < today) overdueByStudent.add(b.student_id);
  }

  const rows = (students ?? []).map((s) => ({
    ...s,
    currentlyBorrowed: countByStudent.get(s.id) ?? 0,
    hasOverdue: overdueByStudent.has(s.id),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} /> Students
        </h1>
        <p className="text-sm text-gray-500">Search students and see who currently has books out.</p>
      </div>

      <StudentsLibraryList rows={rows as never} />
    </div>
  );
}