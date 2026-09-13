import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Library } from "lucide-react";
import LibraryClient from "./LibraryClient";

export default async function LibraryPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = ["principal", "deputy_principal", "super_admin", "hod", "teacher"].includes(profile.role);

  const [
    { data: books, error: booksError },
    { data: students },
    { data: borrowings },
  ] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, isbn, category, total_copies, available_copies")
      .eq("school_id", profile.school_id)
      .order("title"),
    supabase
      .from("students")
      .select("id, first_name, last_name, admission_number")
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name"),
    supabase
      .from("book_borrowings")
      .select("id, borrowed_date, due_date, returned_date, status, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)")
      .eq("book.school_id", profile.school_id)
      .order("borrowed_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Library size={20} /> Library
        </h1>
        <p className="text-sm text-gray-500">Book catalogue and borrowing records.</p>
      </div>

      {booksError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load the library.</p>
          <p className="mt-1 font-mono text-xs">{booksError.message}</p>
        </div>
      )}

      <LibraryClient
        schoolId={profile.school_id}
        books={books ?? []}
        students={students ?? []}
        borrowings={(borrowings ?? []) as never}
        canManage={canManage}
      />
    </div>
  );
}
