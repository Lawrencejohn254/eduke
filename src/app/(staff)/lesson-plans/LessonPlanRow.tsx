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
  canReview: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
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
            <pre className="text-xs whitespace-pre-wrap font-mono bg-white rounded-lg border border-gray-200 p-3 max-h-72 overflow-y-auto">
              {content || "No content saved."}
            </pre>
            {hodComments && (
              <p className="text-sm text-red-600 mt-2"><strong>HOD comments:</strong> {hodComments}</p>
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
          </td>
        </tr>
      )}
    </>
  );
}
