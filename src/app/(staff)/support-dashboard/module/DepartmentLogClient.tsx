"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Entry = {
  id: string;
  entry: string;
  created_at: string;
  logged_by: string | null;
  profile: { first_name: string; last_name: string } | null;
};

export default function DepartmentLogClient({
  department,
  schoolId,
  profileId,
  entries,
}: {
  department: string;
  schoolId: string;
  profileId: string;
  entries: Entry[];
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("department_logs").insert({
      school_id: schoolId,
      department,
      entry: draft.trim(),
      logged_by: profileId,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDraft("");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <label className="text-xs text-gray-500">New log entry</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="e.g. Restocked first-aid kit, treated a minor scrape in Grade 4…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving || !draft.trim()} className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Add Entry
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Recent Entries</h2>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">No entries logged yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {entries.map((e) => (
              <div key={e.id} className="p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{e.entry}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {e.profile ? `${e.profile.first_name} ${e.profile.last_name}` : "Unknown"} ·{" "}
                  {new Date(e.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}