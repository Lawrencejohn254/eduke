import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { suspendSchool, reactivateSchool, updateSchoolMetadata } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface SchoolRow {
  id: string;
  name: string;
  county: string | null;
  sub_county: string | null;
  school_type: string;
  school_level: string;
  curriculum: string | null;
  status: "active" | "suspended" | "pending_setup";
  created_at: string;
  suspended_at: string | null;
  suspension_reason: string | null;
  student_count: number;
  staff_count: number;
  parent_count: number;
  last_login_at: string | null;
  total_count: number;
}

const STATUS_BADGE: Record<SchoolRow["status"], string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  pending_setup: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requirePlatformAdmin("view_schools");
  const canManage = admin.has("manage_schools");

  const params = await searchParams;
  const search = params.search?.trim() || null;
  const status = (params.status as SchoolRow["status"] | undefined) || null;
  const county = params.county || null;
  const curriculum = params.curriculum || null;
  const schoolType = params.school_type || null;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.rpc("platform_schools_search", {
    search,
    filter_status: status,
    filter_county: county,
    filter_curriculum: curriculum,
    filter_school_type: schoolType,
    page_size: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) console.error("Failed to search schools:", error);

  const rows = (data as SchoolRow[] | null) ?? [];
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queryWithout = (key: string) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => v && k !== key) as [string, string][]
    );
    return q.toString();
  };

  const pageHref = (p: number) => {
    const q = new URLSearchParams(queryWithout("page"));
    q.set("page", String(p));
    return `?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">School Management</h1>
          <p className="text-sm text-gray-400">
            {total} school{total === 1 ? "" : "s"} match the current filters.
          </p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      {/* Search + filters */}
      <form className="flex flex-wrap gap-3 bg-gray-800 rounded-xl p-4" method="get">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by school name or ID…"
          className="flex-1 min-w-[220px] rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <FilterSelect
          name="status"
          label="All statuses"
          value={status ?? undefined}
          options={["active", "suspended", "pending_setup"]}
        />
        <FilterSelect
          name="school_type"
          label="All types"
          value={schoolType ?? undefined}
          options={["Public", "Private"]}
        />
        <FilterSelect
          name="curriculum"
          label="All curricula"
          value={curriculum ?? undefined}
          options={["CBC", "8-4-4", "IGCSE"]}
        />
        <input
          type="text"
          name="county"
          defaultValue={county ?? ""}
          placeholder="County"
          className="w-32 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          className="rounded-lg bg-eduke-gold px-4 py-2 text-xs font-semibold text-gray-900 hover:opacity-90"
        >
          Apply
        </button>
        {(search || status || county || curriculum || schoolType) && (
          <Link
            href="/platform-admin/schools"
            className="text-xs text-gray-400 hover:text-white self-center"
          >
            Clear filters
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="p-3">School</th>
              <th className="p-3">County</th>
              <th className="p-3">Type / Curriculum</th>
              <th className="p-3">Status</th>
              <th className="p-3">Students</th>
              <th className="p-3">Staff</th>
              <th className="p-3">Parents</th>
              <th className="p-3">Last Login</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 align-top">
                <td className="p-3 font-medium text-white">
                  {s.name}
                  <p className="text-[10px] text-gray-500 font-normal mt-0.5">{s.id}</p>
                </td>
                <td className="p-3 text-gray-300">
                  {s.county ?? "-"}
                  {s.sub_county ? <span className="text-gray-500"> · {s.sub_county}</span> : ""}
                </td>
                <td className="p-3 text-gray-300">
                  {s.school_type}
                  <br />
                  <span className="text-gray-500">{s.curriculum ?? "-"}</span>
                </td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[s.status]}`}
                  >
                    {s.status.replace("_", " ")}
                  </span>
                  {s.status === "suspended" && s.suspension_reason && (
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[160px]">
                      {s.suspension_reason}
                    </p>
                  )}
                </td>
                <td className="p-3 text-gray-300">{s.student_count}</td>
                <td className="p-3 text-gray-300">{s.staff_count}</td>
                <td className="p-3 text-gray-300">{s.parent_count}</td>
                <td className="p-3 text-gray-400 text-xs">
                  {s.last_login_at
                    ? new Date(s.last_login_at).toLocaleDateString("en-KE", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "Never"}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1.5 items-start">
                    <Link
                      href={`/platform-admin/${s.id}`}
                      className="text-xs font-medium text-eduke-gold hover:underline"
                    >
                      View →
                    </Link>

                    {canManage && (
                      <FormDialogButton
                        triggerLabel="Edit"
                        title={`Edit ${s.name}`}
                        action={updateSchoolMetadata}
                        hiddenFields={{ schoolId: s.id }}
                        confirmLabel="Save changes"
                        fields={[
                          { name: "name", label: "School name", defaultValue: s.name, required: true },
                          { name: "county", label: "County", defaultValue: s.county ?? "" },
                          { name: "sub_county", label: "Sub-county", defaultValue: s.sub_county ?? "" },
                        ]}
                      />
                    )}

                    {canManage && s.status !== "suspended" && (
                      <FormDialogButton
                        triggerLabel="Suspend"
                        triggerClassName="text-xs font-medium text-red-400 hover:underline"
                        title={`Suspend ${s.name}?`}
                        description="This blocks the school's access but does not delete any data. Reactivating later restores full access."
                        action={suspendSchool}
                        hiddenFields={{ schoolId: s.id }}
                        confirmLabel="Suspend school"
                        variant="danger"
                        fields={[
                          {
                            name: "reason",
                            label: "Reason (recorded in the audit log)",
                            type: "textarea",
                            required: true,
                            placeholder: "e.g. Non-payment, policy violation, requested by school…",
                          },
                        ]}
                      />
                    )}

                    {canManage && s.status === "suspended" && (
                      <FormDialogButton
                        triggerLabel="Reactivate"
                        triggerClassName="text-xs font-medium text-green-400 hover:underline"
                        title={`Reactivate ${s.name}?`}
                        description="Restores full access for this school."
                        action={reactivateSchool}
                        hiddenFields={{ schoolId: s.id }}
                        confirmLabel="Reactivate school"
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-sm text-gray-400">
                  No schools match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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