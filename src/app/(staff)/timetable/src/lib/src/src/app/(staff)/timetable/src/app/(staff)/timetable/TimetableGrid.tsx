"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Upload, Trash2, Download, Pencil, Check, Loader2 } from "lucide-react";
import { colorOf, DAY_NAMES } from "@/lib/timetable-colors";
import AddSlotModal, { SlotDraft } from "./AddSlotModal";

export type Slot = {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  stream_id: string | null;
};

const SAMPLE_SLOTS: Omit<Slot, "id">[] = [
  { title: "Mathematics", description: "Algebra and Geometry", color: "blue", day_of_week: 1, start_time: "09:00", end_time: "10:00", stream_id: null },
  { title: "Physics", description: "Physics Lab", color: "orange", day_of_week: 2, start_time: "09:00", end_time: "10:00", stream_id: null },
  { title: "Biology", description: "Cell Biology", color: "green", day_of_week: 5, start_time: "09:00", end_time: "10:00", stream_id: null },
  { title: "English", description: "Literature and Grammar", color: "green", day_of_week: 1, start_time: "10:00", end_time: "11:00", stream_id: null },
  { title: "Chemistry", description: "Organic Chemistry", color: "red", day_of_week: 4, start_time: "10:00", end_time: "11:00", stream_id: null },
  { title: "History", description: "World History", color: "purple", day_of_week: 3, start_time: "11:00", end_time: "12:00", stream_id: null },
];

