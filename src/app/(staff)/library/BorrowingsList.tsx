"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import { displayBorrowingStatus } from "@/lib/library";
import { X, Loader2 } from "lucide-react";

export type BorrowingRow = {
  id: string;
  borrowed_date: string;
  due_date: string | null;
  returned_date: string | null;
  status: string;
  book_id: string;
  book: { title: string } | null;
  student: { first_name: string; last_name: string; admission_number: string } | null;
};

export default function BorrowingsList({
  borrowings,
  canManage,
  showReturnAction,
  emptyMessage,
}: {
  borrowings: BorrowingRow[];
  canManage: boolean;
  showReturnAction: boolean;
  emptyMessage: string;
}) {
  if (borrowings.length === 0) {
    return <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
      <table>
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="p-3">Book</th>
            <th className="p-3">Student</th>
            <th className="p-3">Borrowed</th>
            <th className="p-3">Due</th>
            <th className="p-3">Returned</th>
            <th className="p-3">Status</th>
            {showReturnAction && <th className="p-3"></th>}
          </tr>
        </thead>
        <tbody>
          {borrowings.map((b) => (
            <Row key={b.id} borrowing={b} canManage={canManage} showReturnAction={showReturnAction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ borrowing, canManage, showReturnAction }: { borrowing: BorrowingRow; canManage: boolean; showReturnAction: boolean }) {
  const [showReturnModal, setShowReturnModal] = useState(false);
  const displayStatus = displayBorrowingStatus(borrowing.status, borrowing.due_date);

  return (
    <tr className="border-b border-gray-50">
      <td className="p-3 font-medium text-gray-900">{borrowing.book?.title ?? "-"}</td>
      <td className="p-3 text-gray-600">{borrowing.student ? `${borrowing.student.first_name} ${borrowing.student.last_name} (${borrowing.student.admission_number})` : "-"}</td>
      <td className="p-3 text-gray-500 text-xs">{formatDateDMY(borrowing.borrowed_date)}</td>
      <td className="p-3 text-gray-500 text-xs">{formatDateDMY(borrowing.due_date)}</td>
      <td className="p-3 text-gray-500 text-xs">{borrowing.returned_date ? formatDateDMY(borrowing.returned_date) : "-"}</td>
      <td className="p-3"><StatusBadge status={displayStatus} /></td>
      {showReturnAction && (
        <td className="p-3">
          {canManage && borrowing.status === "Borrowed" && (
            <button onClick={() => setShowReturnModal(true)} className="text-xs font-medium text-eduke-green hover:underline">
              Return Book
            </button>
          )}
        </td>
      )}
      {showReturnModal && <ReturnModal borrowing={borrowing} onClose={() => setShowReturnModal(false)} />}
    </tr>
  );
}

function ReturnModal({ borrowing, onClose }: { borrowing: BorrowingRow; onClose: () => void }) {
  const [condition, setCondition] = useState<"Good" | "Damaged" | "Lost">("Good");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    // "Good" closes the loan as Returned. Damaged/Lost close it under that
    // status instead — the copy is never re-added to available_copies.
    const newStatus = condition === "Good" ? "Returned" : condition;

    const { error: updateError } = await supabase
      .from("book_borrowings")
      .update({ status: newStatus, returned_date: new Date().toISOString().slice(0, 10) })
      .eq("id", borrowing.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    const { data: book } = await supabase
      .from("books")
      .select("id, available_copies, damaged_copies, lost_copies")
      .eq("id", borrowing.book_id)
      .maybeSingle();

    if (book) {
      if (condition === "Good") {
        await supabase.from("books").update({ available_copies: book.available_copies + 1 }).eq("id", book.id);
      } else if (condition === "Damaged") {
        await supabase.from("books").update({ damaged_copies: book.damaged_copies + 1 }).eq("id", book.id);
      } else {
        await supabase.from("books").update({ lost_copies: book.lost_copies + 1 }).eq("id", book.id);
      }
    }

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Return Book</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {borrowing.book?.title ?? "This book"}
          {borrowing.student ? ` — ${borrowing.student.first_name} ${borrowing.student.last_name}` : ""}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Condition on return</label>
            <div className="mt-1 space-y-1.5">
              {(["Good", "Damaged", "Lost"] as const).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer">
                  <input type="radio" name="condition" checked={condition === c} onChange={() => setCondition(c)} />
                  {c}
                  {c !== "Good" && <span className="text-xs text-gray-400">(won&apos;t return to circulation)</span>}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Confirm Return
          </button>
        </form>
      </div>
    </div>
  );
}