import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";
import Link from "next/link";
import {
  Library,
  BookCopy,
  BookCheck,
  BookMarked,
  Undo2,
  AlertTriangle,
  Ban,
  Wrench,
  CalendarClock,
} from "lucide-react";

export default async function LibrarianDashboardPage() {
  const profile = await getProfileOrRedirect();

  if (
    profile.role !== "librarian" &&
    !["principal", "deputy_principal", "super_admin"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: school } = await supabase
    .from("schools")
    .select("timezone")
    .eq("id", profile.school_id)
    .maybeSingle();

  const timezone = school?.timezone ?? "Africa/Nairobi";

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [{ data: books }, { data: borrowings }] = await Promise.all([
    supabase
      .from("books")
      .select("id, total_copies, available_copies, damaged_copies, lost_copies")
      .eq("school_id", profile.school_id),
    supabase
      .from("book_borrowings")
      .select(
        "id, borrowed_date, due_date, returned_date, status, book:books!inner(title, school_id), student:students(first_name, last_name, admission_number)"
      )
      .eq("book.school_id", profile.school_id)
      .order("borrowed_date", { ascending: false }),
  ]);

  const bookRows = books ?? [];
  const borrowingRows = (borrowings ?? []) as unknown as {
    id: string;
    borrowed_date: string;
    due_date: string | null;
    returned_date: string | null;
    status: string;
    book: { title: string } | null;
    student: { first_name: string; last_name: string; admission_number: string } | null;
  }[];

  const totalTitles = bookRows.length;
  const totalCopies = bookRows.reduce((s, b) => s + b.total_copies, 0);
  const availableCopies = bookRows.reduce((s, b) => s + b.available_copies, 0);
  const damagedCopies = bookRows.reduce((s, b) => s + b.damaged_copies, 0);
  const lostCopies = bookRows.reduce((s, b) => s + b.lost_copies, 0);

  const borrowedActive = borrowingRows.filter((b) => b.status === "Borrowed");
  const overdueList = borrowedActive
    .filter((b) => b.due_date && b.due_date < today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
  const dueTodayList = borrowedActive.filter((b) => b.due_date === today);
  const returnedRows = borrowingRows.filter((b) => b.status === "Returned");
  const lostRows = borrowingRows.filter((b) => b.status === "Lost");
  const damagedRows = borrowingRows.filter((b) => b.status === "Damaged");

  const recentBorrowing = borrowingRows.slice(0, 8);
  const recentReturned = [...returnedRows]
    .sort((a, b) => ((a.returned_date ?? "") < (b.returned_date ?? "") ? 1 : -1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Librarian Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of the book catalogue and borrowing activity.</p>
        </div>
        <Link
          href="/library"
          className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors"
        >
          <Library size={16} /> Open Catalogue
        </Link>
      </div>

      {/* MAIN STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Book Titles" value={String(totalTitles)} icon={Library} />
        <StatCard label="Total Physical Copies" value={String(totalCopies)} icon={BookCopy} />
        <StatCard label="Available Books" value={String(availableCopies)} icon={BookCheck} />
        <StatCard label="Currently Borrowed" value={String(borrowedActive.length)} icon={BookMarked} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Returned Books" value={String(returnedRows.length)} icon={Undo2} />
        <StatCard label="Overdue Books" value={String(overdueList.length)} icon={AlertTriangle} tone={overdueList.length > 0 ? "danger" : "default"} />
        <StatCard label="Lost Books" value={String(lostRows.length || lostCopies)} icon={Ban} tone={lostRows.length + lostCopies > 0 ? "danger" : "default"} />
        <StatCard label="Damaged Books" value={String(damagedRows.length || damagedCopies)} icon={Wrench} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:max-w-md">
        <StatCard label="Due Today" value={String(dueTodayList.length)} icon={CalendarClock} tone={dueTodayList.length > 0 ? "danger" : "default"} />
      </div>

      {/* OVERDUE TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Overdue Books</h2>
          <Link href="/library" className="text-xs font-semibold text-eduke-green hover:underline">
            View in Catalogue →
          </Link>
        </div>
        {overdueList.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No overdue books. </p>
        ) : (
          <div className="eduke-table-wrap">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Book</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.slice(0, 10).map((b) => (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">{b.book?.title ?? "-"}</td>
                    <td className="p-3 text-gray-600">
                      {b.student ? `${b.student.first_name} ${b.student.last_name} (${b.student.admission_number})` : "-"}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{formatDateDMY(b.due_date)}</td>
                    <td className="p-3"><StatusBadge status="Overdue" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECENT ACTIVITY */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Borrowing Activity</h2>
          </div>
          {recentBorrowing.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No borrowing activity yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentBorrowing.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="text-gray-900 font-medium">{b.book?.title ?? "-"}</p>
                    <p className="text-xs text-gray-500">
                      {b.student ? `${b.student.first_name} ${b.student.last_name}` : "-"} · {formatDateDMY(b.borrowed_date)}
                    </p>
                  </div>
                  <StatusBadge status={b.status === "Borrowed" && b.due_date && b.due_date < today ? "Overdue" : b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recently Returned</h2>
          </div>
          {recentReturned.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">No returns recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentReturned.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <p className="text-gray-900 font-medium">{b.book?.title ?? "-"}</p>
                    <p className="text-xs text-gray-500">
                      {b.student ? `${b.student.first_name} ${b.student.last_name}` : "-"} · {formatDateDMY(b.returned_date)}
                    </p>
                  </div>
                  <StatusBadge status="Returned" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}