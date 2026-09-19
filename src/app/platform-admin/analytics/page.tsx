import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";

export const dynamic = "force-dynamic";

interface AnalyticsOverview {
  total_schools: number;
  active_schools: number;
  dau_schools: number;
  wau_schools: number;
  mau_schools: number;
}

interface FeatureUsage {
  feature_key: string;
  schools_using: number | null;
  tracked: boolean;
}

interface GrowthPoint {
  month: string;
  new_schools: number;
  new_students: number;
  new_staff: number;
}

function OverviewCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  await requirePlatformAdmin("view_schools");
  const supabaseAdmin = createAdminClient();

  const [
    { data: overviewRows, error: overviewError },
    { data: featureRows, error: featureError },
    { data: growthRows, error: growthError },
  ] = await Promise.all([
    supabaseAdmin.rpc("platform_analytics_overview"),
    supabaseAdmin.rpc("platform_feature_usage"),
    supabaseAdmin.rpc("platform_growth_series", { months: 6 }),
  ]);

  if (overviewError) console.error("Failed to load analytics overview:", overviewError);
  if (featureError) console.error("Failed to load feature usage:", featureError);
  if (growthError) console.error("Failed to load growth series:", growthError);

  const overview: AnalyticsOverview | null = (overviewRows as AnalyticsOverview[] | null)?.[0] ?? null;
  const features = (featureRows as FeatureUsage[] | null) ?? [];
  const growth = (growthRows as GrowthPoint[] | null) ?? [];
  const activeSchools = overview?.active_schools ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
        <p className="text-sm text-gray-400">Feature adoption and activity across all schools.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <OverviewCard label="Total Schools" value={overview?.total_schools ?? 0} />
        <OverviewCard label="Active Schools" value={overview?.active_schools ?? 0} />
        <OverviewCard label="Daily Active Schools" value={overview?.dau_schools ?? 0} />
        <OverviewCard label="Weekly Active Schools" value={overview?.wau_schools ?? 0} />
        <OverviewCard label="Monthly Active Schools" value={overview?.mau_schools ?? 0} />
      </div>

      {/* Feature adoption */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-base font-semibold text-white">Feature Adoption</h2>
          <p className="text-xs text-gray-400 mt-1">
            Schools using each feature, based on real usage data. Features without a data source yet are marked untracked rather than estimated.
          </p>
        </div>
        <div className="divide-y divide-gray-700/50">
          {features.map((f) => {
            const pct = f.tracked && activeSchools > 0 && f.schools_using !== null
              ? Math.round((f.schools_using / activeSchools) * 100)
              : null;
            return (
              <div key={f.feature_key} className="px-5 py-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-white">{f.feature_key}</span>
                  {f.tracked ? (
                    <span className="text-gray-400 text-xs">
                      {f.schools_using} school{f.schools_using === 1 ? "" : "s"}
                      {pct !== null && ` · ${pct}% of active schools`}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs italic">Not yet tracked</span>
                  )}
                </div>
                {f.tracked && (
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-eduke-gold rounded-full"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Growth */}
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">Growth (last 6 months)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-700">
              <th className="py-2">Month</th>
              <th className="py-2">New Schools</th>
              <th className="py-2">New Students</th>
              <th className="py-2">New Staff</th>
            </tr>
          </thead>
          <tbody>
            {growth.map((g) => (
              <tr key={g.month} className="border-b border-gray-700/50">
                <td className="py-2 text-gray-300">
                  {new Date(g.month).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
                </td>
                <td className="py-2 text-white">{g.new_schools}</td>
                <td className="py-2 text-white">{g.new_students}</td>
                <td className="py-2 text-white">{g.new_staff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}