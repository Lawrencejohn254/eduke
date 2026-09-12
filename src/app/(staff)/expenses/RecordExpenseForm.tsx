"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "./expense-categories";

const METHODS = ["Cash", "M-Pesa", "Cheque", "Bank Transfer", "Card"];

export default function RecordExpenseForm({ recordedBy }: { recordedBy: string | null }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Salaries & Wages");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function resetForm() {
    setCategory("Salaries & Wages");
    setCustomCategory("");
    setDescription("");
    setAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setMethod("Cash");
    setReference("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (category === "Other" && !customCategory.trim()) {
      setError("Enter a name for this custom expense category.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
    const { error } = await supabase.from("expenses").insert({
      school_id: profile!.school_id,
      category,
      custom_category: category === "Other" ? customCategory.trim() : null,
      description: description.trim() || null,
      amount: Number(amount),
      expense_date: expenseDate,
      payment_method: method,
      reference: reference.trim() || null,
      recorded_by: recordedBy,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
      >
        <Plus size={15} /> Record Expense
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Record Expense</h2>
              <button onClick={() => { setOpen(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              {category === "Other" && (
                <input
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Custom category name (e.g. Sports Day Prizes)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              )}
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <input required type="number" min={1} placeholder="Amount (KES)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input required type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Reference / invoice no. (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
                {saving && <Loader2 size={16} className="animate-spin" />} Save Expense
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}