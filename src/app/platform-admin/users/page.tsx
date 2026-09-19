import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { disableUser, reactivateUser, forceLogoutUser } from "./actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const ROLES = ["super_admin", "principal", "deputy_principal", "hod", "teacher", "bursar", "parent"];

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  school_id: string | null;
  school_name: string | null;
  account_status: string;
  is_banned: boolean;
  created_at: string;
  last_login_at: string | null;
  total_count: number;
}

function StatusBadge({ row }: { row: UserRow }) {
  if (row.is_banned) {
    return (
      <span className="inline-block rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
        disabled
      </span>
    );
  }
  const styles: Record<string, string> = {
    active: "border-green-500/20 bg-green-500/10 text-green-400",
    pending: "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    inactive: "border-gray-600 bg-gray-700 text-gray-300",
    suspended: "border-red-500/20 bg-red-500/10 text-red-400",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        styles[row.account_status] ?? styles.inactive
      }`}
    >
      {row.account_status}
    </span>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requirePlatformAdmin("manage_users");
  const params = await searchParams;

  const search = params.search?.trim() || null;
  const role = params.role || null;
  const status = params.status || null;
  const schoolId = params.school || null;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc("platform_users_search", {
    search,
    filter_role: role,
    filter_school_id: schoolId,
    filter_status: status,
    page_size: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) console.error("Failed to search platform users:", error);

  const rows = (data as UserRow[] | null) ?? [];
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
          <h1 className="text-2xl font-bold text-white">Platform Users</h1>
          <p className="text-sm text-gray-400">
            {total} user{total === 1 ? "" : "s"} match the current filters.
          </p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 bg-gray-800 rounded-xl p-4" method="get">
        <input
          type="text"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Search by name, email, or user ID…"
          className="flex-1 min-w-[220px] rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        />
        <select
          name="role"
          defaultValue={role ?? ""}
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="disabled">Disabled</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-eduke-gold px-4 py-2 text-xs font-semibold text-gray-900 hover:opacity-90"
        >
          Apply
        </button>
        {(search || role || status) && (
          <Link href="/platform-admin/users" className="text-xs text-gray-400 hover:text-white self-center">
            Clear filters
          </Link>
        )}
      </form>

      <div className="bg-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">School</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Last Login</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 align-top">
                <td className="p-3 font-medium text-white">
                  {u.first_name} {u.last_name}
                </td>
                <td className="p-3 text-gray-300">{u.email}</td>
                <td className="p-3 text-gray-300">{u.role.replace("_", " ")}</td>
                <td className="p-3 text-gray-300">
                  {u.school_id ? (
                    <Link href={`/platform-admin/${u.school_id}`} className="text-eduke-gold hover:underline">
                      {u.school_name ?? "View school"}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3">
                  <StatusBadge row={u} />
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="p-3 text-gray-400 text-xs">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                    : "Never"}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1.5 items-start">
                    <Link
                      href={`/platform-admin/users/${u.id}/history`}
                      className="text-xs font-medium text-eduke-gold hover:underline"
                    >
                      Login history
                    </Link>

                    <FormDialogButton
                      triggerLabel="Force logout"
                      triggerClassName="text-xs font-medium text-blue-400 hover:underline"
                      title={`Force logout ${u.first_name}?`}
                      description="Immediately revokes all of this user's active sessions."
                      action={forceLogoutUser}
                      hiddenFields={{ userId: u.id }}
                      confirmLabel="Force logout"
                    />

                    {u.is_banned ? (
                      <FormDialogButton
                        triggerLabel="Reactivate"
                        triggerClassName="text-xs font-medium text-green-400 hover:underline"
                        title={`Reactivate ${u.first_name}'s account?`}
                        action={reactivateUser}
                        hiddenFields={{ userId: u.id }}
                        confirmLabel="Reactivate"
                      />
                    ) : (
                      <FormDialogButton
                        triggerLabel="Disable"
                        triggerClassName="text-xs font-medium text-red-400 hover:underline"
                        title={`Disable ${u.first_name}'s account?`}
                        description="Immediately blocks login. Does not delete any data."
                        variant="danger"
                        action={disableUser}
                        hiddenFields={{ userId: u.id }}
                        confirmLabel="Disable account"
                        fields={[
                          {
                            name: "reason",
                            label: "Reason (recorded in the audit log)",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-gray-400">
                  No users match these filters.
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

      {admin.has("manage_security") && (
        <p className="text-xs text-gray-500">
          Tip: the Security Center (once built) will surface failed logins and suspicious sessions platform-wide.
        </p>
      )}
    </div>
  );
}