"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type BookOption = { id: string; title: string; available_copies: number };
type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string; class: { name: string } | null };

export default function BorrowForm({
  books,
  students,
  defaultLoanDays,
  librarianId,
}: {
  books: BookOption[];
  students: StudentOption[];
  defaultLoanDays: number;
  librarianId: string;
}) {
  const router = useRouter();
  const [bookId, setBookId] = useState(books[0]?.id ?? "");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + defaultLoanDays);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredStudents = studentQuery
    ? students.filter((s) =>
        `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(studentQuery.toLowerCase())
      )
    : students;

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookId) {
      setError("No copies available to borrow.");
      return;
    }
    if (!studentId) {
      setError("Select a student.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const book = books.find((b) => b.id === bookId)!;

    const { error: insertError } = await supabase.from("book_borrowings").insert({
      book_id: bookId,
      student_id: studentId,
      due_date: dueDate,
      status: "Borrowed",
      recorded_by: librarianId,
    });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }
    await supabase.from("books").update({ available_copies: book.available_copies - 1 }).eq("id", bookId);
    setSaving(false);
    router.push("/library/active-borrowings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <div>
        <label className="text-xs text-gray-500">Book</label>
        <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
          {books.length === 0 && <option value="">No copies available</option>}
          {books.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500">Search student</label>
        <input
          placeholder="Search by name or admission number…"
          value={studentQuery}
          onChange={(e) => setStudentQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
        />
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-2" size={Math.min(6, Math.max(3, filteredStudents.length))}>
          {filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name} — {s.admission_number}{s.class ? ` — ${s.class.name}` : ""}
            </option>
          ))}
        </select>
        {selectedStudent && (
          <p className="text-xs text-gray-500 mt-1">
            Borrowing for <span className="font-medium text-gray-700">{selectedStudent.first_name} {selectedStudent.last_name}</span>
            {" "}({selectedStudent.admission_number}{selectedStudent.class ? `, ${selectedStudent.class.name}` : ""})
          </p>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500">Due date</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={saving || !bookId || !studentId} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
        {saving && <Loader2 size={16} className="animate-spin" />} Confirm Borrow
      </button>
    </form>
  );
}