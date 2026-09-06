"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export default function ReleaseResultsButton({ examId }: { examId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function release() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("exams").update({ status: "Results Released" }).eq("id", examId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={release}
      disabled={busy}
      className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Release Results to Parents
    </button>
  );
}
