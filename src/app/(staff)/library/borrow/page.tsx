import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { BookMarked } from "lucide-react";
import BorrowForm from "./BorrowForm";
import { canManageLibrary } from "@/lib/library";

export default async function BorrowBookPage() {
  const profile = await getProfileOrRedirect();
  if (!canManageLibrary(profile.role)) redirect("/library");

  const supabase = await createClient();

  const [{ data: books }, { data: students }, { data: settings }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, available_copies")
      .eq("school_id", profile.school_id)
      .gt("available_copies", 0)
      .order("title"),
    supabase
      .from("students")
      .select("id, first_name, last_name, admission_number, class:classes(name)")
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name"),
    supabase
      .from("library_settings")
      .select("default_loan_days")
      .eq("school_id", profile.school_id)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked size={20} /> Borrow Book
        </h1>
        <p className="text-sm text-gray-500">Record a book being borrowed by a student.</p>
      </div>

      <BorrowForm
        books={books ?? []}
        students={(students ?? []) as never}
        defaultLoanDays={settings?.default_loan_days ?? 14}
        librarianId={profile.id}
      />
    </div>
  );
}