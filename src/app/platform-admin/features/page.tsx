import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import FormDialogButton from "@/components/platform-admin/FormDialogButton";
import { togglePlatformFlag, setSchoolOverride, removeSchoolOverride } from "./actions";

export const dynamic = "force-dynamic";

interface FlagRow {
  key: string;
  name: string;
  description: string | null;
  platform_enabled: boolean;
}

interface OverrideRow {
  school_id: string;
  school_name: string;
  enabled: boolean;
}

export default async function FeatureFlagsPage() {
  await requirePlatformAdmin("manage_feature_flags");
  const supabaseAdmin = createAdminClient();

  const [{ data: flags, error: flagsError }, { data: schools, error: schoolsError }] = await Promise.all([
    supabaseAdmin.from("platform_feature_flags").select("key, name, description, platform_enabled").order("name"),
    supabaseAdmin.from("schools").select("id, name").order("name"),
  ]);

  if (flagsError) console.error("Failed to load feature flags:", flagsError);
  if (schoolsError) console.error("Failed to load schools:", schoolsError);

  const flagRows = (flags as FlagRow[] | null) ?? [];
  const schoolOptions = schools ?? [];

  const overridesByFlag: Record<string, OverrideRow[]> = {};
  await Promise.all(
    flagRows.map(async (f) => {
      const { data } = await supabaseAdmin.rpc("platform_feature_flag_overrides_for", { flag: f.key });
      overridesByFlag[f.key] = (data as OverrideRow[] | null) ?? [];
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-sm text-gray-400">
            Platform-wide defaults, with optional per-school overrides. Every change is audited.
          </p>
        </div>
        <Link href="/platform-admin" className="text-xs text-eduke-gold hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      <div className="space-y-4">
        {flagRows.map((f) => {
          const overrides = overridesByFlag[f.key] ?? [];
          const overriddenSchoolIds = new Set(overrides.map((o) => o.school_id));
          const availableSchools = schoolOptions.filter((s) => !overriddenSchoolIds.has(s.id));

          return (
            <div key={f.key} className="bg-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-white font-semibold">{f.name}</p>
                  {f.description && <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>}
                </div>

                <form action={togglePlatformFlag}>
                  <input type="hidden" name="flagKey" value={f.key} />
                  <input type="hidden" name="enabled" value={(!f.platform_enabled).toString()} />
                  <button
                    type="submit"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      f.platform_enabled ? "bg-green-500" : "bg-gray-600"
                    }`}
                    aria-label={`Toggle ${f.name} platform-wide`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        f.platform_enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </form>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Platform:{" "}
                <span className={f.platform_enabled ? "text-green-400" : "text-gray-400"}>
                  {f.platform_enabled ? "ON" : "OFF"}
                </span>
              </p>

              {overrides.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {overrides.map((o) => (
                    <div
                      key={o.school_id}
                      className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-xs"
                    >
                      <span className="text-gray-300">{o.school_name}</span>
                      <span className={o.enabled ? "text-green-400" : "text-red-400"}>
                        {o.enabled ? "ON" : "OFF"}
                      </span>
                      <form action={removeSchoolOverride}>
                        <input type="hidden" name="flagKey" value={f.key} />
                        <input type="hidden" name="schoolId" value={o.school_id} />
                        <button type="submit" className="text-gray-500 hover:text-white" aria-label="Remove override">
                          ×
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              {availableSchools.length > 0 && (
                <div className="mt-3">
                  <FormDialogButton
                    triggerLabel="+ Add school override"
                    triggerClassName="text-xs font-medium text-eduke-gold hover:underline"
                    title={`Override "${f.name}" for a school`}
                    description="Overrides the platform default for one school only."
                    action={setSchoolOverride}
                    hiddenFields={{ flagKey: f.key }}
                    confirmLabel="Save override"
                    fields={[
                      {
                        name: "schoolId",
                        label: "School",
                        type: "select",
                        required: true,
                        placeholder: "Select a school…",
                        options: availableSchools.map((s) => ({ value: s.id, label: s.name })),
                      },
                      {
                        name: "enabled",
                        label: "Set to",
                        type: "select",
                        required: true,
                        defaultValue: "true",
                        options: [
                          { value: "true", label: "ON" },
                          { value: "false", label: "OFF" },
                        ],
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          );
        })}

        {flagRows.length === 0 && (
          <div className="bg-gray-800 rounded-xl p-8 text-center text-sm text-gray-400">
            No feature flags configured yet.
          </div>
        )}
      </div>
    </div>
  );
}