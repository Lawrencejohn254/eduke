"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";

type Exchange = { question: string; answer: string; dataContext?: string; error?: boolean };

export default function AIInsightsClient({ suggestedPrompts }: { suggestedPrompts: string[] }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [showData, setShowData] = useState<number | null>(null);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion("");
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExchanges((prev) => [...prev, { question: q, answer: data.error ?? "Something went wrong.", error: true }]);
      } else {
        setExchanges((prev) => [...prev, { question: q, answer: data.answer, dataContext: data.dataContext }]);
      }
    } catch {
      setExchanges((prev) => [...prev, { question: q, answer: "Something went wrong reaching the AI. Try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {exchanges.length === 0 && suggestedPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {exchanges.map((ex, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end">
              <div className="bg-eduke-green text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-sm max-w-lg">{ex.question}</div>
            </div>
            <div className="flex justify-start">
              <div
                className={`text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-lg whitespace-pre-wrap ${
                  ex.error ? "bg-red-50 text-red-700 border border-red-100" : "bg-white border border-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!ex.error && <Sparkles size={14} className="text-indigo-600 shrink-0 mt-0.5" />}
                  <span>{ex.answer}</span>
                </div>
                {ex.dataContext && (
                  <button
                    onClick={() => setShowData(showData === i ? null : i)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2"
                  >
                    {showData === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />} View underlying data
                  </button>
                )}
                {showData === i && ex.dataContext && (
                  <pre className="text-[11px] font-mono text-gray-500 bg-gray-50 rounded-lg p-2 mt-1.5 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {ex.dataContext}
                  </pre>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 text-gray-400 text-sm px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Thinking through the data…
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 sticky bottom-4">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask a question about your school's data…"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-white shadow-sm"
        />
        <button
          onClick={() => ask(question)}
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
