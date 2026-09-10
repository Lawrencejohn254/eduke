"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type StudentMatch = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_name: string | null;
};

export default function StudentLookupInput({
  schoolId,
  value,
  onChange,
  onMatchChange,
}: {
  schoolId: string;
  value: string;
  onChange: (admissionNumber: string) => void;
  /** Fired whenever the currently-typed admission number resolves (or stops
   * resolving) to exactly one student, so the parent form can store the
   * confirmed name alongside it. */
  onMatchChange?: (student: StudentMatch | null) => void;
}) {
  const supabase = createClient();
  const [results, setResults] = useState<StudentMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      onMatchChange?.(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_number, class:classes(name)")
        .eq("school_id", schoolId)
        .ilike("admission_number", `${query}%`)
        .limit(5);

      setLoading(false);

      if (error || !data) {
        setResults([]);
        onMatchChange?.(null);
        return;
      }

      const mapped: StudentMatch[] = data.map((s) => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        admission_number: s.admission_number,
        class_name: (s.class as unknown as { name: string } | null)?.name ?? null,
      }));

      setResults(mapped);
      setShowDropdown(true);

      // Exact match on the full admission number -> auto-confirm.
      const exact = mapped.find(
        (m) => m.admission_number.toLowerCase() === query.toLowerCase()
      );
      onMatchChange?.(exact ?? null);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, schoolId]);

  const exactMatch = results.find(
    (m) => m.admission_number.toLowerCase() === value.trim().toLowerCase()
  );

  function selectStudent(student: StudentMatch) {
    onChange(student.admission_number);
    onMatchChange?.(student);
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Type admission number..."
          className="w-full rounded-lg border border-gray-300 pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>

      {exactMatch && (
        <p className="mt-1 flex items-center gap-1 text-xs text-eduke-green font-medium">
          <CheckCircle2 size={13} />
          Matches: {exactMatch.first_name} {exactMatch.last_name}
          {exactMatch.class_name ? ` — ${exactMatch.class_name}` : ""}
        </p>
      )}

      {!loading && !exactMatch && value.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1 text-xs text-red-500">No student found with that admission number.</p>
      )}

      {showDropdown && results.length > 0 && !exactMatch && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onMouseDown={() => selectStudent(student)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
              >
                <span className="font-medium text-gray-900">
                  {student.first_name} {student.last_name}
                </span>
                <span className="text-xs text-gray-400">
                  Adm No: {student.admission_number}
                  {student.class_name ? ` · ${student.class_name}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}