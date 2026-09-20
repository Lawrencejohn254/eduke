"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";

type Reservation = {
  id: string;
  reserved_date: string;
  status: string;
  notes: string | null;
  book_id: string;
  book: { title: string } | null;
  student: { first_name: string; last_name: string; admission_number: string } | null;
};
type BookOption = { id: string; title: string };
type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string };

export default function ReservationsClient({
  reservations,
  books,
  students,
  canManage,
}: {
  reservations: Reservation[];
  books: BookOption[];
  students: StudentOption[];
  canManage: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("book_reservations").update({ status }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> New Reservation
        </button>
      )}

      {reservations.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No reservations yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Book</th>
                <th className="p-3">Student</th>
                <th className="p-3">Reserved</th>
                <th className="p-3">Status</th>
                {canManage && <th className="p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{r.book?.title ?? "-"}</td>
                  <td className="p-3 text-gray-600">{r.student ? `${r.student.first_name} ${r.student.last_name} (${r.student.admission_number})` : "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">{formatDateDMY(r.reserved_date)}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  {canManage && (
                    <td className="p-3 space-x-2">
                      {r.status === "Pending" && (
                        <>
                          <button onClick={() => updateStatus(r.id, "Fulfilled")} className="text-xs font-medium text-eduke-green hover:underline">Fulfil</button>
                          <button onClick={() => updateStatus(r.id, "Cancelled")} className="text-xs font-medium text-gray-500 hover:underline">Cancel</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <ReservationForm books={books} students={students} onClose={() => setShowForm(false)} />}
    </div>
  );

  function ReservationForm({ books, students, onClose }: { books: BookOption[]; students: StudentOption[]; onClose: () => void }) {
    const [bookId, setBookId] = useState(books[0]?.id ?? "");
    const [studentId, setStudentId] = useState(students[0]?.id ?? "");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.from("book_reservations").insert({
        book_id: bookId,
        student_id: studentId,
        notes: notes || null,
        status: "Pending",
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
            <h2 className="font-semibold text-gray-900">New Reservation</h2>
            <button onClick={onClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
            </select>
            <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} Save Reservation
            </button>
          </form>
        </div>
      </div>
    );
  }
}