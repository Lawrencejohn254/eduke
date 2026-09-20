"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LibrarySettingsForm({ schoolId, defaultLoanDays }: { schoolId: string; defaultLoanDays: number }) {
  const [days, setDays] = useState(defaultLoanDays);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("library_settings")
      .upsert({ school_id: schoolId, default_loan_days: days, updated_at: new Date().toISOString() }, { onConflict: "school_id" });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <div>
        <label className="text-xs text-gray-500">Default loan period (days)</label>
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
        />
        <p className="text-xs text-gray-400 mt-1">Used to pre-fill the due date when borrowing a book.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-eduke-green">Saved.</p>}
      <button type="submit" disabled={saving} className="flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 px-4 text-sm disabled:opacity-50">
        {saving && <Loader2 size={16} className="animate-spin" />} Save Settings
      </button>
    </form>
  );
}