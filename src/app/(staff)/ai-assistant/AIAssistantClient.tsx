"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Sparkles, Loader2, Copy, Download, Save, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { printAsPDF } from "@/lib/print";

type Subject = { id: string; name: string; curriculum_type: string };
type ClassRow = { id: string; name: string; curriculum_type: string };
type StreamRow = { id: string; name: string; class: ClassRow | null };
type Term = { id: string; label: string; termNumber: string } | null;

const TABS = [
  { key: "lesson-plan", label: "Lesson Plan Generator" },
  { key: "scheme", label: "Scheme of Work Generator" },
  { key: "exam-questions", label: "Exam Question Generator" },
] as const;

function AIAssistantInner({
  staffId,
  subjects,
  classes,
  streams,
  currentTerm,
}: {
  staffId: string | null;
  subjects: Subject[];
  classes: ClassRow[];
  streams: StreamRow[];
  currentTerm: Term;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as (typeof TABS)[number]["key"]) || "lesson-plan";
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initialTab);

  function switchTab(key: (typeof TABS)[number]["key"]) {
    setTab(key);
    router.replace(`/ai-assistant?tab=${key}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles size={20} className="text-indigo-600" /> EduKe AI Teaching Assistant
        </h1>
        <p className="text-sm text-gray-500">Aligned to CBC and 8-4-4 Kenyan curriculum frameworks.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "lesson-plan" && (
        <LessonPlanTab staffId={staffId} subjects={subjects} streams={streams} currentTerm={currentTerm} />
      )}
      {tab === "scheme" && <SchemeTab staffId={staffId} subjects={subjects} classes={classes} currentTerm={currentTerm} />}
      {tab === "exam-questions" && <ExamQuestionsTab staffId={staffId} subjects={subjects} classes={classes} currentTerm={currentTerm} />}
    </div>
  );
}

export default function AIAssistantClient(props: {
  staffId: string | null;
  subjects: Subject[];
  classes: ClassRow[];
  streams: StreamRow[];
  currentTerm: Term;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading AI Assistant…</div>}>
      <AIAssistantInner {...props} />
    </Suspense>
  );
}

// ---------------- Shared bits ----------------

function ErrorBanner({ message }: { message: string }) {
  return <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{message}</p>;
}

function OutputActions({
  content,
  setContent,
  onSaveDraft,
  onSubmit,
  pdfTitle,
  saving,
}: {
  content: string;
  setContent: (v: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  pdfTitle: string;
  saving: "draft" | "submit" | null;
}) {
  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={18}
        className="w-full rounded-lg border border-indigo-200 bg-white p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onSaveDraft}
          disabled={saving !== null}
          className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg hover:border-eduke-green transition-colors disabled:opacity-50"
        >
          {saving === "draft" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save as Draft
        </button>
        <button
          onClick={onSubmit}
          disabled={saving !== null}
          className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
        >
          {saving === "submit" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit to HOD
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg hover:border-gray-400 transition-colors"
        >
          <Copy size={15} /> Copy to Clipboard
        </button>
        <button
          onClick={() => printAsPDF(pdfTitle, content)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg hover:border-gray-400 transition-colors"
        >
          <Download size={15} /> Download as PDF
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
const labelCls = "text-sm font-medium text-gray-700";

// ---------------- Tab 1: Lesson Plan ----------------

function LessonPlanTab({
  staffId,
  subjects,
  streams,
  currentTerm,
}: {
  staffId: string | null;
  subjects: Subject[];
  streams: StreamRow[];
  currentTerm: Term;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [streamId, setStreamId] = useState(streams[0]?.id ?? "");
  const [weekNumber, setWeekNumber] = useState(1);
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === subjectId);
  const stream = streams.find((s) => s.id === streamId);
  const curriculumType = stream?.class?.curriculum_type ?? subject?.curriculum_type ?? "CBC";

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/ai/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject?.name,
          klass: stream?.class?.name,
          stream: stream?.name,
          term: currentTerm?.label,
          weekNumber,
          topic,
          subtopic,
          curriculumType,
          additionalContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed. You can still write the lesson plan manually.");
        setContent(null);
      } else {
        setContent(data.content);
      }
    } catch {
      setError("Generation failed. You can still write the lesson plan manually.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(status: "Draft" | "Submitted") {
    if (!content) return;
    if (!staffId) {
      setSaved("Error: your account isn't linked to a staff record yet — ask your principal to link it.");
      return;
    }
    if (!subjectId || !streamId) {
      setSaved("Error: you're not assigned to any subject/stream yet — ask your principal or HOD to assign you one first (Settings or teacher_subjects).");
      return;
    }
    if (!currentTerm) {
      setSaved("Error: no current term is set — ask your principal to set one in Settings.");
      return;
    }
    setSaving(status === "Draft" ? "draft" : "submit");
    const supabase = createClient();
    const { error } = await supabase.from("lesson_plans").insert({
      teacher_id: staffId,
      subject_id: subjectId,
      stream_id: streamId,
      term_id: currentTerm.id,
      week_number: weekNumber,
      topic,
      subtopic,
      content,
      status,
      ai_generated: true,
      submitted_at: status === "Submitted" ? new Date().toISOString() : null,
    });
    setSaving(null);
    setSaved(error ? `Error: ${error.message}` : status === "Draft" ? "Saved as draft." : "Submitted to HOD.");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className={labelCls}>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
            {subjects.length === 0 && <option value="">No subjects assigned</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Class / Stream</label>
          <select value={streamId} onChange={(e) => setStreamId(e.target.value)} className={inputCls}>
            {streams.length === 0 && <option value="">No streams assigned</option>}
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Term</label>
          <input disabled value={currentTerm?.label ?? "No current term"} className={`${inputCls} bg-gray-50 text-gray-500`} />
        </div>
        <div>
          <label className={labelCls}>Week Number (1–13)</label>
          <input type="number" min={1} max={13} value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} required className={inputCls} placeholder="e.g. Addition of whole numbers" />
        </div>
        <div>
          <label className={labelCls}>Subtopic (optional)</label>
          <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Curriculum Type</label>
          <input disabled value={curriculumType} className={`${inputCls} bg-gray-50 text-gray-500`} />
        </div>
        <div>
          <label className={labelCls}>Additional context (optional)</label>
          <textarea value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} rows={2} className={inputCls} placeholder="e.g. students are struggling with this topic" />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !topic || !subjectId || !streamId}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "AI is generating your lesson plan…" : "Generate Lesson Plan"}
        </button>
        {error && <ErrorBanner message={error} />}
      </div>

      <div>
        {content ? (
          <OutputActions
            content={content}
            setContent={(v) => setContent(v)}
            onSaveDraft={() => persist("Draft")}
            onSubmit={() => persist("Submitted")}
            pdfTitle={`Lesson Plan — ${topic}`}
            saving={saving}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-16">
            Generated lesson plan will appear here for review.
          </div>
        )}
        {saved && <p className="text-sm text-eduke-green mt-2 font-medium">{saved}</p>}
      </div>
    </div>
  );
}

// ---------------- Tab 2: Scheme of Work ----------------

function SchemeTab({
  staffId,
  subjects,
  classes,
  currentTerm,
}: {
  staffId: string | null;
  subjects: Subject[];
  classes: ClassRow[];
  currentTerm: Term;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === subjectId);
  const klass = classes.find((c) => c.id === classId);
  const curriculumType = klass?.curriculum_type ?? subject?.curriculum_type ?? "CBC";

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/ai/scheme-of-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject?.name,
          klass: klass?.name,
          term: currentTerm?.termNumber,
          year: currentTerm?.label.split(" ").pop(),
          curriculumType,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed. You can still write it manually.");
        setContent(null);
      } else {
        setContent(data.content);
      }
    } catch {
      setError("Generation failed. You can still write it manually.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(status: "Draft" | "Submitted") {
    if (!content) return;
    if (!staffId) {
      setSaved("Error: your account isn't linked to a staff record yet — ask your principal to link it.");
      return;
    }
    if (!subjectId || !classId) {
      setSaved("Error: you're not assigned to any subject/class yet — ask your principal or HOD to assign you one first.");
      return;
    }
    if (!currentTerm) {
      setSaved("Error: no current term is set — ask your principal to set one in Settings.");
      return;
    }
    setSaving(status === "Draft" ? "draft" : "submit");
    const supabase = createClient();
    const { error } = await supabase.from("schemes_of_work").insert({
      teacher_id: staffId,
      subject_id: subjectId,
      class_id: classId,
      term_id: currentTerm.id,
      title: `${subject?.name} Scheme of Work — ${currentTerm.label}`,
      content,
      status,
      ai_generated: true,
      submitted_at: status === "Submitted" ? new Date().toISOString() : null,
    });
    setSaving(null);
    setSaved(error ? `Error: ${error.message}` : status === "Draft" ? "Saved as draft." : "Submitted to HOD.");
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className={labelCls}>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Term</label>
          <input disabled value={currentTerm?.label ?? "No current term"} className={`${inputCls} bg-gray-50 text-gray-500`} />
        </div>
        <div>
          <label className={labelCls}>Curriculum Type</label>
          <input disabled value={curriculumType} className={`${inputCls} bg-gray-50 text-gray-500`} />
        </div>
        <div>
          <label className={labelCls}>Additional notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !subjectId || !classId}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "AI is generating your scheme of work…" : "Generate Scheme of Work"}
        </button>
        {error && <ErrorBanner message={error} />}
      </div>
      <div>
        {content ? (
          <OutputActions
            content={content}
            setContent={setContent}
            onSaveDraft={() => persist("Draft")}
            onSubmit={() => persist("Submitted")}
            pdfTitle={`Scheme of Work — ${subject?.name ?? ""}`}
            saving={saving}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-16">
            Generated 13-week scheme of work will appear here for review.
          </div>
        )}
        {saved && <p className="text-sm text-eduke-green mt-2 font-medium">{saved}</p>}
      </div>
    </div>
  );
}

// ---------------- Tab 3: Exam Questions ----------------

const QUESTION_TYPES = ["MCQ", "Short Answer", "Structured", "Essay", "True/False"];

function ExamQuestionsTab({
  staffId,
  subjects,
  classes,
  currentTerm,
}: {
  staffId: string | null;
  subjects: Subject[];
  classes: ClassRow[];
  currentTerm: Term;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [types, setTypes] = useState<string[]>(["Structured"]);
  const [difficulty, setDifficulty] = useState("Mixed");
  const [marksPerQuestion, setMarksPerQuestion] = useState<number | undefined>(5);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === subjectId);
  const klass = classes.find((c) => c.id === classId);

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch("/api/ai/exam-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numberOfQuestions,
          subject: subject?.name,
          klass: klass?.name,
          topic,
          types,
          difficulty,
          marksPerQuestion,
          instructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed. You can still write the questions manually.");
        setContent(null);
      } else {
        setContent(data.content);
      }
    } catch {
      setError("Generation failed. You can still write the questions manually.");
    } finally {
      setLoading(false);
    }
  }

  // Parse "QUESTION n (...) ... --- " blocks so the teacher can save selected ones individually.
  function parseQuestions(text: string): string[] {
  if (!text || !text.trim()) return [];

  const questions = text
    .split(/\n\s*---\s*\n/)
    .map((q) => q.trim())
    .filter(Boolean);

  // If the AI didn't use --- separators,
  // show the entire response rather than hiding it.
  return questions.length > 0 ? questions : [text.trim()];
}

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const questionBlocks = content ? parseQuestions(content) : [];

  async function saveSelectedToBank() {
    if (questionBlocks.length === 0) return;
    if (!staffId) {
      setSaved("Error: your account isn't linked to a staff record yet — ask your principal to link it.");
      return;
    }
    if (!subjectId || !classId) {
      setSaved("Error: select a subject and class before saving — otherwise these won't be findable later.");
      return;
    }
    if (!topic.trim()) {
      setSaved("Error: add a topic before saving — otherwise these won't be findable later.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const rows = Array.from(selected).map((i) => ({
      teacher_id: staffId,
      subject_id: subjectId || null,
      class_id: classId || null,
      topic,
      question_text: questionBlocks[i],
      question_type: (types[0] as string) ?? "Structured",
      difficulty: difficulty === "Mixed" ? "Medium" : difficulty,
      marks: marksPerQuestion ?? 1,
      term_id: currentTerm?.id ?? null,
      ai_generated: true,
    }));
    const { error } = await supabase.from("question_bank").insert(rows);
    setSaving(false);
    setSaved(error ? `Error: ${error.message}` : `Saved ${rows.length} question(s) to the Question Bank.`);
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div>
          <label className={labelCls}>Subject</label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputCls}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Number of Questions (1–20)</label>
            <input type="number" min={1} max={20} value={numberOfQuestions} onChange={(e) => setNumberOfQuestions(Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Marks per question</label>
            <input type="number" min={1} value={marksPerQuestion ?? ""} onChange={(e) => setMarksPerQuestion(Number(e.target.value))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Question Types</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`text-xs px-2.5 py-1.5 rounded-full border ${
                  types.includes(t) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-300 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Difficulty Level</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputCls}>
            {["Easy", "Medium", "Hard", "Mixed"].map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Special instructions (optional)</label>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className={inputCls} />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !subjectId || !classId || types.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-medium rounded-lg py-2.5 text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? "AI is generating your questions…" : "Generate Questions"}
        </button>
        {error && <ErrorBanner message={error} />}
      </div>

      <div className="space-y-3">
        {questionBlocks.length > 0 ? (
          <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {questionBlocks.map((q, i) => (
              <label key={i} className="flex items-start gap-2 border-b border-gray-100 pb-3 last:border-0">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(i)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      next.has(i) ? next.delete(i) : next.add(i);
                      return next;
                    })
                  }
                />
                <pre className="text-xs whitespace-pre-wrap font-mono">{q}</pre>
              </label>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={saveSelectedToBank}
                disabled={saving || selected.size === 0}
                className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Selected to Question Bank
              </button>
              <button
                onClick={() => {
                  const selectedText = Array.from(selected).map((i) => questionBlocks[i]).join("\n\n---\n\n");
                  printAsPDF(`Exam Paper — ${subject?.name ?? ""} ${klass?.name ?? ""}`, selectedText || content || "");
                }}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-sm font-medium px-3 py-2 rounded-lg hover:border-gray-400 transition-colors"
              >
                <Download size={15} /> Build Exam Paper from Selected
              </button>
            </div>
            {saved && <p className="text-sm text-eduke-green font-medium">{saved}</p>}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 py-16">
            Generated exam questions will appear here for review and selection.
          </div>
        )}
      </div>
    </div>
  );
}
