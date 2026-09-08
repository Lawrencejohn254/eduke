"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, User } from "lucide-react";

type StudentResult = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  photo_url: string | null;
  status: string;
  class: { name: string } | null;
  stream: { name: string } | null;
};

export default function StudentSearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/students/search?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        setResults(data.students ?? []);
        setOpen(true);
      } catch (err) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToStudent(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/students/${id}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search students by name or admission no."
          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
        />
        {loading && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-100 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-3 text-sm text-gray-400">
              No students found.
            </p>
          ) : (
            results.map((student) => (
              <button
                key={student.id}
                onClick={() => goToStudent(student.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-eduke-green/10 flex items-center justify-center">
                    <User size={14} className="text-eduke-green" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {student.admission_number}
                    {student.class?.name ? ` · ${student.class.name}` : ""}
                    {student.stream?.name ? ` ${student.stream.name}` : ""}
                  </p>
                </div>

                {student.status !== "Active" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    {student.status}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}