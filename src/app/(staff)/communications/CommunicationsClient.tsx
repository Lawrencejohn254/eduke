"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";

type ClassOption = { id: string; name: string };
type Template = { id: string; name: string; communication_type: string; body: string; created_at: string };
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
  scheduled_for: string | null;
  created_at: string;
};

const STATIC_VARS: Record<string, string> = {
  meeting_date: "Meeting date",
  meeting_time: "Meeting time",
  venue: "Venue",
};

export default function CommunicationsClient({
  classes, streams, students, history, templates, canManageTemplates,
}: {
  classes: ClassOption[]; streams: StreamOption[]; students: StudentOption[]; history: HistoryItem[];
  templates: Template[]; canManageTemplates: boolean;
}) {
  const [view, setView] = useState<"compose" | "templates">("compose");
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
  const [communicationType, setCommunicationType] = useState("General Announcement");
  const [channels, setChannels] = useState<string[]>(["SMS"]);
  const [audience, setAudience] = useState<{ recipient_count: number; with_phone: number; with_email: number } | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

  const scheduledFor = scheduleDate && scheduleTime ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null;

  const COMMUNICATION_TYPES = [
    "General Announcement",
    "Attendance Alert",
    "Fee Reminder",
    "Academic Notice",
    "Event/Meeting",
    "Emergency Alert",
    "School Closure",
    "Custom Message",
  ];

  function toggleChannel(c: string) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function countSmsSegments(text: string) {
    const len = text.length;
    if (len === 0) return { characters: 0, segments: 0 };
    if (len <= 160) return { characters: len, segments: 1 };
    return { characters: len, segments: Math.ceil(len / 153) };
  }
  const smsInfo = countSmsSegments(message);

  function detectStaticVars(text: string) {
    return Object.keys(STATIC_VARS).filter((k) => text.includes(`{{${k}}}`));
  }

  function applyTemplate(t: Template) {
    setMessage(t.body);
    setCommunicationType(t.communication_type);
    setTemplateId(t.id);
    setTemplateVars({});
    setView("compose");
  }

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
    setTemplateId(null);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = await fetch("/api/communications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType, targetId: targetId || null, subject, message, communicationType, channels, sendMode, scheduledFor,
        templateId, templateVariables: templateVars,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setResult(`Error: ${data.error}`);
      return;
    }
    setResult(
      data.scheduled
        ? `Scheduled for ${new Date(data.scheduledFor).toLocaleString()}.`
        : data.recipientCount === 0
        ? "No guardians found for that audience — nothing was sent."
        : data.queued
        ? `Queued for ${data.recipientCount} guardian(s) — delivery in progress.`
        : `Sent to ${data.recipientCount} guardian(s).`
    );
    setMessage("");
    setSubject("");
    setTemplateId(null);
    setTemplateVars({});
    router.refresh();
  }

  useEffect(() => {
    if (targetType !== "school" && !targetId) {
      setAudience(null);
      return;
    }
    let cancelled = false;
    setLoadingAudience(true);
    const supabase = createClient();
    supabase
      .rpc("preview_communication_audience", { p_target_type: targetType, p_target_id: targetId || null })
      .then(({ data }) => {
        if (cancelled) return;
        setAudience((data && data[0]) || { recipient_count: 0, with_phone: 0, with_email: 0 });
        setLoadingAudience(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetType, targetId]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-100 mb-2">
        <button
          onClick={() => setView("compose")}
          className={`text-sm px-3 py-2 border-b-2 ${view === "compose" ? "border-eduke-green text-gray-900 font-medium" : "border-transparent text-gray-400"}`}
        >
          Compose
        </button>
        <button
          onClick={() => setView("templates")}
          className={`text-sm px-3 py-2 border-b-2 ${view === "templates" ? "border-eduke-green text-gray-900 font-medium" : "border-transparent text-gray-400"}`}
        >
          Templates
        </button>
      </div>

      {view === "templates" && (
        <TemplatesPanel templates={templates} canManage={canManageTemplates} onUse={applyTemplate} />
      )}

      {view === "compose" && (
        <>
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

            <select
              value={communicationType}
              onChange={(e) => setCommunicationType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {COMMUNICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {(targetType === "school" || targetId) && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {loadingAudience || !audience ? (
                  "Calculating recipients…"
                ) : audience.recipient_count === 0 ? (
                  "No guardians found for this audience."
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{targetLabel()}</span> — {audience.recipient_count} guardian{audience.recipient_count === 1 ? "" : "s"}
                    {channels.includes("SMS") && audience.with_phone < audience.recipient_count && (
                      <span className="text-amber-600"> · {audience.recipient_count - audience.with_phone} missing a phone number</span>
                    )}
                    {channels.includes("Email") && audience.with_email < audience.recipient_count && (
                      <span className="text-amber-600"> · {audience.recipient_count - audience.with_email} missing an email</span>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-700">Delivery Channels</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={channels.includes("SMS")} onChange={() => toggleChannel("SMS")} /> SMS
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={channels.includes("In-App")} onChange={() => toggleChannel("In-App")} /> In-App
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-not-allowed" title="Email provider not yet configured">
                  <input type="checkbox" disabled /> Email <span className="text-[10px]">(coming soon)</span>
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-not-allowed" title="Architected for future support">
                  <input type="checkbox" disabled /> Push <span className="text-[10px]">(coming soon)</span>
                </label>
              </div>
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
              onChange={(e) => {
                setMessage(e.target.value);
                setTemplateId(null);
              }}
              rows={4}
              placeholder="Type your announcement, or generate a draft above…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            {detectStaticVars(message).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detectStaticVars(message).map((key) => (
                  <input
                    key={key}
                    value={templateVars[key] || ""}
                    onChange={(e) => setTemplateVars((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={STATIC_VARS[key]}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                ))}
              </div>
            )}

            {channels.includes("SMS") && (
              <p className="text-xs text-gray-400">
                Characters: {smsInfo.characters} · SMS segments: {smsInfo.segments || 1}
                {smsInfo.segments > 1 && <span className="text-amber-600"> — message will be split into {smsInfo.segments} parts</span>}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={sendMode === "now"} onChange={() => setSendMode("now")} /> Send now
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={sendMode === "schedule"} onChange={() => setSendMode("schedule")} /> Schedule
                </label>
              </div>
              {sendMode === "schedule" && (
                <div className="flex gap-2">
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            <button
              onClick={() => setPreviewing(true)}
              disabled={!message || channels.length === 0 || (targetType !== "school" && !targetId) || (sendMode === "schedule" && !scheduledFor)}
              className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
            >
              Review & Send
            </button>

            {previewing && (
              <div className="bg-white rounded-xl border-2 border-eduke-green p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Communication Preview</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="text-gray-400">Type:</span> {communicationType}</p>
                  <p><span className="text-gray-400">Audience:</span> {targetLabel()}</p>
                  <p><span className="text-gray-400">Recipients:</span> {audience?.recipient_count ?? "—"} guardian(s)</p>
                  <p><span className="text-gray-400">Channels:</span> {channels.join(", ")}</p>
                  <p><span className="text-gray-400">Send:</span> {sendMode === "now" ? "Immediately" : scheduledFor ? new Date(scheduledFor).toLocaleString() : "—"}</p>
                  {channels.includes("SMS") && <p><span className="text-gray-400">SMS:</span> {smsInfo.characters} characters · {smsInfo.segments || 1} segment(s)</p>}
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{message}</div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setPreviewing(false)} className="text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-600">Back to Edit</button>
                  <button
                    onClick={async () => { await handleSend(); setPreviewing(false); }}
                    disabled={sending}
                    className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {sendMode === "now" ? "Send Communication" : "Schedule Communication"}
                  </button>
                </div>
              </div>
            )}
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
        </>
      )}
    </div>
  );
}

function TemplatesPanel({ templates, canManage, onUse }: { templates: Template[]; canManage: boolean; onUse: (t: Template) => void }) {
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("Custom Message");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const COMMUNICATION_TYPES = ["General Announcement", "Attendance Alert", "Fee Reminder", "Academic Notice", "Event/Meeting", "Emergency Alert", "School Closure", "Custom Message"];

  function startCreate() {
    setEditing(null);
    setCreating(true);
    setName("");
    setType("Custom Message");
    setBody("");
  }
  function startEdit(t: Template) {
    setEditing(t);
    setCreating(true);
    setName(t.name);
    setType(t.communication_type);
    setBody(t.body);
  }
  async function save() {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    const supabase = createClient();
    if (editing) {
      await supabase.from("communication_templates").update({ name, communication_type: type, body }).eq("id", editing.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("school_id, staff_id").eq("id", user!.id).single();
      await supabase.from("communication_templates").insert({ school_id: profile!.school_id, name, communication_type: type, body, created_by: profile!.staff_id });
    }
    setSaving(false);
    setCreating(false);
    router.refresh();
  }
  async function duplicate(t: Template) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("school_id, staff_id").eq("id", user!.id).single();
    await supabase.from("communication_templates").insert({
      school_id: profile!.school_id, name: `${t.name} (copy)`, communication_type: t.communication_type, body: t.body, created_by: profile!.staff_id,
    });
    router.refresh();
  }
  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("communication_templates").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <button onClick={startCreate} className="text-sm bg-eduke-green text-white px-3 py-2 rounded-lg">+ New Template</button>
      )}
      {creating && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {COMMUNICATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Use {{guardian_name}}, {{student_name}}, {{school_name}}, {{class_name}}, {{stream_name}}, {{meeting_date}}, {{meeting_time}}, {{venue}}" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="text-sm px-3 py-2 rounded-lg border border-gray-300">Cancel</button>
            <button onClick={save} disabled={saving} className="text-sm bg-eduke-green text-white px-3 py-2 rounded-lg disabled:opacity-50">{saving ? "Saving…" : "Save Template"}</button>
          </div>
        </div>
      )}
      {templates.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-10 text-center">No templates yet.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.communication_type}</p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.body}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0 text-xs">
                  <button onClick={() => onUse(t)} className="text-eduke-green underline">Use</button>
                  {canManage && <button onClick={() => startEdit(t)} className="text-gray-500 underline">Edit</button>}
                  {canManage && <button onClick={() => duplicate(t)} className="text-gray-500 underline">Duplicate</button>}
                  {canManage && <button onClick={() => remove(t.id)} className="text-red-500 underline">Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [expanded, setExpanded] = useState(false);
  const [log, setLog] = useState<{ recipient_label: string; destination: string; delivery_status: string }[] | null>(null);
  const [stats, setStats] = useState<{ channel: string; delivery_status: string; recipient_count: number }[] | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [status, setStatus] = useState(item.status);
  const router = useRouter();

  async function toggleExpand() {
    setExpanded((v) => !v);
    if (!log && !expanded) {
      setLoadingLog(true);
      const supabase = createClient();
      const [{ data: logData }, { data: statsData }] = await Promise.all([
        supabase
          .from("communication_recipient_display")
          .select("recipient_label, destination, delivery_status")
          .eq("notification_id", item.id),
        supabase.rpc("communication_delivery_stats", { p_notification_id: item.id }),
      ]);
      setLog(logData ?? []);
      setStats(statsData ?? []);
      setLoadingLog(false);
    }
  }

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setCancelling(true);
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ status: "Cancelled" }).eq("id", item.id);
    setCancelling(false);
    if (!error) {
      setStatus("Cancelled");
      router.refresh();
    }
  }

  const targetLabel = { school: "Whole school", class: "Class", stream: "Stream", student: "Individual student" }[item.target_type] ?? item.target_type;

  const groupedStats = stats
    ? stats.reduce((acc: Record<string, { status: string; count: number }[]>, s) => {
        (acc[s.channel] ||= []).push({ status: s.delivery_status, count: s.recipient_count });
        return acc;
      }, {})
    : {};

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={toggleExpand}>
        <div className="min-w-0">
          {item.subject && <p className="text-sm font-medium text-gray-900">{item.subject}</p>}
          <p className="text-sm text-gray-600 truncate">{item.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {targetLabel} · {item.recipient_count} recipient(s) · {new Date(item.created_at).toLocaleString()}
          </p>
          {status === "Scheduled" && item.scheduled_for && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-2">
              Scheduled for {new Date(item.scheduled_for).toLocaleString()}
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="underline text-red-500 disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {loadingLog ? (
            <p className="text-xs text-gray-400">Loading delivery log…</p>
          ) : (
            <>
              {stats && stats.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(groupedStats).map(([channel, rows]) => (
                    <div key={channel} className="bg-gray-50 rounded-lg p-2">
                      <p className="font-semibold text-gray-700 mb-1">{channel}</p>
                      {rows.map((r) => (
                        <p key={r.status} className="text-gray-500">{r.status}: {r.count}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {!log || log.length === 0 ? (
                <p className="text-xs text-gray-400">No delivery log for this message.</p>
              ) : (
                <div className="space-y-1">
                  {log.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600">{l.recipient_label} · {l.destination}</span>
                      <span className={l.delivery_status === "Sent" || l.delivery_status === "Delivered" ? "text-eduke-green" : "text-red-500"}>{l.delivery_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}