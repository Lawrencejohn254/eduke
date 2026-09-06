import Link from "next/link";
import { Sparkles, ClipboardList, NotebookPen, HelpCircle } from "lucide-react";

export default function AIBanner() {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ background: "var(--eduke-ai)", borderColor: "var(--eduke-ai-border)" }}
    >
      <div className="flex items-start gap-3">
        <div className="bg-white/70 rounded-lg p-2 shrink-0">
          <Sparkles size={22} className="text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900">EduKe AI Teaching Assistant</p>
          <p className="text-sm text-indigo-800/80">
            Generate a lesson plan, scheme of work, or exam questions in seconds.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Link
          href="/ai-assistant?tab=lesson-plan"
          className="flex items-center gap-1.5 bg-white text-indigo-700 text-sm font-medium px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <ClipboardList size={15} /> Generate Lesson Plan
        </Link>
        <Link
          href="/ai-assistant?tab=scheme"
          className="flex items-center gap-1.5 bg-white text-indigo-700 text-sm font-medium px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <NotebookPen size={15} /> Generate Scheme of Work
        </Link>
        <Link
          href="/ai-assistant?tab=exam-questions"
          className="flex items-center gap-1.5 bg-white text-indigo-700 text-sm font-medium px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
        >
          <HelpCircle size={15} /> Generate Exam Questions
        </Link>
      </div>
    </div>
  );
}
