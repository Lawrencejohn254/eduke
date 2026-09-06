"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, BookMarked } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";

type Book = { id: string; title: string; author: string | null; isbn: string | null; category: string | null; total_copies: number; available_copies: number };
type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string };
type Borrowing = {
  id: string;
  borrowed_date: string;
  due_date: string | null;
  returned_date: string | null;
  status: string;
  book_id: string;
  book: { title: string } | null;
  student: { first_name: string; last_name: string; admission_number: string } | null;
};

export default function LibraryClient({
  schoolId,
  books,
  students,
  borrowings,
  canManage,
}: {
  schoolId: string;
  books: Book[];
  students: StudentOption[];
  borrowings: Borrowing[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"catalogue" | "borrowings">("catalogue");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBorrow, setShowBorrow] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setTab("catalogue")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "catalogue" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
          Catalogue ({books.length})
        </button>
        <button onClick={() => setTab("borrowings")} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "borrowings" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
          Borrowings ({borrowings.filter((b) => b.status === "Borrowed" || b.status === "Overdue").length} active)
        </button>
      </div>

      {tab === "catalogue" && (
        <div className="space-y-3">
          {canManage && (
            <button onClick={() => setShowAddBook(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
              <Plus size={15} /> Add Book
            </button>
          )}
          {books.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No books in the catalogue yet.</p>
          ) : (
            <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
              <table>
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="p-3">Title</th>
                    <th className="p-3">Author</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50">
                      <td className="p-3 font-medium text-gray-900">{b.title}</td>
                      <td className="p-3 text-gray-600">{b.author ?? "-"}</td>
                      <td className="p-3 text-gray-600">{b.category ?? "-"}</td>
                      <td className="p-3">
                        <span className={b.available_copies === 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
                          {b.available_copies} / {b.total_copies}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "borrowings" && (
        <div className="space-y-3">
          {canManage && (
            <button onClick={() => setShowBorrow(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
              <BookMarked size={15} /> Borrow Book
            </button>
          )}
          {borrowings.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No borrowing records yet.</p>
          ) : (
            <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
              <table>
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="p-3">Book</th>
                    <th className="p-3">Student</th>
                    <th className="p-3">Borrowed</th>
                    <th className="p-3">Due</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {borrowings.map((b) => (
                    <BorrowingRow key={b.id} borrowing={b} canManage={canManage} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddBook && <AddBookModal schoolId={schoolId} onClose={() => setShowAddBook(false)} />}
      {showBorrow && <BorrowModal books={books} students={students} onClose={() => setShowBorrow(false)} />}
    </div>
  );

  function AddBookModal({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [category, setCategory] = useState("");
    const [copies, setCopies] = useState(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.from("books").insert({
        school_id: schoolId,
        title,
        author: author || null,
        category: category || null,
        total_copies: copies,
        available_copies: copies,
      });
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      onClose();
      router.refresh();
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Add Book</h2>
            <button onClick={onClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Author (optional)" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div>
              <label className="text-xs text-gray-500">Number of copies</label>
              <input type="number" min={1} value={copies} onChange={(e) => setCopies(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Save Book
            </button>
          </form>
        </div>
      </div>
    );
  }

  function BorrowModal({ books, students, onClose }: { books: Book[]; students: StudentOption[]; onClose: () => void }) {
    const availableBooks = books.filter((b) => b.available_copies > 0);
    const [bookId, setBookId] = useState(availableBooks[0]?.id ?? "");
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const [dueDate, setDueDate] = useState(() => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      return d.toISOString().slice(0, 10);
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!bookId) {
        setError("No copies available to borrow.");
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
      });
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
      await supabase.from("books").update({ available_copies: book.available_copies - 1 }).eq("id", bookId);
      setSaving(false);
      onClose();
      router.refresh();
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl w-full max-w-md p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">Borrow Book</h2>
            <button onClick={onClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {availableBooks.length === 0 && <option value="">No copies available</option>}
              {availableBooks.map((b) => <option key={b.id} value={b.id}>{b.title} ({b.available_copies} available)</option>)}
            </select>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
            </select>
            <div>
              <label className="text-xs text-gray-500">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving || !bookId} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Confirm Borrow
            </button>
          </form>
        </div>
      </div>
    );
  }
}

function BorrowingRow({ borrowing, canManage }: { borrowing: Borrowing; canManage: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isOverdue = borrowing.status === "Borrowed" && borrowing.due_date && new Date(borrowing.due_date) < new Date();
  const displayStatus = isOverdue ? "Overdue" : borrowing.status;

  async function handleReturn() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("book_borrowings").update({ status: "Returned", returned_date: new Date().toISOString().slice(0, 10) }).eq("id", borrowing.id);

    const { data: book } = await supabase.from("books").select("id, available_copies").eq("id", borrowing.book_id).maybeSingle();
    if (book) {
      await supabase.from("books").update({ available_copies: book.available_copies + 1 }).eq("id", book.id);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="p-3 font-medium text-gray-900">{borrowing.book?.title ?? "-"}</td>
      <td className="p-3 text-gray-600">{borrowing.student ? `${borrowing.student.first_name} ${borrowing.student.last_name}` : "-"}</td>
      <td className="p-3 text-gray-500 text-xs">{formatDateDMY(borrowing.borrowed_date)}</td>
      <td className="p-3 text-gray-500 text-xs">{formatDateDMY(borrowing.due_date)}</td>
      <td className="p-3"><StatusBadge status={displayStatus} /></td>
      <td className="p-3">
        {canManage && borrowing.status === "Borrowed" && (
          <button onClick={handleReturn} disabled={busy} className="text-xs font-medium text-eduke-green hover:underline disabled:opacity-50">
            {busy ? "Saving…" : "Mark Returned"}
          </button>
        )}
      </td>
    </tr>
  );
}
