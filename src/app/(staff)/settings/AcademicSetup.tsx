"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ChevronDown, ChevronUp } from "lucide-react";

type ClassRow = { id: string; name: string };
type StreamRow = { id: string; name: string; capacity: number | null; class_id: string };
type SubjectRow = { id: string; name: string; class_id: string; curriculum_type: string | null; max_marks: number | null; is_examinable: boolean };

const LEVELS = ["Primary", "Secondary", "Both"];
const CURRICULA = ["CBC", "8-4-4"];

export default function AcademicSetup({
  schoolId,
  classes,
  streams,
  subjects,
}: {
  schoolId: string;
  classes: ClassRow[];
  streams: StreamRow[];
  subjects: SubjectRow[];
}) {
  const router = useRouter();
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Add Class
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState(LEVELS[1]);
  const [newClassCurriculum, setNewClassCurriculum] = useState(CURRICULA[0]);
  const [savingClass, setSavingClass] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  async function addClass() {
    if (!newClassName.trim()) return;
    setSavingClass(true);
    setClassError(null);
    const supabase = createClient();
    const { error } = await supabase.from("classes").insert({
      school_id: schoolId,
      name: newClassName.trim(),
      level: newClassLevel,
      curriculum_type: newClassCurriculum,
    });
    setSavingClass(false);
    if (error) {
      setClassError(error.message);
      return;
    }
    setNewClassName("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Add class */}
      <div className="border border-gray-100 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Add a Class</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
          <input
            placeholder="e.g. Grade 11"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select value={newClassLevel} onChange={(e) => setNewClassLevel(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={newClassCurriculum} onChange={(e) => setNewClassCurriculum(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
            {CURRICULA.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={addClass}
            disabled={savingClass || !newClassName.trim()}
            className="flex items-center justify-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg disabled:opacity-50"
          >
            {savingClass ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </button>
        </div>
        {classError && <p className="text-xs text-red-600 mt-1">{classError}</p>}
      </div>

      {/* Existing classes, expandable to manage streams/subjects */}
      <div className="space-y-2">
        {classes.length === 0 ? (
          <p className="text-sm text-gray-400">No classes yet — add one above.</p>
        ) : (
          classes.map((klass) => {
            const classStreams = streams.filter((s) => s.class_id === klass.id);
            const classSubjects = subjects.filter((s) => s.class_id === klass.id);
            const expanded = expandedClass === klass.id;
            return (
              <div key={klass.id} className="border border-gray-100 rounded-lg">
                <button
                  onClick={() => setExpandedClass(expanded ? null : klass.id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {klass.name} <span className="text-xs text-gray-400 font-normal">— {classStreams.length} stream(s), {classSubjects.length} subject(s)</span>
                  </span>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expanded && (
                  <div className="p-3 border-t border-gray-100 space-y-4">
                    <StreamManager classId={klass.id} streams={classStreams} />
                    <SubjectManager schoolId={schoolId} classId={klass.id} subjects={classSubjects} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StreamManager({ classId, streams }: { classId: string; streams: StreamRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("45");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addStream() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("streams").insert({
      class_id: classId,
      name: name.trim(),
      capacity: Number(capacity) || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">Streams</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {streams.length === 0 ? (
          <span className="text-xs text-gray-400">No streams yet.</span>
        ) : (
          streams.map((s) => (
            <span key={s.id} className="badge badge-blue">{s.name} {s.capacity ? `(${s.capacity})` : ""}</span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input placeholder="e.g. North" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <input placeholder="Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <button onClick={addStream} disabled={saving || !name.trim()} className="flex items-center gap-1 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Stream
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function SubjectManager({ schoolId, classId, subjects }: { schoolId: string; classId: string; subjects: SubjectRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [curriculum, setCurriculum] = useState(CURRICULA[0]);
  const [maxMarks, setMaxMarks] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSubject() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId,
      class_id: classId,
      name: name.trim(),
      curriculum_type: curriculum,
      max_marks: Number(maxMarks) || 100,
      is_examinable: true,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">Subjects</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {subjects.length === 0 ? (
          <span className="text-xs text-gray-400">No subjects yet.</span>
        ) : (
          subjects.map((s) => <span key={s.id} className="badge badge-green">{s.name}</span>)
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input placeholder="e.g. Geography" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          {CURRICULA.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Max marks" type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <button onClick={addSubject} disabled={saving || !name.trim()} className="flex items-center gap-1 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Subject
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
