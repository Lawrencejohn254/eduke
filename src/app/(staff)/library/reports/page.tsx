import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { FileBarChart } from "lucide-react";
import ReportsClient from "./ReportsClient";

export default async function LibraryReportsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const [{ data: books, error: booksError }, { data: borrowings, error: borrowingsError }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, isbn, category, shelf_location, total_copies, available_copies, damaged_copies, lost_copies")
      .eq("school_id", profile.school_id)
      .order("title"),
    supabase
      .from("book_borrowings")
      .select(
        "id, borrowed_date, due_date, returned_date, status, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number, class:classes(name))"
      )
      .eq("book.school_id", profile.school_id)
      .order("borrowed_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileBarChart size={20} /> Reports
        </h1>
        <p className="text-sm text-gray-500">Library reports, exportable as CSV.</p>
      </div>

      {(booksError || borrowingsError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load report data.</p>
          <p className="mt-1 font-mono text-xs">{booksError?.message ?? borrowingsError?.message}</p>
        </div>
      )}

      <ReportsClient books={books ?? []} borrowings={(borrowings ?? []) as never} />
    </div>
  );
}