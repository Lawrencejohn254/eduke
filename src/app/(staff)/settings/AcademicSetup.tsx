"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";

type ClassRow = { id: string; name: string };
type StreamRow = { id: string; name: string; capacity: number | null; class_id: string };
type SubjectRow = { id: string; name: string; curriculum_type: string | null; max_marks: number | null; is_examinable: boolean };
type ClassSubjectLink = { class_id: string; subject_id: string };

const LEVELS = ["Primary", "Secondary", "Both"];

export default function AcademicSetup({
  schoolId,
  schoolCurriculum,
  classes,
  streams,
  subjects,
  classSubjects,
}: {
  schoolId: string;
  schoolCurriculum: string | null;
  classes: ClassRow[];
  streams: StreamRow[];
  subjects: SubjectRow[];
  classSubjects: ClassSubjectLink[];
}) {
  const router = useRouter();
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Add Class
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState(LEVELS[1]);
  const [savingClass, setSavingClass] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  async function addClass() {
    if (!newClassName.trim()) return;
    setSavingClass(true);
    setClassError(null);
    const supabase = createClient();
    // curriculum_type is deliberately omitted — the database always sets it
    // to match the school's own curriculum. Every existing school subject
    // is also auto-linked to this class by a database trigger — nothing
    // else to do here.
    const { error } = await supabase.from("classes").insert({
      school_id: schoolId,
      name: newClassName.trim(),
      level: newClassLevel,
    });
    setSavingClass(false);
    if (error) {
      setClassError(error.message);
      return;
    }
    setNewClassName("");
    router.refresh();
  }

  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
        Curriculum: <span className="font-semibold text-gray-700">{schoolCurriculum ?? "Not set"}</span> — every class and
        subject follows the school-wide curriculum set in School Information above. To switch curricula, change it there.
      </p>

      <SchoolSubjectsManager schoolId={schoolId} subjects={subjects} />

      {/* Add class */}
      <div className="border border-gray-100 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Add a Class</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
          <input
            placeholder="e.g. Grade 11"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select value={newClassLevel} onChange={(e) => setNewClassLevel(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
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
        {subjects.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            New classes automatically get all {subjects.length} school subject(s) below.
          </p>
        )}
      </div>

      {/* Existing classes, expandable to manage streams + which subjects apply */}
      <div className="space-y-2">
        {classes.length === 0 ? (
          <p className="text-sm text-gray-400">No classes yet — add one above.</p>
        ) : (
          classes.map((klass) => {
            const classStreams = streams.filter((s) => s.class_id === klass.id);
            const linkedSubjectIds = classSubjects.filter((cs) => cs.class_id === klass.id).map((cs) => cs.subject_id);
            const expanded = expandedClass === klass.id;
            return (
              <div key={klass.id} className="border border-gray-100 rounded-lg">
                <button
                  onClick={() => setExpandedClass(expanded ? null : klass.id)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {klass.name} <span className="text-xs text-gray-400 font-normal">— {classStreams.length} stream(s), {linkedSubjectIds.length} subject(s)</span>
                  </span>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expanded && (
                  <div className="p-3 border-t border-gray-100 space-y-4">
                    <StreamManager classId={klass.id} streams={classStreams} />
                    <ClassSubjectsList
                      schoolId={schoolId}
                      classId={klass.id}
                      linkedSubjectIds={linkedSubjectIds}
                      subjectById={subjectById}
                    />
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

// School-wide subject catalog — add a subject ONCE here and it's
// automatically available to every class (existing and future). This is
// the only place subjects get created.
function SchoolSubjectsManager({ schoolId, subjects }: { schoolId: string; subjects: SubjectRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSubject() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // curriculum_type omitted — forced to the school's curriculum by trigger.
    // A database trigger also auto-links this subject to every existing
    // class at the school, so it's genuinely a one-time add.
    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId,
      name: trimmed,
      max_marks: Number(maxMarks) || 100,
      is_examinable: true,
    });
    setSaving(false);
    if (error) {
      // Most likely a duplicate name (subjects are unique per school) —
      // give a clearer message than the raw constraint violation.
      setError(error.message.includes("duplicate") ? `"${trimmed}" already exists.` : error.message);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-eduke-green/5">
      <p className="text-xs font-semibold text-gray-700 mb-1">School Subjects</p>
      <p className="text-xs text-gray-500 mb-2">
        Add every subject taught anywhere in the school, once. Every class — current and future — automatically offers it.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {subjects.length === 0 ? (
          <span className="text-xs text-gray-400">No subjects yet.</span>
        ) : (
          subjects.map((s) => <span key={s.id} className="badge badge-green">{s.name}</span>)
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input placeholder="e.g. Geography" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <input placeholder="Max marks" type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <button onClick={addSubject} disabled={saving || !name.trim()} className="flex items-center gap-1 bg-eduke-green text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add Subject
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

// Read-only-by-default per-class subject list (auto-populated). A subject
// can be individually excluded from just this one class — e.g. an
// elective that doesn't apply everywhere — without touching the school
// catalog or any other class.
function ClassSubjectsList({
  schoolId, classId, linkedSubjectIds, subjectById,
}: {
  schoolId: string;
  classId: string;
  linkedSubjectIds: string[];
  subjectById: Map<string, SubjectRow>;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeFromClass(subjectId: string) {
    setRemoving(subjectId);
    const supabase = createClient();
    await supabase.from("class_subjects").delete().match({ class_id: classId, subject_id: subjectId });
    setRemoving(null);
    router.refresh();
  }

  async function addBack(subjectId: string) {
    const supabase = createClient();
    await supabase.from("class_subjects").insert({ school_id: schoolId, class_id: classId, subject_id: subjectId });
    router.refresh();
  }

  const linked = linkedSubjectIds.map((id) => subjectById.get(id)).filter((s): s is SubjectRow => !!s);
  const excluded = Array.from(subjectById.values()).filter((s) => !linkedSubjectIds.includes(s.id));

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1.5">Subjects offered by this class</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {linked.length === 0 ? (
          <span className="text-xs text-gray-400">No subjects linked — add one in School Subjects above.</span>
        ) : (
          linked.map((s) => (
            <span key={s.id} className="badge badge-green inline-flex items-center gap-1">
              {s.name}
              <button
                onClick={() => removeFromClass(s.id)}
                disabled={removing === s.id}
                title={`Remove ${s.name} from this class only`}
                className="hover:text-red-600 disabled:opacity-50"
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
      </div>
      {excluded.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-400">Not offered here:</span>
          {excluded.map((s) => (
            <button
              key={s.id}
              onClick={() => addBack(s.id)}
              className="badge badge-grey hover:badge-green"
              title={`Add ${s.name} back to this class`}
            >
              + {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}