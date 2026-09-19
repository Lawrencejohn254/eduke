import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/Loaders";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-eduke-green/10 text-eduke-green",
  ready: "bg-blue-50 text-blue-700",
  importing: "bg-blue-50 text-blue-700",
  validating: "bg-gray-100 text-gray-600",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function ImportHistoryPage() {
  const profile = await getProfileOrRedirect();
  if (!["principal", "deputy_principal", "super_admin"].includes(profile.role)) redirect("/students");

  const supabase = await createClient();

  const { data: batches, error } = await supabase
    .from("student_import_batches")
    .select(
      "id, file_name, status, total_rows, valid_rows, error_rows, successful_rows, failed_rows, created_at, uploaded_by:profiles(first_name, last_name)"
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/students" className="text-xs text-gray-500 flex items-center gap-1 mb-1 hover:text-gray-700">
            <ArrowLeft size={12} /> Back to Students
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Bulk Import History</h1>
          <p className="text-sm text-gray-500">Every bulk student import attempt for this school.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-semibold">Could not load import history.</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
        </div>
      )}

      {!error && (!batches || batches.length === 0) ? (
        <EmptyState title="No imports yet" description="Bulk-imported student batches will show up here." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Uploaded By</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Successful</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(batches ?? []).map((b) => {
                const uploader = b.uploaded_by as unknown as { first_name: string | null; last_name: string | null } | null;
                const hasErrors = (b.error_rows ?? 0) > 0 || (b.failed_rows ?? 0) > 0;
                return (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate" title={b.file_name}>
                      {b.file_name}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {uploader ? `${uploader.first_name ?? ""} ${uploader.last_name ?? ""}`.trim() || "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{b.total_rows}</td>
                    <td className="px-4 py-3 text-eduke-green font-medium">{b.successful_rows ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className={(b.failed_rows ?? 0) > 0 ? "text-red-600" : "text-gray-400"}>
                        {b.failed_rows ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasErrors && (
                        <a
                          href={`/api/students/bulk-import/${b.id}/error-report`}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-eduke-green"
                        >
                          <Download size={12} /> Errors
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
