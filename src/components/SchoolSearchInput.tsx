"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type School = { id: string; name: string; county: string | null; sub_county: string | null };

export default function SchoolSearchInput({
  value,
  onChange,
}: {
  /** Currently selected school, or null if none chosen yet. */
  value: School | null;
  onChange: (school: School | null) => void;
}) {
  const supabase = createClient();

  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // If the text no longer matches the selected school, treat it as
    // "nothing selected yet" so we don't submit a stale schoolId.
    if (value && query !== value.name) {
      onChange(null);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("search_schools_directory", {
        search_query: trimmed,
      });
      setLoading(false);

      if (error || !data) {
        setResults([]);
        return;
      }

      setResults(data as School[]);
      setShowDropdown(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectSchool(school: School) {
    setQuery(school.name);
    onChange(school);
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Start typing your child's school name..."
          className="w-full rounded-lg border border-gray-300 pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eduke-green"
        />
        {loading && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>

      {value && (
        <p className="mt-1 flex items-center gap-1 text-xs text-eduke-green font-medium">
          <CheckCircle2 size={13} />
          Selected: {value.name}
          {value.county ? ` — ${value.county}` : ""}
        </p>
      )}

      {!loading && !value && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-1 text-xs text-red-500">
          No school found matching &quot;{query.trim()}&quot;.
        </p>
      )}

      {showDropdown && results.length > 0 && !value && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                onMouseDown={() => selectSchool(school)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex flex-col"
              >
                <span className="font-medium text-gray-900">{school.name}</span>
                {(school.county || school.sub_county) && (
                  <span className="text-xs text-gray-400">
                    {[school.sub_county, school.county].filter(Boolean).join(", ")}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}