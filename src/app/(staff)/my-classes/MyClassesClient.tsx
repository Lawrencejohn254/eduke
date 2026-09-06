"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";

type ClassOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; class_id: string };
type StreamOption = { id: string; name: string; class_id: string };
type Assignment = { id: string; subjectName: string; className: string; streamName: string; termLabel: string };

export default function MyClassesClient({
  staffId,
  termId,
  termLabel,
  classes,
  subjects,
  streams,
  initialAssignments,
}: {
  staffId: string;
  termId: string;
  termLabel: string;
  classes: ClassOption[];
  subjects: SubjectOption[];
  streams: StreamOption[];
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const subjectsForClass = useMemo(() => subjects.filter((s) => s.class_id === classId), [subjects, classId]);
  const streamsForClass = useMemo(() => streams.filter((s) => s.class_id === classId), [streams, classId]);

  async function handleAssign() {
    if (!classId || !subjectId || !streamId) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("teacher_subjects").insert({
      teacher_id: staffId,
      subject_id: subjectId,
      stream_id: streamId,
      term_id: termId,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
    const { data } = await supabase
      .from("teacher_subjects")
      .select("id, subject:subjects(name), stream:streams(name, class:classes(name)), term:terms(term_number)")
      .eq("teacher_id", staffId)
      .order("id", { ascending: false });
    setAssignments(
      (data ?? []).map((a) => {
        const subject = a.subject as unknown as { name: string } | null;
        const stream = a.stream as unknown as { name: string; class: { name: string } | null } | null;
        const term = a.term as unknown as { term_number: string } | null;
        return {
          id: a.id,
          subjectName: subject?.name ?? "-",
          className: stream?.class?.name ?? "-",
          streamName: stream?.name ?? "-",
          termLabel: term?.term_number ?? "-",
        };
      })
    );
    setSubjectId("");
    setStreamId("");
  }

  async function handleRemove(id: string) {
    const supabase = createClient();
    await supabase.from("teacher_subjects").delete().eq("id", id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Assign Yourself — {termLabel}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Class</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSubjectId("");
                setStreamId("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
            >
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Subject</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
              <option value="">Select subject…</option>
              {subjectsForClass.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Stream</label>
            <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1">
              <option value="">Select stream…</option>
              {streamsForClass.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button
          onClick={handleAssign}
          disabled={saving || !classId || !subjectId || !streamId}
          className="mt-3 flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Assign Myself
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">My Current Assignments</p>
        {assignments.length === 0 ? (
          <p className="text-sm text-gray-400">You haven&apos;t assigned yourself to any classes yet.</p>
        ) : (
          <div className="space-y-1.5">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0">
                <span className="text-gray-700">{a.subjectName} · {a.className} {a.streamName} <span className="text-xs text-gray-400">({a.termLabel})</span></span>
                <button onClick={() => handleRemove(a.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
