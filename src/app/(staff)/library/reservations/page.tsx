import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { CalendarClock } from "lucide-react";
import ReservationsClient from "./ReservationsClient";
import { canManageLibrary } from "@/lib/library";

export default async function ReservationsPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();
  const canManage = canManageLibrary(profile.role);

  const [{ data: reservations, error }, { data: books }, { data: students }] = await Promise.all([
    supabase
      .from("book_reservations")
      .select("id, reserved_date, status, notes, book_id, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)")
      .eq("book.school_id", profile.school_id)
      .order("reserved_date", { ascending: false }),
    supabase
      .from("books")
      .select("id, title")
      .eq("school_id", profile.school_id)
      .order("title"),
    supabase
      .from("students")
      .select("id, first_name, last_name, admission_number")
      .eq("school_id", profile.school_id)
      .eq("status", "Active")
      .order("first_name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarClock size={20} /> Reservations
        </h1>
        <p className="text-sm text-gray-500">Books reserved by students, awaiting availability.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load reservations.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      <ReservationsClient
        reservations={(reservations ?? []) as never}
        books={books ?? []}
        students={students ?? []}
        canManage={canManage}
      />
    </div>
  );
}