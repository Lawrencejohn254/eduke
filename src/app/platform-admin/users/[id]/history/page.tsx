import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

export default async function UserLoginHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin("manage_users");
  const { id } = await params;

  const supabaseAdmin = createAdminClient();

  const [{ data: profile }, { data: sessions, error }] = await Promise.all([
    supabaseAdmin.from("profiles").select("first_name, last_name").eq("id", id).single(),
    supabaseAdmin
      .from("login_sessions")
      .select("id, logged_in_at, user_agent, school_id")
      .eq("user_id", id)
      .order("logged_in_at", { ascending: false })
      .limit(50),
  ]);

  if (error) console.error("Failed to load login history:", error);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Login History{profile ? ` — ${profile.first_name} ${profile.last_name}` : ""}
          </h1>
          <p className="text-sm text-gray-400">Most recent 50 sessions.</p>
        </div>
        <Link href="/platform-admin/users" className="text-xs text-eduke-gold hover:underline">
          ← Back to users
        </Link>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {!sessions || sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No recorded logins.</div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {sessions.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-300">
                  {new Date(s.logged_in_at).toLocaleString("en-KE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-[420px]">{s.user_agent ?? "Unknown device"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}