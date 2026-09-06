"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Save, Download, Printer, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { formatKES } from "@/lib/format";
import { printHtmlDocument, downloadHtmlAsPdf, buildFeeStructureTableHtml } from "@/lib/print";

const STANDARD_CATEGORIES = ["Tuition", "Activity", "Boarding", "Uniform", "Exam Fee", "Trip", "Development", "Caution", "Other"];

type ClassRow = { id: string; name: string };
type FeeRow = { class_id: string; fee_category: string; amount: number; is_mandatory: boolean; description: string | null };
type DraftRow = { amount: string; mandatory: boolean; description: string };

export default function FeeStructureClient({
  termId,
  termLabel,
  classes,
  existingRows,
}: {
  termId: string;
  termLabel: string;
  classes: ClassRow[];
  existingRows: FeeRow[];
}) {
  const [rows, setRows] = useState(existingRows);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const router = useRouter();

  const allCategories = [...STANDARD_CATEGORIES, ...customCategories];

  function loadDraftForClass(cid: string, source: FeeRow[]) {
    setClassId(cid);
    const forClass = source.filter((r) => r.class_id === cid);

    const custom = forClass.map((r) => r.fee_category).filter((cat) => !STANDARD_CATEGORIES.includes(cat));
    setCustomCategories(Array.from(new Set(custom)));

    const next: Record<string, DraftRow> = {};
    for (const cat of [...STANDARD_CATEGORIES, ...custom]) {
      const existing = forClass.find((r) => r.fee_category === cat);
      next[cat] = {
        amount: existing ? String(existing.amount) : "",
        mandatory: existing ? existing.is_mandatory : true,
        description: existing?.description ?? "",
      };
    }
    setDraft(next);
    setSaved(null);
    setError(null);
    setAddingCategory(false);
    setNewCategoryName("");
  }

  useEffect(() => {
    if (classId) loadDraftForClass(classId, rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateDraft(cat: string, patch: Partial<DraftRow>) {
    setDraft((prev) => ({
      ...prev,
      [cat]: {
        amount: prev[cat]?.amount ?? "",
        mandatory: prev[cat]?.mandatory ?? true,
        description: prev[cat]?.description ?? "",
        ...patch,
      },
    }));
  }

  function confirmAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allCategories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" already exists in this list.`);
      return;
    }
    setCustomCategories((prev) => [...prev, name]);
    updateDraft(name, { amount: "", mandatory: true, description: "" });
    setNewCategoryName("");
    setAddingCategory(false);
    setError(null);
  }

  function removeCustomCategory(cat: string) {
    setCustomCategories((prev) => prev.filter((c) => c !== cat));
    setDraft((prev) => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(null);
    const supabase = createClient();

    const { error: deleteError } = await supabase.from("fee_structure").delete().eq("class_id", classId).eq("term_id", termId);
    if (deleteError) {
      setSaving(false);
      setError(deleteError.message);
      return;
    }

    const toInsert = allCategories
      .filter((cat) => Number(draft[cat]?.amount) > 0)
      .map((cat) => ({
        class_id: classId,
        term_id: termId,
        fee_category: cat,
        amount: Number(draft[cat].amount),
        is_mandatory: draft[cat].mandatory,
        description: draft[cat].description || null,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("fee_structure").insert(toInsert);
      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }
    }

    setSaving(false);
    setSaved("Fee structure saved.");
    router.refresh();

    const { data } = await supabase.from("fee_structure").select("class_id, fee_category, amount, is_mandatory, description").eq("term_id", termId);
    const fresh = (data ?? []).map((r) => ({
      class_id: r.class_id,
      fee_category: r.fee_category,
      amount: Number(r.amount),
      is_mandatory: r.is_mandatory,
      description: r.description,
    }));
    setRows(fresh);
  }

  function tableHtmlForClass(cid: string) {
    const klass = classes.find((c) => c.id === cid);
    const forClass = rows.filter((r) => r.class_id === cid);
    return {
      className: klass?.name ?? "",
      html: buildFeeStructureTableHtml({
        className: klass?.name ?? "",
        termLabel,
        rows: forClass.map((r) => ({
          category: r.fee_category,
          amount: r.amount,
          mandatory: r.is_mandatory,
          description: r.description,
        })),
      }),
    };
  }

  function handlePrint(cid: string) {
    const { className, html } = tableHtmlForClass(cid);
    printHtmlDocument(`Fee Structure - ${className} - ${termLabel}`, html);
  }

  async function handleDownload(cid: string) {
    const { className, html } = tableHtmlForClass(cid);
    setDownloadingId(cid);
    try {
      await downloadHtmlAsPdf(`fee-structure-${className.replace(/\s+/g, "-").toLowerCase()}.pdf`, html);
    } finally {
      setDownloadingId(null);
    }
  }

  const classesWithStructure = classes.filter((c) => rows.some((r) => r.class_id === c.id));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500">Class</label>
          <select
            value={classId}
            onChange={(e) => loadDraftForClass(e.target.value, rows)}
            className="block rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
          >
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="eduke-table-wrap">
          <table>
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="p-2">Category</th>
                <th className="p-2">Amount (KES)</th>
                <th className="p-2">Mandatory</th>
                <th className="p-2">Description</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {allCategories.map((cat) => {
                const isCustom = customCategories.includes(cat);
                return (
                  <tr key={cat} className="border-b border-gray-50">
                    <td className="p-2 font-medium text-gray-800">
                      {cat} {isCustom && <span className="text-[10px] text-indigo-500 font-normal">(custom)</span>}
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={0}
                        value={draft[cat]?.amount ?? ""}
                        onChange={(e) => updateDraft(cat, { amount: e.target.value })}
                        className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={draft[cat]?.mandatory ?? true}
                        onChange={(e) => updateDraft(cat, { mandatory: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={draft[cat]?.description ?? ""}
                        onChange={(e) => updateDraft(cat, { description: e.target.value })}
                        placeholder="optional"
                        className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-2">
                      {isCustom && (
                        <button onClick={() => removeCustomCategory(cat)} className="text-gray-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          {addingCategory ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmAddCategory()}
                placeholder="e.g. SMASSE, Personal Emolument"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              />
              <button onClick={confirmAddCategory} className="flex items-center gap-1 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                Add
              </button>
              <button onClick={() => { setAddingCategory(false); setNewCategoryName(""); }} className="text-xs text-gray-400 hover:underline">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline"
            >
              <Plus size={13} /> Add a category not in the list above
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {saved && <p className="text-sm text-eduke-green mt-2">{saved}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Fee Structure
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Saved Fee Structures</p>
        {classesWithStructure.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-8 text-center">
            No fee structures saved yet — select a class above and save one.
          </p>
        ) : (
          <div className="space-y-2">
            {classesWithStructure.map((c) => {
              const forClass = rows.filter((r) => r.class_id === c.id);
              const total = forClass.reduce((s, r) => s + r.amount, 0);
              const expanded = expandedClass === c.id;
              const isDownloading = downloadingId === c.id;
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between p-3 flex-wrap gap-2">
                    <button onClick={() => setExpandedClass(expanded ? null : c.id)} className="flex items-center gap-2 text-left flex-1">
                      <span className="text-sm font-medium text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-400">Total: {formatKES(total)}</span>
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handlePrint(c.id)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-eduke-green hover:underline">
                        <Printer size={13} /> Print
                      </button>
                      <button
                        onClick={() => handleDownload(c.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline disabled:opacity-50"
                      >
                        {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 space-y-1 border-t border-gray-50 pt-2">
                      {forClass.map((r, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{r.fee_category}{!r.is_mandatory ? " (optional)" : ""}</span>
                          <span className="font-medium">{formatKES(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}