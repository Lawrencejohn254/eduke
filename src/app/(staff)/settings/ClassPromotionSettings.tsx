"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

type ClassRow = { id: string; name: string; next_class_id: string | null };

export default function ClassPromotionSettings({
  classes,
  promotionThreshold,
  schoolId,
}: {
  classes: ClassRow[];
  promotionThreshold: number;
  schoolId: string;
}) {
  const [nextClassMap, setNextClassMap] = useState<Record<string, string>>(
    Object.fromEntries(classes.map((c) => [c.id, c.next_class_id ?? ""]))
  );
  const [threshold, setThreshold] = useState(promotionThreshold);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setSaved(null);
    const supabase = createClient();

    for (const c of classes) {
      await supabase.from("classes").update({ next_class_id: nextClassMap[c.id] || null }).eq("id", c.id);
    }
    const { error } = await supabase.from("schools").update({ promotion_threshold: threshold }).eq("id", schoolId);

    setSaving(false);
    setSaved(error ? `Error: ${error.message}` : "Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500">Promotion threshold (average marks %)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        {classes.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
            <span className="text-sm text-gray-700 font-medium">{c.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">promotes to</span>
              <select
                value={nextClassMap[c.id] ?? ""}
                onChange={(e) => setNextClassMap((prev) => ({ ...prev, [c.id]: e.target.value }))}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                <option value="">Not set (top class / graduating)</option>
                {classes.filter((other) => other.id !== c.id).map((other) => (
                  <option key={other.id} value={other.id}>{other.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Promotion Settings
      </button>
      {saved && <p className="text-sm text-eduke-green">{saved}</p>}
    </div>
  );
}
