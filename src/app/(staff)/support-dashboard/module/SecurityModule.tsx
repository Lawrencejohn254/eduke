"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

type LogEntry = {
  id: string;
  log_type: string;
  description: string;
  location: string | null;
  severity: string | null;
  created_at: string;
};

const LOG_TYPES = ["Gate Entry", "Gate Exit", "Incident", "Patrol Note", "Other"];
const SEVERITIES = ["Low", "Medium", "High"];

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function SecurityModule({ schoolId, profileId, logs }: { schoolId: string; profileId: string; logs: LogEntry[] }) {
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"today" | "all">("today");

  const todayLogs = useMemo(() => logs.filter((l) => isToday(l.created_at)), [logs]);
  const incidentsToday = useMemo(() => todayLogs.filter((l) => l.log_type === "Incident").length, [todayLogs]);
  const shown = tab === "today" ? todayLogs : logs;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
        <StatCard label="Entries Today" value={todayLogs.length} />
        <StatCard label="Incidents Today" value={incidentsToday} tone={incidentsToday > 0 ? "danger" : "default"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 border-b border-gray-200">
          <button onClick={() => setTab("today")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "today" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            Today
          </button>
          <button onClick={() => setTab("all")} className={`px-3 py-2 text-xs font-medium border-b-2 -mb-px ${tab === "all" ? "border-eduke-green text-eduke-green" : "border-transparent text-gray-500"}`}>
            All Recent
          </button>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors">
          <Plus size={15} /> New Log Entry
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">No entries recorded.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((l) => (
            <div key={l.id} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {l.log_type}
                    {l.severity && <span className={`ml-2 text-xs font-medium ${l.severity === "High" ? "text-red-600" : "text-gray-500"}`}>({l.severity})</span>}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{l.description}</p>
                  {l.location && <p className="text-xs text-gray-400 mt-1">Location: {l.location}</p>}
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{new Date(l.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <LogForm schoolId={schoolId} profileId={profileId} onClose={() => setShowForm(false)} />}
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

function LogForm({ schoolId, profileId, onClose }: { schoolId: string; profileId: string; onClose: () => void }) {
  const [logType, setLogType] = useState("Patrol Note");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("Low");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("security_logs").insert({
      school_id: schoolId,
      log_type: logType,
      description,
      location: location || null,
      severity: logType === "Incident" ? severity : null,
      reported_by: profileId,
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
          <h2 className="font-semibold text-gray-900">New Log Entry</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select value={logType} onChange={(e) => setLogType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {LOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <textarea required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          {logType === "Incident" && (
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || !description.trim()} className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50">
            {saving && <Loader2 size={16} className="animate-spin" />} Save Entry
          </button>
        </form>
      </div>
    </div>
  );
}