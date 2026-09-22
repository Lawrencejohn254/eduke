"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatDateDMY } from "@/lib/format";

type Ticket = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  raised_by: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  raiser: { first_name: string; last_name: string } | null;
  assignee: { first_name: string; last_name: string } | null;
};
type StaffOption = { id: string; first_name: string; last_name: string };

const CATEGORIES = ["Hardware", "Software", "Network", "Printer", "Other"];
const STATUS_TABS = ["Open", "In Progress", "Resolved", "Closed", "All"] as const;

export default function ItSupportClient({
  schoolId,
  profileId,
  isIct,
  tickets,
  ictStaff,
}: {
  schoolId: string;
  profileId: string;
  isIct: boolean;
  tickets: Ticket[];
  ictStaff: StaffOption[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>(isIct ? "Open" : "All");

  const shown = tab === "All" ? tickets : tickets.filter((t) => t.status === tab);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {isIct ? (
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px whitespace-nowrap ${tab === s ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}
              >
                {s} ({s === "All" ? tickets.length : tickets.filter((t) => t.status === s).length})
              </button>
            ))}
          </div>
        ) : (
          <div />
        )}
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> Report an Issue
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No tickets here.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((t) => (
            <TicketCard key={t.id} ticket={t} isIct={isIct} ictStaff={ictStaff} />
          ))}
        </div>
      )}

      {showForm && <ReportForm schoolId={schoolId} profileId={profileId} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function TicketCard({ ticket, isIct, ictStaff }: { ticket: Ticket; isIct: boolean; ictStaff: StaffOption[] }) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function updateStatus(status: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("it_tickets")
      .update({
        status,
        resolved_at: status === "Resolved" || status === "Closed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);
    setSaving(false);
    router.refresh();
  }

  async function assignTo(staffId: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("it_tickets")
      .update({
        assigned_to: staffId || null,
        status: ticket.status === "Open" ? "In Progress" : ticket.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">{ticket.title}</p>
          {ticket.description && <p className="text-xs text-gray-500 mt-1">{ticket.description}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={ticket.status} />
            <span className="text-xs text-gray-400">{ticket.category}</span>
            <span className="text-xs text-gray-400">
              By {ticket.raiser ? `${ticket.raiser.first_name} ${ticket.raiser.last_name}` : "-"} · {formatDateDMY(ticket.created_at)}
            </span>
            {ticket.assignee && (
              <span className="text-xs text-gray-400">
                Assigned: {ticket.assignee.first_name} {ticket.assignee.last_name}
              </span>
            )}
          </div>
        </div>

        {isIct && (
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <select
              defaultValue={ticket.assigned_to ?? ""}
              onChange={(e) => assignTo(e.target.value)}
              disabled={saving}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="">Unassigned</option>
              {ictStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
            {ticket.status !== "Resolved" && ticket.status !== "Closed" && (
              <div className="flex gap-2">
                {ticket.status === "Open" && (
                  <button onClick={() => updateStatus("In Progress")} disabled={saving} className="text-xs font-medium text-eduke-green hover:underline">
                    {saving ? <Loader2 size={12} className="animate-spin inline" /> : "Start"}
                  </button>
                )}
                <button onClick={() => updateStatus("Resolved")} disabled={saving} className="text-xs font-medium text-eduke-green hover:underline">
                  Resolve
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportForm({ schoolId, profileId, onClose }: { schoolId: string; profileId: string; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Hardware");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("it_tickets").insert({
      school_id: schoolId,
      title,
      description: description || null,
      category,
      priority,
      status: "Open",
      raised_by: profileId,
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
          <h2 className="font-semibold text-gray-900">Report an Issue</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Brief title (e.g. Projector not turning on)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <textarea
            placeholder="Describe the issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !title.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Submit Ticket
          </button>
        </form>
      </div>
    </div>
  );
}