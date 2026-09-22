"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type Meal = {
  id: string;
  meal_date: string;
  meal_type: string;
  menu_item: string;
  students_served: number | null;
  notes: string | null;
  created_at: string;
};

const MEAL_TYPES = ["Breakfast", "Lunch", "Supper", "Snack"];

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

export default function KitchenModule({ schoolId, profileId, meals }: { schoolId: string; profileId: string; meals: Meal[] }) {
  const [showForm, setShowForm] = useState(false);

  const todayMeals = useMemo(() => meals.filter((m) => isToday(m.meal_date)), [meals]);
  const studentsServedToday = useMemo(() => todayMeals.reduce((sum, m) => sum + (m.students_served ?? 0), 0), [todayMeals]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Meals Logged Today" value={todayMeals.length} />
        <StatCard label="Students Served Today" value={studentsServedToday} />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> Log Meal
        </button>
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No meals logged yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Date</th>
                <th className="p-3">Meal</th>
                <th className="p-3">Menu</th>
                <th className="p-3">Students Served</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {meals.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="p-3 text-gray-700 text-xs">{formatDateDMY(m.meal_date)}</td>
                  <td className="p-3 text-gray-900 font-medium text-xs">{m.meal_type}</td>
                  <td className="p-3 text-gray-600 text-xs">{m.menu_item}</td>
                  <td className="p-3 text-gray-600 text-xs">{m.students_served ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">{m.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <MealForm schoolId={schoolId} profileId={profileId} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function MealForm({ schoolId, profileId, onClose }: { schoolId: string; profileId: string; onClose: () => void }) {
  const [mealDate, setMealDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState("Lunch");
  const [menuItem, setMenuItem] = useState("");
  const [studentsServed, setStudentsServed] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("meal_logs").insert({
      school_id: schoolId,
      meal_date: mealDate,
      meal_type: mealType,
      menu_item: menuItem,
      students_served: studentsServed ? Number(studentsServed) : null,
      notes: notes || null,
      recorded_by: profileId,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Log Meal</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <input
            required
            placeholder="What was served (e.g. Ugali & Sukuma Wiki)"
            value={menuItem}
            onChange={(e) => setMenuItem(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="Number of students served (optional)"
            value={studentsServed}
            onChange={(e) => setStudentsServed(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <textarea placeholder="Notes (e.g. supply shortage, feedback)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !menuItem.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Meal Log
          </button>
        </form>
      </div>
    </div>
  );
}