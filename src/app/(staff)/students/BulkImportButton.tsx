"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  Download,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import type { ImportBatchPreview, ImportConfirmResult } from "@/lib/bulk-import/types";

type Step = "intro" | "validating" | "preview" | "importing" | "summary";

export default function BulkImportButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportBatchPreview | null>(null);
  const [result, setResult] = useState<ImportConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setStep("intro");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function closeModal() {
    setOpen(false);
    reset();
    router.refresh();
  }

  async function handleValidate() {
    if (!file) return;
    setStep("validating");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/students/bulk-import/validate", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Validation failed.");
        setStep("intro");
        return;
      }
      setPreview(json as ImportBatchPreview);
      setStep("preview");
    } catch {
      setError("Something went wrong reading that file. Please try again.");
      setStep("intro");
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setStep("importing");
    setError(null);

    try {
      const res = await fetch(`/api/students/bulk-import/${preview.batchId}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Import failed.");
        setStep("preview");
        return;
      }
      setResult(json as ImportConfirmResult);
      setStep("summary");
    } catch {
      setError("Something went wrong while importing. Please try again.");
      setStep("preview");
    }
  }

  function downloadErrorReport(batchId: string) {
    window.open(`/api/students/bulk-import/${batchId}/error-report`, "_blank");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-white border border-gray-200 text-sm font-medium px-3 py-2 rounded-lg hover:border-eduke-green transition-colors"
      >
        <UploadCloud size={15} /> Bulk Import Students
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Bulk Import Students</h2>
              <button onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {step === "intro" && (
              <div className="space-y-4">
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Download the template below — it includes a reference sheet with your school&apos;s classes and streams.</li>
                  <li>Fill in one row per student and save the file.</li>
                  <li>Upload it here. You&apos;ll get a full preview with any errors before anything is saved.</li>
                </ol>

                <a
                  href="/api/students/bulk-import/template"
                  className="flex items-center justify-center gap-2 w-full border border-eduke-green text-eduke-green font-medium rounded-lg py-2.5 text-sm hover:bg-eduke-green/5 transition-colors"
                >
                  <Download size={16} /> Download Excel Template
                </a>

                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                  <FileSpreadsheet size={28} className="mx-auto text-gray-400 mb-2" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block mx-auto text-sm"
                  />
                  {file && <p className="text-xs text-gray-500 mt-2">Selected: {file.name}</p>}
                </div>

                <button
                  onClick={handleValidate}
                  disabled={!file}
                  className="w-full flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50"
                >
                  Upload &amp; Preview
                </button>
              </div>
            )}

            {step === "validating" && (
              <div className="py-12 flex flex-col items-center gap-3 text-gray-500 text-sm">
                <Loader2 size={28} className="animate-spin" />
                Validating your file…
              </div>
            )}

            {step === "preview" && preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <SummaryCard label="Total Rows" value={preview.summary.totalRows} />
                  <SummaryCard label="Valid" value={preview.summary.validRows} tone="green" />
                  <SummaryCard label="Errors" value={preview.summary.errorRows} tone="red" />
                </div>

                {preview.summary.errorRows > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {preview.rows
                        .filter((r) => r.errors.length > 0)
                        .map((r) => (
                          <div key={r.rowNumber} className="px-3 py-2 text-xs">
                            <p className="font-semibold text-gray-700">
                              Row {r.rowNumber}
                              {r.raw["First Name"] || r.raw["Last Name"]
                                ? ` — ${r.raw["First Name"]} ${r.raw["Last Name"]}`
                                : ""}
                            </p>
                            {r.errors.map((e, i) => (
                              <p key={i} className="text-red-600 flex items-start gap-1 mt-0.5">
                                <XCircle size={12} className="mt-0.5 shrink-0" /> {e}
                              </p>
                            ))}
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => downloadErrorReport(preview.batchId)}
                      className="w-full text-xs text-gray-600 border-t border-gray-100 py-2 hover:bg-gray-50"
                    >
                      Download error report
                    </button>
                  </div>
                )}

                {preview.summary.warningRows > 0 && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {preview.summary.warningRows} row(s) have possible-duplicate warnings (same name &amp; date of
                    birth as another record). These will still be imported — review them afterwards if unsure.
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    className="flex-1 border border-gray-200 text-gray-700 font-medium rounded-lg py-2.5 text-sm"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={preview.summary.validRows === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50"
                  >
                    Import {preview.summary.validRows} Student{preview.summary.validRows === 1 ? "" : "s"}
                  </button>
                </div>
              </div>
            )}

            {step === "importing" && (
              <div className="py-12 flex flex-col items-center gap-3 text-gray-500 text-sm">
                <Loader2 size={28} className="animate-spin" />
                Importing students…
              </div>
            )}

            {step === "summary" && result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <SummaryCard label="Imported" value={result.successCount} tone="green" />
                  <SummaryCard label="Failed" value={result.failCount} tone={result.failCount > 0 ? "red" : undefined} />
                </div>

                {result.failCount > 0 && (
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                      {result.errors.map((e, i) => (
                        <p key={i} className="px-3 py-2 text-xs text-red-600 flex items-start gap-1.5">
                          <XCircle size={12} className="mt-0.5 shrink-0" />
                          Row {e.rowNumber} ({e.admissionNumber ?? "—"}): {e.message}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={() => downloadErrorReport(result.batchId)}
                      className="w-full text-xs text-gray-600 border-t border-gray-100 py-2 hover:bg-gray-50"
                    >
                      Download error report
                    </button>
                  </div>
                )}

                {result.failCount === 0 && (
                  <p className="text-sm text-eduke-green flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> All students imported successfully.
                  </p>
                )}

                <button
                  onClick={closeModal}
                  className="w-full bg-eduke-green text-white font-medium rounded-lg py-2.5 text-sm"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "red" }) {
  const toneClass = tone === "green" ? "text-eduke-green" : tone === "red" ? "text-red-600" : "text-gray-800";
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
