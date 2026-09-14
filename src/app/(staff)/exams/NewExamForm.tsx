"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

const CUSTOM_OPTION = "__custom__";

export default function NewExamForm({
  classes,
  termId,
  examTypes,
}: {
  classes: { id: string; name: string }[];
  termId: string | null;
  examTypes: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [examType, setExamType] = useState(examTypes[0] ?? CUSTOM_OPTION);
  const [customType, setCustomType] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [outOf, setOutOf] = useState(100);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isCustom = examType === CUSTOM_OPTION;

  async function handleCreate() {
    setError(null);

    const trimmedCustom = customType.trim();
    if (isCustom && !trimmedCustom) {
      setError("Enter a name for the custom exam type.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", auth.user!.id).single();

      // A custom type is added to exam_types first (so it's immediately
      // available for every future exam, not just this one), then used as
      // this exam's type. assign_exam_type() also case-insensitively
      // dedupes, so "cat 1" typed as "custom" just resolves back to the
      // existing "CAT 1" rather than creating a near-duplicate.
      let resolvedType = examType;
      if (isCustom) {
        const { data: newType, error: typeError } = await supabase.rpc("assign_exam_type", {
          p_name: trimmedCustom,
        });
        if (typeError) throw typeError;
        resolvedType = newType as string;
      }

      const { error: insertError } = await supabase.from("exams").insert({
        school_id: prof?.school_id,
        name,
        exam_type: resolvedType,
        class_id: classId,
        term_id: termId,
        start_date: startDate || null,
        end_date: endDate || null,
        out_of: outOf,
        status: "Upcoming",
      });
      if (insertError) throw insertError;

      setOpen(false);
      setName("");
      setCustomType("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create exam.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors w-fit"
      >
        <Plus size={15} /> New Exam
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 grid md:grid-cols-3 gap-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Exam Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Term 2 Mid-Term Exam" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Type</label>
        <select value={examType} onChange={(e) => setExamType(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {examTypes.map((t) => <option key={t}>{t}</option>)}
          <option value={CUSTOM_OPTION}>+ Custom type...</option>
        </select>
        {isCustom && (
          <input
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder="e.g. Opener Exam"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Class</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Start Date</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">End Date</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Out Of</label>
        <input type="number" value={outOf} onChange={(e) => setOutOf(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      {error && <div className="md:col-span-3 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{error}</div>}
      <div className="md:col-span-3 flex gap-2">
        <button onClick={handleCreate} disabled={saving || !name || !classId} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Create Exam
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
      </div>
    </div>
  );
}