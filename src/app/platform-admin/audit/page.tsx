import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface AuditRow {
  id: string;
  school_id: string | null;
  school_name: string | null;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> & { result?: "success" | "failure" };
  ip_address: string | null;
  created_at: string;
  total_count: number;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePlatformAdmin("view_audit_logs");
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const action = params.action || null;
  const result = params.result || null;
  const dateFrom = params.from ? new Date(params.from).toISOString() : null;
  const dateTo = params.to ? new Date(params.to).toISOString() : null;

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc("platform_audit_log_search", {
    filter_admin_id: null,
    filter_school_id: null,
    filter_action: action,
    filter_result: result,
    date_from: dateFrom,
    date_to: dateTo,
    page_size: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) console.error("Failed to load audit log:", error);

  const rows = (data as AuditRow[] | null) ?? [];
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => v && k !== "page") as [string, string][]
    );
    q.set("page", String(p));
    return `?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Audit Log</h1>
          <p className="text-sm text-gray-400">
            {total} record{total === 1 ? "" : "s"}. Read-only — nothing here can be deleted from the UI.
          </p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 bg-gray-800 rounded-xl p-4" method="get">
        <input
          type="text"
          name="action"
          defaultValue={action ?? ""}
          placeholder="Action (e.g. school.suspend)"
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <select
          name="result"
          defaultValue={result ?? ""}
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="">Any result</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <input
          type="date"
          name="from"
          defaultValue={params.from ?? ""}
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <input
          type="date"
          name="to"
          defaultValue={params.to ?? ""}
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          className="rounded-lg bg-eduke-gold px-4 py-2 text-xs font-semibold text-gray-900 hover:opacity-90"
        >
          Apply
        </button>
        {(action || result || params.from || params.to) && (
          <Link href="/platform-admin/audit" className="text-xs text-gray-400 hover:text-white self-center">
            Clear filters
          </Link>
        )}
      </form>

      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="p-3">When</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">School</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Result</th>
              <th className="p-3">IP</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 align-top">
                <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("en-KE", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3 text-gray-300">{r.actor_name}</td>
                <td className="p-3 text-white font-mono text-xs">{r.action}</td>
                <td className="p-3 text-gray-300">{r.school_name ?? "-"}</td>
                <td className="p-3 text-gray-400 text-xs">
                  {r.entity_type ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}` : "-"}
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      r.details?.result === "failure"
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : "border-green-500/20 bg-green-500/10 text-green-400"
                    }`}
                  >
                    {r.details?.result ?? "success"}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-xs">{r.ip_address ?? "-"}</td>
                <td className="p-3 text-gray-500 text-xs max-w-[240px] truncate" title={JSON.stringify(r.details)}>
                  {JSON.stringify(r.details)}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-gray-400">
                  No audit records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`px-3 py-1.5 rounded-lg border border-gray-700 ${
              page <= 1 ? "pointer-events-none opacity-40" : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            ← Prev
          </Link>
          <span className="text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`px-3 py-1.5 rounded-lg border border-gray-700 ${
              page >= totalPages ? "pointer-events-none opacity-40" : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}