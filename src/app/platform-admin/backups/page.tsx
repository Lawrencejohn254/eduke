import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  await requirePlatformAdmin("manage_platform_settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Backups</h1>
        <p className="text-sm text-gray-400">Monitoring only.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6">
        <p className="text-sm text-white font-medium mb-2">Backup metadata isn&apos;t available from inside this app.</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          Supabase&apos;s backup status (last successful backup, restore points, storage usage) is exposed through
          the Supabase <span className="text-gray-300">Management API</span> / dashboard, not through the
          service-role database client this app uses. Wiring this page up for real would mean either:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-400 mt-3 space-y-1">
          <li>Calling the Supabase Management API from a secure server context using a Management API token (a
              different credential from the service-role key — never expose it to the browser), or</li>
          <li>Having your own backup job write its own status/timestamp into a small table this page can read.</li>
        </ul>
        <p className="text-sm text-gray-400 mt-3">
          Rather than show fabricated &quot;last backup: 2 hours ago&quot; placeholders, this page is left honest and
          empty until one of those is wired up. In the meantime, backup status is visible directly in your{" "}
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-eduke-gold hover:underline"
          >
            Supabase project dashboard
          </a>{" "}
          under Database → Backups.
        </p>
      </div>
    </div>
  );
}