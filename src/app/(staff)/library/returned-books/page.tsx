import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Undo2 } from "lucide-react";
import BorrowingsList from "../BorrowingsList";
import { canManageLibrary } from "@/lib/library";

export default async function ReturnedBooksPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = canManageLibrary(profile.role);

  const { data: borrowings, error } = await supabase
    .from("book_borrowings")
    .select("id, borrowed_date, due_date, returned_date, status, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)")
    .eq("book.school_id", profile.school_id)
    .eq("status", "Returned")
    .order("returned_date", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Undo2 size={20} /> Returned Books
        </h1>
        <p className="text-sm text-gray-500">Books that have been returned in good condition.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load returns.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <BorrowingsList
        borrowings={(borrowings ?? []) as never}
        canManage={canManage}
        showReturnAction={false}
        emptyMessage="No books returned yet."
      />
    </div>
  );
}