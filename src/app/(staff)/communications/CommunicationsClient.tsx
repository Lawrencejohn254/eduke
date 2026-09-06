"use client";

import { useState } from "react";
import { Loader2, Send, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";

type ClassOption = { id: string; name: string };
type StreamOption = { id: string; name: string; class: { id: string; name: string } | null };
type StudentOption = { id: string; first_name: string; last_name: string; admission_number: string };
type HistoryItem = {
  id: string;
  subject: string | null;
  message: string;
  target_type: string;
  recipient_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
};

export default function CommunicationsClient({
  classes,
  streams,
  students,
  history,
}: {
  classes: ClassOption[];
  streams: StreamOption[];
  students: StudentOption[];
  history: HistoryItem[];
}) {
  const [targetType, setTargetType] = useState<"school" | "class" | "stream" | "student">("school");
  const [targetId, setTargetId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const router = useRouter();

  function targetLabel() {
    if (targetType === "school") return "the whole school";
    if (targetType === "class") return `${classes.find((c) => c.id === targetId)?.name ?? "the class"}`;
    if (targetType === "stream") {
      const s = streams.find((s) => s.id === targetId);
      return s ? `${s.class?.name ?? ""} ${s.name}` : "the stream";
    }
    const s = students.find((s) => s.id === targetId);
    return s ? `${s.first_name} ${s.last_name}'s guardian` : "the student's guardian";
  }

  async function handleDraft() {
    if (!hint.trim()) return;
    setDrafting(true);
    setDraftError(null);
    const res = await fetch("/api/ai/communication-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLabel: targetLabel(), hint }),
    });
    const data = await res.json();
    setDrafting(false);
    if (!res.ok) {
      setDraftError(data.error ?? "Draft generation failed. You can still write it manually.");
      return;
    }
    setMessage(data.draft);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = await fetch("/api/communications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId: targetId || null, subject, message }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setResult(`Error: ${data.error}`);
      return;
    }
    setResult(
      data.recipientCount === 0
        ? "No guardians found for that audience — nothing was sent."
        : data.simulated
        ? `Sent to ${data.recipientCount} guardian(s) — simulated (no AFRICASTALKING_API_KEY configured; check server logs).`
        : `Sent to ${data.recipientCount} guardian(s).`
    );
    setMessage("");
    setSubject("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Compose Announcement</p>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as typeof targetType);
              setTargetId("");
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="school">Whole school</option>
            <option value="class">Specific class</option>
            <option value="stream">Specific stream</option>
            <option value="student">Specific student's guardian</option>
          </select>

          {targetType === "class" && (
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {targetType === "stream" && (
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select stream…</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
            </select>
          )}
          {targetType === "student" && (
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select student…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_number})</option>)}
            </select>
          )}
        </div>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional, for your records)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <div className="rounded-lg p-3 border" style={{ background: "var(--eduke-ai)", borderColor: "var(--eduke-ai-border)" }}>
          <p className="text-xs font-semibold text-indigo-900 mb-1.5 flex items-center gap-1.5"><Sparkles size={13} /> Draft with AI</p>
          <div className="flex gap-2">
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="What's this about? e.g. remind parents about sports day fee"
              className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm"
            />
            <button
              onClick={handleDraft}
              disabled={drafting || !hint.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
            >
              {drafting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Draft
            </button>
          </div>
          {draftError && <p className="text-xs text-red-600 mt-1.5">{draftError}</p>}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your announcement, or generate a draft above…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !message || (targetType !== "school" && !targetId)}
          className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send Announcement
        </button>
        {result && <p className="text-sm text-gray-700">{result}</p>}
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Message History</p>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-10 text-center">No messages sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <HistoryRow key={h.id} item={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<{ phone: string; delivery_status: string }[] | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  async function toggleExpand() {
    setExpanded((v) => !v);
    if (!log && !expanded) {
      setLoadingLog(true);
      const supabase = createClient();
      const { data } = await supabase.from("notification_recipients").select("phone, delivery_status").eq("notification_id", item.id);
      setLog(data ?? []);
      setLoadingLog(false);
    }
  }

  const targetLabel = { school: "Whole school", class: "Class", stream: "Stream", student: "Individual student" }[item.target_type] ?? item.target_type;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={toggleExpand}>
        <div className="min-w-0">
          {item.subject && <p className="text-sm font-medium text-gray-900">{item.subject}</p>}
          <p className="text-sm text-gray-600 truncate">{item.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {targetLabel} · {item.recipient_count} recipient(s) · {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={item.status} />
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {loadingLog ? (
            <p className="text-xs text-gray-400">Loading delivery log…</p>
          ) : !log || log.length === 0 ? (
            <p className="text-xs text-gray-400">No delivery log for this message.</p>
          ) : (
            <div className="space-y-1">
              {log.map((l, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-600">{l.phone}</span>
                  <span className={l.delivery_status === "Sent" ? "text-eduke-green" : "text-red-500"}>{l.delivery_status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
