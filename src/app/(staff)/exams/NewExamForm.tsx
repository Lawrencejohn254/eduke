"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

const EXAM_TYPES = ["CAT 1", "CAT 2", "CAT 3", "Mid-Term", "End of Term", "Mock", "Pre-KCSE", "CBC Summative"];

export default function NewExamForm({ classes, termId }: { classes: { id: string; name: string }[]; termId: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [examType, setExamType] = useState(EXAM_TYPES[0]);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [outOf, setOutOf] = useState(100);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    setSaving(true);
    const supabase = createClient();
    const { data: profile } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", profile.user!.id).single();
    await supabase.from("exams").insert({
      school_id: prof?.school_id,
      name,
      exam_type: examType,
      class_id: classId,
      term_id: termId,
      start_date: startDate || null,
      end_date: endDate || null,
      out_of: outOf,
      status: "Upcoming",
    });
    setSaving(false);
    setOpen(false);
    setName("");
    router.refresh();
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
          {EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
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
      <div className="md:col-span-3 flex gap-2">
        <button onClick={handleCreate} disabled={saving || !name || !classId} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Create Exam
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
      </div>
    </div>
  );
}
