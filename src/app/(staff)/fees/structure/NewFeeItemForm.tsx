"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

const CATEGORIES = ["Tuition", "Activity", "Boarding", "Uniform", "Exam Fee", "Trip", "Development", "Caution", "Other"];

export default function NewFeeItemForm({ classes, termId }: { classes: { id: string; name: string }[]; termId: string }) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [mandatory, setMandatory] = useState(true);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("fee_structure").insert({
      class_id: classId,
      term_id: termId,
      fee_category: category,
      amount,
      is_mandatory: mandatory,
      description,
    });
    setSaving(false);
    setOpen(false);
    setAmount(0);
    setDescription("");
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg w-fit">
        <Plus size={15} /> Add Fee Item
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 grid md:grid-cols-3 gap-3">
      <div>
        <label className="text-sm font-medium text-gray-700">Class</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Amount (KES)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-gray-700">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
        <input type="checkbox" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} /> Mandatory
      </label>
      <div className="md:col-span-3 flex gap-2">
        <button onClick={handleCreate} disabled={saving || !classId || amount <= 0} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Save
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 px-3 py-2">Cancel</button>
      </div>
    </div>
  );
}
