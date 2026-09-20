"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Pencil } from "lucide-react";

type Book = {
  id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  category: string | null;
  publisher: string | null;
  publication_year: number | null;
  edition: string | null;
  language: string | null;
  shelf_location: string | null;
  cover_url: string | null;
  description: string | null;
  total_copies: number;
  available_copies: number;
  damaged_copies: number;
  lost_copies: number;
};
type ClassOption = { id: string; name: string };
type BookClassLink = { book_id: string; class_id: string };

export default function LibraryClient({
  schoolId,
  books,
  classes,
  bookClasses,
  canManage,
  autoOpenAdd = false,
}: {
  schoolId: string;
  books: Book[];
  classes: ClassOption[];
  bookClasses: BookClassLink[];
  canManage: boolean;
  autoOpenAdd?: boolean;
}) {
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (autoOpenAdd && canManage) {
      setEditingBook(null);
      setShowBookForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAdd]);

  const classesByBook = new Map<string, string[]>();
  for (const link of bookClasses) {
    const list = classesByBook.get(link.book_id) ?? [];
    list.push(link.class_id);
    classesByBook.set(link.book_id, list);
  }
  const classNameById = new Map(classes.map((c) => [c.id, c.name]));

  function openAddBook() {
    setEditingBook(null);
    setShowBookForm(true);
  }

  function openEditBook(book: Book) {
    setEditingBook(book);
    setShowBookForm(true);
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <button onClick={openAddBook} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> Add Book
        </button>
      )}
      {books.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No books in the catalogue yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Title</th>
                <th className="p-3">Author</th>
                <th className="p-3">Category</th>
                <th className="p-3">Classes</th>
                <th className="p-3">Shelf</th>
                <th className="p-3">Available</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => {
                const classIds = classesByBook.get(b.id) ?? [];
                return (
                  <tr key={b.id} className="border-b border-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {b.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.cover_url} alt="" className="w-8 h-10 object-cover rounded border border-gray-200" />
                        ) : null}
                        {b.title}
                      </div>
                    </td>
                    <td className="p-3 text-gray-600">{b.author ?? "-"}</td>
                    <td className="p-3 text-gray-600">{b.category ?? "-"}</td>
                    <td className="p-3 text-gray-600 text-xs">
                      {classIds.length === 0 ? (
                        "-"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {classIds.map((id) => (
                            <span key={id} className="bg-gray-100 rounded px-1.5 py-0.5">
                              {classNameById.get(id) ?? "?"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{b.shelf_location ?? "-"}</td>
                    <td className="p-3">
                      <span className={b.available_copies === 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
                        {b.available_copies} / {b.total_copies}
                      </span>
                      {(b.damaged_copies > 0 || b.lost_copies > 0) && (
                        <p className="text-[10px] text-gray-400">
                          {b.damaged_copies > 0 && `${b.damaged_copies} damaged`}
                          {b.damaged_copies > 0 && b.lost_copies > 0 && " · "}
                          {b.lost_copies > 0 && `${b.lost_copies} lost`}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      {canManage && (
                        <button onClick={() => openEditBook(b)} className="text-gray-400 hover:text-eduke-green" title="Edit book">
                          <Pencil size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showBookForm && (
        <BookFormModal
          schoolId={schoolId}
          classes={classes}
          book={editingBook}
          initialClassIds={editingBook ? classesByBook.get(editingBook.id) ?? [] : []}
          onClose={() => setShowBookForm(false)}
        />
      )}
    </div>
  );

  function BookFormModal({
    schoolId,
    classes,
    book,
    initialClassIds,
    onClose,
  }: {
    schoolId: string;
    classes: ClassOption[];
    book: Book | null;
    initialClassIds: string[];
    onClose: () => void;
  }) {
    const isEdit = !!book;
    const [title, setTitle] = useState(book?.title ?? "");
    const [isbn, setIsbn] = useState(book?.isbn ?? "");
    const [author, setAuthor] = useState(book?.author ?? "");
    const [publisher, setPublisher] = useState(book?.publisher ?? "");
    const [publicationYear, setPublicationYear] = useState(book?.publication_year?.toString() ?? "");
    const [category, setCategory] = useState(book?.category ?? "");
    const [edition, setEdition] = useState(book?.edition ?? "");
    const [language, setLanguage] = useState(book?.language ?? "English");
    const [shelfLocation, setShelfLocation] = useState(book?.shelf_location ?? "");
    const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "");
    const [description, setDescription] = useState(book?.description ?? "");
    const [copies, setCopies] = useState(book?.total_copies ?? 1);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialClassIds);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggleClass(id: string) {
      setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      const supabase = createClient();

      const payload = {
        title,
        isbn: isbn || null,
        author: author || null,
        publisher: publisher || null,
        publication_year: publicationYear ? Number(publicationYear) : null,
        category: category || null,
        edition: edition || null,
        language: language || null,
        shelf_location: shelfLocation || null,
        cover_url: coverUrl || null,
        description: description || null,
      };

      let bookId = book?.id ?? null;

      if (isEdit && book) {
        const delta = copies - book.total_copies;
        const newAvailable = Math.max(0, book.available_copies + delta);
        const { error: updateError } = await supabase
          .from("books")
          .update({ ...payload, total_copies: copies, available_copies: newAvailable })
          .eq("id", book.id);
        if (updateError) {
          setSaving(false);
          setError(updateError.message);
          return;
        }
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("books")
          .insert({ school_id: schoolId, ...payload, total_copies: copies, available_copies: copies })
          .select("id")
          .single();
        if (insertError || !inserted) {
          setSaving(false);
          setError(insertError?.message ?? "Could not create book.");
          return;
        }
        bookId = inserted.id;
      }

      if (bookId) {
        await supabase.from("book_classes").delete().eq("book_id", bookId);
        if (selectedClassIds.length > 0) {
          await supabase.from("book_classes").insert(selectedClassIds.map((class_id) => ({ book_id: bookId, class_id })));
        }
      }

      setSaving(false);
      onClose();
      router.refresh();
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Book" : "Add Book"}</h2>
            <button onClick={onClose}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="ISBN" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input type="number" placeholder="Publication year" value={publicationYear} onChange={(e) => setPublicationYear(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Subject / Category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Edition" value={edition} onChange={(e) => setEdition(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Language" value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Shelf / Location" value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input placeholder="Cover image URL (optional)" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea placeholder="Description / notes" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

            <div>
              <label className="text-xs text-gray-500">Number of copies</label>
              <input type="number" min={1} value={copies} onChange={(e) => setCopies(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1" />
            </div>

            <div>
              <label className="text-xs text-gray-500">Class(es) / grade this book is intended for</label>
              <div className="mt-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 grid grid-cols-2 gap-1">
                {classes.length === 0 && <p className="text-xs text-gray-400 col-span-2">No classes set up yet.</p>}
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-xs text-gray-700">
                    <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
              {saving && <Loader2 size={16} className="animate-spin" />} {isEdit ? "Save Changes" : "Save Book"}
            </button>
          </form>
        </div>
      </div>
    );
  }
}