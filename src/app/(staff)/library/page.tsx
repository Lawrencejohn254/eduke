import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Library } from "lucide-react";
import LibraryClient from "./LibraryClient";
import { canManageLibrary } from "@/lib/library";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = canManageLibrary(profile.role);
  const params = await searchParams;
  const autoOpenAdd = params.new === "book";

  const [
    { data: books, error: booksError },
    { data: classes },
    { data: bookClasses },
  ] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, isbn, category, publisher, publication_year, edition, language, shelf_location, cover_url, description, total_copies, available_copies, damaged_copies, lost_copies")
      .eq("school_id", profile.school_id)
      .order("title"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", profile.school_id)
      .order("name"),
    supabase
      .from("book_classes")
      .select("book_id, class_id, book:books!inner(school_id)")
      .eq("book.school_id", profile.school_id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Library size={20} /> Catalogue
        </h1>
        <p className="text-sm text-gray-500">Book catalogue.</p>
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
        classes={classes ?? []}
        bookClasses={(bookClasses ?? []) as never}
        canManage={canManage}
        autoOpenAdd={autoOpenAdd}
      />
    </div>
  );
}