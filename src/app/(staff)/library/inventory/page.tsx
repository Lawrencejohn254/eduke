import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { Boxes } from "lucide-react";

export default async function LibraryInventoryPage() {
  const profile = await getProfileOrRedirect();
  const supabase = await createClient();

  const [{ data: books }, { data: activeBorrowings }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, isbn, shelf_location, total_copies, available_copies, damaged_copies, lost_copies")
      .eq("school_id", profile.school_id)
      .order("title"),
    supabase
      .from("book_borrowings")
      .select("book_id, book:books!inner(school_id)")
      .eq("book.school_id", profile.school_id)
      .eq("status", "Borrowed"),
  ]);

  const borrowedByBook = new Map<string, number>();
  for (const row of activeBorrowings ?? []) {
    borrowedByBook.set(row.book_id, (borrowedByBook.get(row.book_id) ?? 0) + 1);
  }

  const rows = books ?? [];
  const totals = rows.reduce(
    (acc, b) => ({
      total: acc.total + b.total_copies,
      available: acc.available + b.available_copies,
      borrowed: acc.borrowed + (borrowedByBook.get(b.id) ?? 0),
      damaged: acc.damaged + b.damaged_copies,
      lost: acc.lost + b.lost_copies,
    }),
    { total: 0, available: 0, borrowed: 0, damaged: 0, lost: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Boxes size={20} /> Inventory
        </h1>
        <p className="text-sm text-gray-500">
          {totals.total} physical copies across {rows.length} titles · {totals.available} available · {totals.borrowed} out · {totals.damaged} damaged · {totals.lost} lost
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No books in the catalogue yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Title</th>
                <th className="p-3">ISBN</th>
                <th className="p-3">Shelf</th>
                <th className="p-3">Total</th>
                <th className="p-3">Available</th>
                <th className="p-3">Borrowed</th>
                <th className="p-3">Damaged</th>
                <th className="p-3">Lost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{b.title}</td>
                  <td className="p-3 text-gray-500 text-xs">{b.isbn ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">{b.shelf_location ?? "-"}</td>
                  <td className="p-3 text-gray-700">{b.total_copies}</td>
                  <td className="p-3 text-gray-700">{b.available_copies}</td>
                  <td className="p-3 text-gray-700">{borrowedByBook.get(b.id) ?? 0}</td>
                  <td className="p-3 text-gray-700">{b.damaged_copies}</td>
                  <td className="p-3 text-gray-700">{b.lost_copies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}