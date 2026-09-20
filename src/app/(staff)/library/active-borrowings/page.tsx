import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { BookMarked } from "lucide-react";
import Link from "next/link";
import BorrowingsList from "../BorrowingsList";
import { canManageLibrary } from "@/lib/library";

export default async function ActiveBorrowingsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = canManageLibrary(profile.role);

  const { data: borrowings, error } = await supabase
    .from("book_borrowings")
    .select("id, borrowed_date, due_date, returned_date, status, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)")
    .eq("book.school_id", profile.school_id)
    .eq("status", "Borrowed")
    .order("due_date", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookMarked size={20} /> Active Borrowings
          </h1>
          <p className="text-sm text-gray-500">Books currently out on loan.</p>
        </div>
        {canManage && (
          <Link href="/library/borrow" className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors">
            <BookMarked size={16} /> Borrow Book
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load borrowings.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <BorrowingsList
        borrowings={(borrowings ?? []) as never}
        canManage={canManage}
        showReturnAction
        emptyMessage="No books currently on loan."
      />
    </div>
  );
}