"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity_in_stock: number;
  reorder_level: number | null;
};
type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  issued_to: string | null;
  created_at: string;
  item: { name: string; unit: string } | null;
};

export default function StoreModule({
  schoolId,
  profileId,
  items,
  movements,
}: {
  schoolId: string;
  profileId: string;
  items: Item[];
  movements: Movement[];
}) {
  const [tab, setTab] = useState<"items" | "movements">("items");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);

  const lowStock = useMemo(() => items.filter((i) => i.reorder_level != null && i.quantity_in_stock <= i.reorder_level).length, [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Total Items" value={items.length} />
        <StatCard label="Low Stock Items" value={lowStock} tone={lowStock > 0 ? "danger" : "default"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          <button onClick={() => setTab("items")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "items" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Items ({items.length})
          </button>
          <button onClick={() => setTab("movements")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "movements" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Movements
          </button>
        </div>
        {tab === "items" ? (
          <button onClick={() => setShowItemForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
            <Plus size={15} /> Add Item
          </button>
        ) : (
          <button onClick={() => setShowMoveForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
            <Plus size={15} /> Record Movement
          </button>
        )}
      </div>

      {tab === "items" ? (
        items.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No items in the store yet.</p>
        ) : (
          <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
            <table>
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="p-3">Item</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">In Stock</th>
                  <th className="p-3">Reorder Level</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const low = i.reorder_level != null && i.quantity_in_stock <= i.reorder_level;
                  return (
                    <tr key={i.id} className="border-b border-gray-50">
                      <td className="p-3 font-medium text-gray-900">{i.name}</td>
                      <td className="p-3 text-gray-600 text-xs">{i.category ?? "-"}</td>
                      <td className="p-3">
                        <span className={low ? "text-red-600 font-semibold" : "text-gray-700"}>
                          {i.quantity_in_stock} {i.unit}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{i.reorder_level ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : movements.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No movements recorded yet.</p>
      ) : (
        <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-3">Item</th>
                <th className="p-3">Type</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Reason / Issued To</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="p-3 font-medium text-gray-900">{m.item?.name ?? "-"}</td>
                  <td className="p-3">
                    <span className={m.movement_type === "IN" ? "text-green-600 font-semibold text-xs" : "text-red-600 font-semibold text-xs"}>{m.movement_type}</span>
                  </td>
                  <td className="p-3 text-gray-700 text-xs">
                    {m.quantity} {m.item?.unit ?? ""}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{m.issued_to ?? m.reason ?? "-"}</td>
                  <td className="p-3 text-gray-500 text-xs">{formatDateDMY(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showItemForm && <ItemForm schoolId={schoolId} onClose={() => setShowItemForm(false)} />}
      {showMoveForm && <MovementForm schoolId={schoolId} profileId={profileId} items={items} onClose={() => setShowMoveForm(false)} />}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className={`text-xl font-bold ${tone === "danger" && value > 0 ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function ItemForm({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [openingQty, setOpeningQty] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("store_items").insert({
      school_id: schoolId,
      name,
      category: category || null,
      unit,
      quantity_in_stock: Number(openingQty) || 0,
      reorder_level: reorderLevel ? Number(reorderLevel) : null,
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
          <h2 className="font-semibold text-gray-900">Add Item</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Unit (e.g. pcs, kg)" value={unit} onChange={(e) => setUnit(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" min={0} placeholder="Opening quantity" value={openingQty} onChange={(e) => setOpeningQty(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="number" min={0} placeholder="Reorder level (optional)" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Item
          </button>
        </form>
      </div>
    </div>
  );
}

function MovementForm({
  schoolId,
  profileId,
  items,
  onClose,
}: {
  schoolId: string;
  profileId: string;
  items: Item[];
  onClose: () => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId) {
      setError("Select an item.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const item = items.find((i) => i.id === itemId)!;
    const qty = Number(quantity) || 0;

    const { error: insertError } = await supabase.from("store_movements").insert({
      school_id: schoolId,
      item_id: itemId,
      movement_type: movementType,
      quantity: qty,
      reason: reason || null,
      issued_to: issuedTo || null,
      recorded_by: profileId,
    });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const newQty = movementType === "IN" ? item.quantity_in_stock + qty : item.quantity_in_stock - qty;
    await supabase.from("store_items").update({ quantity_in_stock: newQty, updated_at: new Date().toISOString() }).eq("id", itemId);

    setSaving(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">Record Movement</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {items.length === 0 && <option value="">No items yet — add one first</option>}
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity_in_stock} {i.unit} in stock)
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={movementType} onChange={(e) => setMovementType(e.target.value as "IN" | "OUT")} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
            <input type="number" min={0} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          {movementType === "OUT" && (
            <input placeholder="Issued to (e.g. Kitchen, Grade 5)" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          )}
          <input placeholder="Reason / notes (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !itemId} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Movement
          </button>
        </form>
      </div>
    </div>
  );
}