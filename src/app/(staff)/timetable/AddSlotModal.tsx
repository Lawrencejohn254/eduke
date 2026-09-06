"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { TIMETABLE_COLORS, TimetableColorKey, DAY_NAMES } from "@/lib/timetable-colors";

export type SlotDraft = {
  id?: string;
  title: string;
  description: string;
  color: TimetableColorKey;
  days: number[]; // 1=Monday..7=Sunday, multiple only allowed when creating new
  startTime: string; // "HH:MM"
  endTime: string;
  streamId: string;
};

export default function AddSlotModal({
  initial,
  isEdit,
  streams,
  onClose,
  onSave,
}: {
  initial: SlotDraft;
  isEdit: boolean;
  streams: { id: string; name: string; class: { name: string } | null }[];
  onClose: () => void;
  onSave: (draft: SlotDraft) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState<TimetableColorKey>(initial.color);
  const [days, setDays] = useState<number[]>(initial.days);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [streamId, setStreamId] = useState(initial.streamId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    if (isEdit) return; // editing an existing slot stays pinned to its one day
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Subject name is required.");
      return;
    }
    if (days.length === 0) {
      setError("Select at least one day.");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ id: initial.id, title, description, color, days, startTime, endTime, streamId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900">{isEdit ? "Edit Slot" : "Add Slot"}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Subject name *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Algebra and Geometry"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              {isEdit ? "Day" : "Day(s) of the week *"}
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAY_NAMES.map((name, i) => {
                const d = i + 1;
                const active = days.includes(d);
                return (
                  <button
                    type="button"
                    key={d}
                    disabled={isEdit && !active}
                    onClick={() => toggleDay(d)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      active ? "bg-eduke-green text-white border-eduke-green" : "bg-white border-gray-300 text-gray-600"
                    } ${isEdit && !active ? "opacity-30 cursor-not-allowed" : ""}`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Class / Stream (optional — lets that class's parents see this on their portal)</label>
            <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Not linked to a class</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Start time</label>
              <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">End time</label>
              <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Object.keys(TIMETABLE_COLORS) as TimetableColorKey[]).map((key) => {
                const c = TIMETABLE_COLORS[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setColor(key)}
                    title={c.label}
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                    style={{
                      backgroundColor: c.bg,
                      borderColor: color === key ? c.text : c.border,
                      boxShadow: color === key ? `0 0 0 2px ${c.border}` : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />} {isEdit ? "Save Changes" : "Add Slot"}
          </button>
        </form>
      </div>
    </div>
  );
}
