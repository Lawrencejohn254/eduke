import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

interface CheckResult {
  name: string;
  status: "ok" | "error" | "unmonitored";
  detail: string;
  latencyMs?: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T | null; error: unknown; ms: number }> {
  const start = Date.now();
  try {
    const result = await fn();
    return { result, error: null, ms: Date.now() - start };
  } catch (error) {
    return { result: null, error, ms: Date.now() - start };
  }
}

function StatusPill({ status }: { status: CheckResult["status"] }) {
  const styles = {
    ok: "border-green-500/20 bg-green-500/10 text-green-400",
    error: "border-red-500/20 bg-red-500/10 text-red-400",
    unmonitored: "border-gray-600 bg-gray-700 text-gray-300",
  };
  const label = { ok: "Healthy", error: "Error", unmonitored: "Not monitored here" };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}

export default async function SystemHealthPage() {
  await requirePlatformAdmin("manage_platform_settings");
  const supabaseAdmin = createAdminClient();

  const dbCheck = await timed(async () => {
    const { error } = await supabaseAdmin.from("schools").select("id", { count: "exact", head: true });
    if (error) throw error;
    return true;
  });

  const authCheck = await timed(async () => {
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    return true;
  });

  const storageCheck = await timed(async () => {
    const { error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw error;
    return true;
  });

  const checks: CheckResult[] = [
    {
      name: "Database Connectivity",
      status: dbCheck.error ? "error" : "ok",
      detail: dbCheck.error ? String(dbCheck.error) : `Responded in ${dbCheck.ms}ms`,
      latencyMs: dbCheck.ms,
    },
    {
      name: "Authentication (Supabase Auth)",
      status: authCheck.error ? "error" : "ok",
      detail: authCheck.error ? String(authCheck.error) : `Responded in ${authCheck.ms}ms`,
      latencyMs: authCheck.ms,
    },
    {
      name: "Storage",
      status: storageCheck.error ? "error" : "ok",
      detail: storageCheck.error ? String(storageCheck.error) : `Responded in ${storageCheck.ms}ms`,
      latencyMs: storageCheck.ms,
    },
    {
      name: "Email Service",
      status: "unmonitored",
      detail: "No email-provider health hook exists in this codebase yet.",
    },
    {
      name: "SMS Service",
      status: "unmonitored",
      detail: "No SMS-provider health hook exists in this codebase yet.",
    },
    {
      name: "Payment Integration (Pesapal)",
      status: "unmonitored",
      detail: "No Pesapal status endpoint is wired in — only IPN webhook receipt (api/pesapal/ipn) exists.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Health</h1>
        <p className="text-sm text-gray-400">Live checks against what this app can actually verify.</p>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-700/50">
          {checks.map((c) => (
            <div key={c.name} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.detail}</p>
              </div>
              <StatusPill status={c.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-2">Recent Application Errors</h2>
        <p className="text-sm text-gray-400">
          Not tracked — there&apos;s no error-logging table in the current schema. If you want this populated, the
          cleanest path is a small `application_errors` table your API routes write to on catch, or wiring in an
          external tool (Sentry, etc.) and surfacing its API here.
        </p>
      </div>
    </div>
  );
}