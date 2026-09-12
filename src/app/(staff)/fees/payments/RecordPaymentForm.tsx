"use client";

import { useMemo, useState } from "react";
import { Plus, X, Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string; className: string };

const CATEGORIES = ["Tuition", "Activity", "Boarding", "Uniform", "Exam Fee", "Trip", "Development", "Caution", "Other"];
const METHODS = ["Cash", "M-Pesa", "Cheque", "Bank Transfer", "Card"];

export default function RecordPaymentForm({
  students,
  termId,
  recordedBy,
}: {
  students: StudentOption[];
  termId: string;
  recordedBy: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Tuition");
  const [method, setMethod] = useState("Cash");
  const [mpesaReference, setMpesaReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedStudent = students.find((s) => s.id === studentId);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 20);
    return students
      .filter(
        (s) =>
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
          s.admission_number.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [students, searchQuery]);

  function selectStudent(s: StudentOption) {
    setStudentId(s.id);
    setSearchQuery(`${s.first_name} ${s.last_name} (${s.admission_number})`);
    setDropdownOpen(false);
  }

  function resetForm() {
    setStudentId("");
    setSearchQuery("");
    setAmount("");
    setMethod("Cash");
    setMpesaReference("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) {
      setError("Search for and select a student first.");
      return;
    }
    if (method === "M-Pesa" && !mpesaReference.trim()) {
      setError("Enter the M-Pesa transaction code.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("fee_payments").insert({
      student_id: studentId,
      term_id: termId,
      amount: Number(amount),
      fee_category: category,
      payment_method: method,
      mpesa_reference: method === "M-Pesa" ? mpesaReference.trim().toUpperCase() : null,
      received_by: recordedBy,
      status: "Confirmed",
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
        <Plus size={15} /> Record Payment
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Record Fee Payment</h2>
              <button onClick={() => { setOpen(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setStudentId("");
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search by name or admission number…"
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md">
                    {filteredStudents.length === 0 ? (
                      <p className="text-xs text-gray-400 px-3 py-2">No students match.</p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onMouseDown={() => selectStudent(s)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span>{s.first_name} {s.last_name}</span>
                          <span className="text-xs text-gray-400">{s.admission_number}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedStudent && (
                <p className="text-xs text-gray-500 -mt-1.5 px-1">Class: <span className="font-medium text-gray-700">{selectedStudent.className}</span></p>
              )}
              <input required type="number" min={1} placeholder="Amount (KES)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              {method === "M-Pesa" && (
                <input
                  required
                  value={mpesaReference}
                  onChange={(e) => setMpesaReference(e.target.value)}
                  placeholder="M-Pesa transaction code (e.g. QGH7XYZ123)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase"
                />
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
                {saving && <Loader2 size={16} className="animate-spin" />} Save Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}