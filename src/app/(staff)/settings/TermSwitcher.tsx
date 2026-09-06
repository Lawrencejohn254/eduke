"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type TermRow = { id: string; term_number: string; is_current: boolean; academic_year: { year: number } | null };

export default function TermSwitcher({ terms }: { terms: TermRow[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function makeCurrent(termId: string) {
    setBusy(termId);
    const supabase = createClient();
    await supabase.from("terms").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("terms").update({ is_current: true }).eq("id", termId);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {terms.map((t) => (
        <div key={t.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
          <span className="text-sm text-gray-700">{t.term_number} {t.academic_year?.year}</span>
          {t.is_current ? (
            <span className="badge badge-green">Current</span>
          ) : (
            <button
              onClick={() => makeCurrent(t.id)}
              disabled={busy !== null}
              className="text-xs font-medium text-eduke-green hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              {busy === t.id && <Loader2 size={12} className="animate-spin" />} Set as current
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