export default function TimetableGrid({
  teacherId,
  schoolId,
  termId,
  streams,
  initialSlots,
  initialTitle,
  readOnly = false,
}: {
  teacherId: string;
  schoolId: string;
  termId: string | null;
  streams: { id: string; name: string; class: { name: string } | null }[];
  initialSlots: Slot[];
  initialTitle: string;
  readOnly?: boolean;
}) {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [title, setTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialTitle);
  const [modal, setModal] = useState<{ draft: SlotDraft; isEdit: boolean } | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const timeRows = useMemo(() => {
    const set = new Set(slots.map((s) => `${s.start_time}|${s.end_time}`));
    return Array.from(set)
      .map((k) => {
        const [start, end] = k.split("|");
        return { start, end };
      })
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [slots]);

  function slotAt(day: number, start: string, end: string) {
    return slots.find((s) => s.day_of_week === day && s.start_time === start && s.end_time === end);
  }

  async function saveTitle() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("timetable_settings").upsert({ teacher_id: teacherId, title: titleDraft });
    setTitle(titleDraft);
    setEditingTitle(false);
    setBusy(false);
  }

  async function handleSaveSlot(draft: SlotDraft) {
    const supabase = createClient();

    if (draft.id) {
      const { error } = await supabase
        .from("timetable_slots")
        .update({
          title: draft.title,
          description: draft.description || null,
          color: draft.color,
          start_time: draft.startTime,
          end_time: draft.endTime,
          stream_id: draft.streamId || null,
        })
        .eq("id", draft.id);
      if (error) throw new Error(error.message);
    } else {
      const rows = draft.days.map((day) => ({
        teacher_id: teacherId,
        school_id: schoolId,
        term_id: termId,
        title: draft.title,
        description: draft.description || null,
        color: draft.color,
        day_of_week: day,
        start_time: draft.startTime,
        end_time: draft.endTime,
        stream_id: draft.streamId || null,
      }));
      const { error } = await supabase.from("timetable_slots").insert(rows);
      if (error) throw new Error(error.message);
    }
    router.refresh();
    const { data } = await supabase
      .from("timetable_slots")
      .select("id, title, description, color, day_of_week, start_time, end_time, stream_id")
      .eq("teacher_id", teacherId);
    setSlots((data ?? []) as Slot[]);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("timetable_slots").delete().eq("id", id);
    setSlots((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  async function handleClearAll() {
    if (!confirm("Remove every slot from your timetable? This can't be undone.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("timetable_slots").delete().eq("teacher_id", teacherId);
    setSlots([]);
    setBusy(false);
    router.refresh();
  }

  async function handleLoadSample() {
    setBusy(true);
    const supabase = createClient();
    const rows = SAMPLE_SLOTS.map((s) => ({ ...s, teacher_id: teacherId, school_id: schoolId, term_id: termId }));
    const { data } = await supabase.from("timetable_slots").insert(rows).select("id, title, description, color, day_of_week, start_time, end_time, stream_id");
    setSlots((prev) => [...prev, ...((data ?? []) as Slot[])]);
    setBusy(false);
    router.refresh();
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(slots, null, 2)], { type: "application/json" });
    triggerDownload(blob, "timetable.json");
  }

  function downloadCSV() {
    const header = "Day,Start,End,Subject,Description";
    const rows = slots.map(
      (s) => `${DAY_NAMES[s.day_of_week - 1]},${s.start_time},${s.end_time},"${s.title}","${s.description ?? ""}"`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    triggerDownload(blob, "timetable.csv");
  }

  async function downloadPNG() {
    if (!gridRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(gridRef.current, { backgroundColor: "#ffffff", scale: 2 });
    canvas.toBlob((blob) => blob && triggerDownload(blob, "timetable.png"));
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openQuickAdd(day: number, start: string, end: string) {
    if (readOnly) return;
    setModal({
      draft: { title: "", description: "", color: "blue", days: [day], startTime: start, endTime: end, streamId: "" },
      isEdit: false,
    });
  }

  function openEdit(slot: Slot) {
    setModal({
      draft: {
        id: slot.id,
        title: slot.title,
        description: slot.description ?? "",
        color: (slot.color as SlotDraft["color"]) ?? "blue",
        days: [slot.day_of_week],
        startTime: slot.start_time.slice(0, 5),
        endTime: slot.end_time.slice(0, 5),
        streamId: slot.stream_id ?? "",
      },
      isEdit: true,
    });
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() =>
              setModal({
                draft: { title: "", description: "", color: "blue", days: [1], startTime: "09:00", endTime: "10:00", streamId: "" },
                isEdit: false,
              })
            }
            className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
          >
            <Plus size={15} /> Add Slot
          </button>
          <button
            onClick={handleLoadSample}
            disabled={busy}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <Upload size={15} /> Load Sample
          </button>
          <button
            onClick={handleClearAll}
            disabled={busy || slots.length === 0}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
          >
            <Trash2 size={15} /> Clear All
          </button>
          <div className="relative">
            <button
              onClick={() => setDownloadOpen((v) => !v)}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Download size={15} /> Download
            </button>
            {downloadOpen && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-20 w-40">
                <button onClick={() => { downloadJSON(); setDownloadOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Download JSON</button>
                <button onClick={() => { downloadCSV(); setDownloadOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Download CSV</button>
                <button onClick={() => { downloadPNG(); setDownloadOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Download PNG</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={gridRef} className="border border-gray-200 rounded-xl p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          {editingTitle ? (
            <>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-base font-semibold border border-gray-300 rounded-lg px-2 py-1"
              />
              <button onClick={saveTitle} disabled={busy} className="text-eduke-green">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {!readOnly && (
                <button onClick={() => { setTitleDraft(title); setEditingTitle(true); }} className="text-gray-400 hover:text-gray-600">
                  <Pencil size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div className="eduke-table-wrap">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-50 border border-gray-100 p-2 text-xs font-semibold text-gray-600 text-left w-24">Time</th>
                {DAY_NAMES.map((d) => (
                  <th key={d} className="bg-gray-50 border border-gray-100 p-2 text-xs font-semibold text-gray-600 min-w-[130px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-gray-400 py-10 border border-gray-100">
                    No slots yet. {!readOnly && 'Click "Add Slot" or "Load Sample" to get started.'}
                  </td>
                </tr>
              ) : (
                timeRows.map((row) => (
                  <tr key={`${row.start}-${row.end}`}>
                    <td className="border border-gray-100 p-2 text-xs font-medium text-gray-600 align-top">
                      {row.start.slice(0, 5)} - {row.end.slice(0, 5)}
                    </td>
                    {DAY_NAMES.map((_, i) => {
                      const day = i + 1;
                      const slot = slotAt(day, row.start, row.end);
                      const c = colorOf(slot?.color);
                      return (
                        <td key={day} className="border border-gray-100 p-1.5 align-top">
                          {slot ? (
                            <div
                              className="rounded-lg p-2 border h-full"
                              style={{ backgroundColor: c.bg, borderColor: c.border }}
                            >
                              <p className="text-xs font-semibold" style={{ color: c.text }}>{slot.title}</p>
                              {slot.description && <p className="text-[11px] mt-0.5" style={{ color: c.text, opacity: 0.8 }}>{slot.description}</p>}
                              {!readOnly && (
                                <div className="flex gap-2 mt-1.5">
                                  <button onClick={() => openEdit(slot)} style={{ color: c.text }}><Pencil size={12} /></button>
                                  <button onClick={() => handleDelete(slot.id)} style={{ color: c.text }}><Trash2 size={12} /></button>
                                </div>
                              )}
                            </div>
                          ) : readOnly ? (
                            <div className="h-full" />
                          ) : (
                            <button
                              onClick={() => openQuickAdd(day, row.start, row.end)}
                              className="w-full h-full min-h-[52px] text-[11px] text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              Click to add
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <AddSlotModal
          initial={modal.draft}
          isEdit={modal.isEdit}
          streams={streams}
          onClose={() => setModal(null)}
          onSave={handleSaveSlot}
        />
      )}
    </div>
  );
}