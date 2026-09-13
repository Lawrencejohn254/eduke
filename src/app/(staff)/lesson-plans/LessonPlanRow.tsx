"use client";

import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";

export default function LessonPlanRow({
  id,
  topic,
  subject,
  classStream,
  week,
  teacher,
  aiGenerated,
  status,
  submitted,
  content,
  hodComments,
  teacherResponse,
  reviewedBy,
  canReview,
}: {
  id: string;
  topic: string;
  subject: string;
  classStream: string;
  week: number | null;
  teacher: string;
  aiGenerated: boolean;
  status: string;
  submitted: string;
  content: string;
  hodComments: string | null;
  teacherResponse: string | null;
  reviewedBy: string | null;
  canReview: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [responseNote, setResponseNote] = useState("");
  const router = useRouter();

  async function approve() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("staff_id").eq("id", user!.id).single();
    await supabase
      .from("lesson_plans")
      .update({ status: "Approved", reviewed_by: profile?.staff_id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    router.refresh();
  }

  async function returnWithComments() {
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("staff_id").eq("id", user!.id).single();
    await supabase
      .from("lesson_plans")
      .update({
        status: "Returned",
        hod_comments: comment,
        reviewed_by: profile?.staff_id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setBusy(false);
    setComment("");
    router.refresh();
  }

  async function resubmit() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("lesson_plans")
      .update({
        content: editContent,
        teacher_response: responseNote || null,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
        assigned_hod_id: reviewedBy, // send back to whichever HOD returned it
      })
      .eq("id", id);
    setBusy(false);
    if (!error) {
      setResponseNote("");
      router.refresh();
    }
  }

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <td className="p-3 font-medium text-gray-900">{topic}</td>
        <td className="p-3 text-gray-600">{subject}</td>
        <td className="p-3 text-gray-600">{classStream}</td>
        <td className="p-3 text-gray-600">{week ?? "-"}</td>
        {canReview && <td className="p-3 text-gray-600">{teacher}</td>}
        <td className="p-3">{aiGenerated ? <span className="badge badge-blue">AI</span> : "-"}</td>
        <td className="p-3"><StatusBadge status={status} /></td>
        <td className="p-3 text-gray-500 text-xs">{submitted}</td>
        <td className="p-3">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={canReview ? 9 : 8} className="p-4 bg-gray-50">
            {!canReview && status === "Returned" ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                rows={14}
                className="w-full text-xs whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-eduke-green"
              />
            ) : (
              <pre className="text-xs whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-3 max-h-72 overflow-y-auto">
                {content || "No content saved."}
              </pre>
            )}
            {hodComments && (
              <p className="text-sm text-red-600 mt-2"><strong>HOD comments:</strong> {hodComments}</p>
            )}
            {teacherResponse && (
              <p className="text-sm text-blue-600 mt-1"><strong>Your response:</strong> {teacherResponse}</p>
            )}
            {canReview && status === "Submitted" && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comments (required to return)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={approve}
                    disabled={busy}
                    className="flex items-center gap-1.5 bg-eduke-green text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={returnWithComments}
                    disabled={busy || !comment}
                    className="flex items-center gap-1.5 bg-white border border-gray-300 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    <X size={14} /> Return with Comments
                  </button>
                </div>
              </div>
            )}

            {!canReview && status === "Returned" && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="What did you change? (optional note back to your HOD)"
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={resubmit}
                  disabled={busy || !editContent.trim()}
                  className="flex items-center gap-1.5 bg-eduke-green text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                >
                  <Check size={14} /> Fix &amp; Resubmit to HOD
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
