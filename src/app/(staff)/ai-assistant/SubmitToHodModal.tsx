"use client";

import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";

type Hod = { id: string; first_name: string; last_name: string; department: string | null };

export default function SubmitToHodModal({
  hods,
  onConfirm,
  onClose,
  submitting,
}: {
  hods: Hod[];
  onConfirm: (hodId: string) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [selectedHodId, setSelectedHodId] = useState(hods[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Submit to HOD</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {hods.length === 0 ? (
          <p className="text-sm text-gray-500">
            No HOD is set up at your school yet — ask your principal to add one before
            submitting for review.
          </p>
        ) : (
          <>
            <label className="text-sm font-medium text-gray-700">Send to</label>
            <select
              value={selectedHodId}
              onChange={(e) => setSelectedHodId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {hods.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.first_name} {h.last_name}
                  {h.department ? ` — ${h.department}` : ""}
                </option>
              ))}
            </select>

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(selectedHodId)}
                disabled={submitting || !selectedHodId}
                className="flex-1 flex items-center justify-center gap-2 bg-eduke-green text-white text-sm font-medium rounded-lg py-2 hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Confirm &amp; Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}