import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

interface SearchResult {
  result_type: "school" | "staff" | "student" | "parent";
  id: string;
  label: string;
  subtitle: string;
  school_id: string | null;
  school_name: string | null;
}

const TYPE_LABEL: Record<SearchResult["result_type"], string> = {
  school: "School",
  staff: "Staff",
  student: "Student",
  parent: "Parent",
};

function resultHref(r: SearchResult, canViewSchools: boolean, canManageUsers: boolean): string | null {
  if (r.result_type === "school") return canViewSchools ? `/platform-admin/${r.id}` : null;
  if (r.result_type === "staff") return canManageUsers && r.school_id ? `/platform-admin/users?search=${encodeURIComponent(r.label)}` : null;
  if (r.school_id && canViewSchools) return `/platform-admin/${r.school_id}`;
  return null;
}

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requirePlatformAdmin("view_schools");
  const params = await searchParams;
  const query = params.q?.trim() || "";

  const supabaseAdmin = createAdminClient();
  const { data, error } =
    query.length >= 2
      ? await supabaseAdmin.rpc("platform_global_search", { search: query })
      : { data: [], error: null };

  if (error) console.error("Global search failed:", error);

  const results = (data as SearchResult[] | null) ?? [];
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.result_type] ??= []).push(r);
    return acc;
  }, {});

  const canViewSchools = admin.has("view_schools");
  const canManageUsers = admin.has("manage_users");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-sm text-gray-400">Schools, staff, students, and parents — up to 5 results each.</p>
      </div>

      <form method="get" className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name, admission number…"
          autoFocus
          className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white"
        />
        <button type="submit" className="rounded-lg bg-eduke-gold px-5 py-2.5 text-sm font-semibold text-gray-900 hover:opacity-90">
          Search
        </button>
      </form>

      {query && query.length < 2 && (
        <p className="text-sm text-gray-500">Type at least 2 characters.</p>
      )}

      {query.length >= 2 && results.length === 0 && (
        <p className="text-sm text-gray-500">No results for &quot;{query}&quot;.</p>
      )}

      {(Object.keys(TYPE_LABEL) as SearchResult["result_type"][]).map((type) => {
        const items = grouped[type];
        if (!items || items.length === 0) return null;
        return (
          <div key={type} className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-700">
              <p className="text-sm font-semibold text-white">{TYPE_LABEL[type]}s</p>
            </div>
            <div className="divide-y divide-gray-700/50">
              {items.map((r) => {
                const href = resultHref(r, canViewSchools, canManageUsers);
                const content = (
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{r.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.subtitle}
                        {r.school_name && type !== "school" ? ` · ${r.school_name}` : ""}
                      </p>
                    </div>
                  </div>
                );
                return href ? (
                  <Link key={r.id} href={href} className="block hover:bg-gray-700/30">
                    {content}
                  </Link>
                ) : (
                  <div key={r.id}>{content}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}