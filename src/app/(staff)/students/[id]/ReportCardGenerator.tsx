"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, FileText, Printer, Download, Save, Sparkles } from "lucide-react";
import { printHtmlDocument, downloadHtmlAsPdf } from "@/lib/print";
import { buildReportCardHtml, suggestRemark } from "@/lib/reportCard";

type ExamOption = { id: string; name: string };

type ReportCardData = {
  student: { name: string; admissionNumber: string; className: string; streamName: string };
  curriculumType?: "CBC" | "8-4-4";
  exam: { id: string; name: string };
  term: { id: string; label: string };
  subjects: { name: string; marks: number | null; grade: string; comment: string | null }[];
  totalMarks: number;
  meanMarks: number;
  meanGrade: string;
  position: number | null;
  totalStudents: number | null;
  attendanceRate: number | null;
  classTeacherName: string | null;
  remarks: { classTeacherComment: string; principalComment: string };
};

export default function ReportCardGenerator({ studentId, exams }: { studentId: string; exams: ExamOption[] }) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportCardData | null>(null);
  const [classTeacherComment, setClassTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleGenerate() {
    if (!examId) return;
    setLoading(true);
    setError(null);
    setSaved(null);
    const res = await fetch(`/api/report-card?studentId=${studentId}&examId=${examId}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not generate report card.");
      setData(null);
      return;
    }
    setData(json);

    const firstName = json.student.name.split(" ")[0] ?? "the student";
    // Only auto-fill a suggestion if no remark has been saved before — never overwrite existing text.
    setClassTeacherComment(json.remarks.classTeacherComment || suggestRemark(json.meanMarks, firstName));
    setPrincipalComment(json.remarks.principalComment || suggestRemark(json.meanMarks, firstName));
  }

  function applySuggestion(target: "teacher" | "principal") {
    if (!data) return;
    const firstName = data.student.name.split(" ")[0] ?? "the student";
    const suggestion = suggestRemark(data.meanMarks, firstName);
    if (target === "teacher") setClassTeacherComment(suggestion);
    else setPrincipalComment(suggestion);
  }

  async function handleSaveRemarks() {
    if (!data) return;
    setSaving(true);
    setSaved(null);
    const supabase = createClient();
    const { error } = await supabase.from("report_card_remarks").upsert(
      {
        student_id: studentId,
        term_id: data.term.id,
        class_teacher_comment: classTeacherComment || null,
        principal_comment: principalComment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,term_id" }
    );
    setSaving(false);
    setSaved(error ? `Error: ${error.message}` : "Remarks saved.");
  }

  function html() {
    if (!data) return "";
    return buildReportCardHtml({
      studentName: data.student.name,
      admissionNumber: data.student.admissionNumber,
      className: data.student.className,
      streamName: data.student.streamName,
      termLabel: data.term.label,
      examName: data.exam.name,
      subjects: data.subjects,
      totalMarks: data.totalMarks,
      meanMarks: data.meanMarks,
      meanGrade: data.meanGrade,
      curriculumType: data.curriculumType,
      position: data.position,
      totalStudents: data.totalStudents,
      attendanceRate: data.attendanceRate,
      classTeacherName: data.classTeacherName,
      classTeacherComment: classTeacherComment || null,
      principalComment: principalComment || null,
    });
  }

  async function handleDownload() {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadHtmlAsPdf(`report-card-${data.student.name.replace(/\s+/g, "-").toLowerCase()}.pdf`, html());
    } finally {
      setDownloading(false);
    }
  }

  if (exams.length === 0) {
    return <p className="text-sm text-gray-400">No exams recorded for this class in the current term yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Generate Report Card
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="border border-gray-100 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div><p className="text-xs text-gray-500">Mean Marks</p><p className="font-semibold">{data.meanMarks.toFixed(1)}</p></div>
            <div><p className="text-xs text-gray-500">Mean Grade</p><p className="font-semibold">{data.meanGrade}</p></div>
            <div><p className="text-xs text-gray-500">Position</p><p className="font-semibold">{data.position !== null && data.totalStudents !== null ? `${data.position} of ${data.totalStudents}` : "-"}</p></div>
            <div><p className="text-xs text-gray-500">Attendance</p><p className="font-semibold">{data.attendanceRate !== null ? `${data.attendanceRate}%` : "-"}</p></div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Class Teacher&apos;s Remark {data.classTeacherName ? `(${data.classTeacherName})` : ""}</label>
              <button
                type="button"
                onClick={() => applySuggestion("teacher")}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
              >
                <Sparkles size={11} /> Suggest based on performance
              </button>
            </div>
            <textarea
              value={classTeacherComment}
              onChange={(e) => setClassTeacherComment(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Principal&apos;s Remark</label>
              <button
                type="button"
                onClick={() => applySuggestion("principal")}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline"
              >
                <Sparkles size={11} /> Suggest based on performance
              </button>
            </div>
            <textarea
              value={principalComment}
              onChange={(e) => setPrincipalComment(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mt-1"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSaveRemarks}
              disabled={saving}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Remarks
            </button>
            <button
              onClick={() => printHtmlDocument(`Report Card - ${data.student.name}`, html())}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-eduke-green hover:underline"
            >
              <Printer size={13} /> Print
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs font-medium text-eduke-green hover:underline disabled:opacity-50"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
            </button>
            {saved && <span className="text-xs text-gray-500">{saved}</span>}
          </div>
        </div>
      )}
    </div>
  );
}