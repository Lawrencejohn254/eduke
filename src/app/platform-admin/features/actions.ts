"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

export async function togglePlatformFlag(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_feature_flags");
  const flagKey = String(formData.get("flagKey") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!flagKey) throw new Error("Missing flag key.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("platform_feature_flags")
    .update({ platform_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("key", flagKey);

  await logPlatformAction({
    admin,
    action: "feature_flag.toggle_platform",
    entityType: "feature_flag",
    entityId: flagKey,
    result: error ? "failure" : "success",
    details: { flag_key: flagKey, enabled, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/features");
}

export async function setSchoolOverride(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_feature_flags");
  const flagKey = String(formData.get("flagKey") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!flagKey || !schoolId) throw new Error("Missing flag or school.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("platform_feature_flag_overrides")
    .upsert(
      { flag_key: flagKey, school_id: schoolId, enabled, updated_at: new Date().toISOString() },
      { onConflict: "flag_key,school_id" }
    );

  await logPlatformAction({
    admin,
    action: "feature_flag.set_school_override",
    entityType: "feature_flag",
    entityId: flagKey,
    schoolId,
    result: error ? "failure" : "success",
    details: { flag_key: flagKey, school_id: schoolId, enabled, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/features");
}

export async function removeSchoolOverride(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_feature_flags");
  const flagKey = String(formData.get("flagKey") ?? "");
  const schoolId = String(formData.get("schoolId") ?? "");
  if (!flagKey || !schoolId) throw new Error("Missing flag or school.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("platform_feature_flag_overrides")
    .delete()
    .eq("flag_key", flagKey)
    .eq("school_id", schoolId);

  await logPlatformAction({
    admin,
    action: "feature_flag.remove_school_override",
    entityType: "feature_flag",
    entityId: flagKey,
    schoolId,
    result: error ? "failure" : "success",
    details: { flag_key: flagKey, school_id: schoolId, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/features");
}