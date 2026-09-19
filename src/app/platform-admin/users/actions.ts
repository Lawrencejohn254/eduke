"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

// A long ban duration stands in for "disabled" since Supabase Auth models
// this as a ban, not a boolean flag. ~100 years.
const DISABLE_BAN_DURATION = "876000h";

async function getProfile(id: string) {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, school_id, account_status")
    .eq("id", id)
    .single();
  return data;
}

export async function disableUser(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_users");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId || !reason) throw new Error("A user id and reason are required.");

  const profile = await getProfile(userId);
  if (!profile) throw new Error("User not found.");

  const supabaseAdmin = createAdminClient();

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: DISABLE_BAN_DURATION,
  });

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ account_status: "suspended" })
    .eq("id", userId);

  const error = authError || profileError;

  await logPlatformAction({
    admin,
    action: "user.disable",
    entityType: "profile",
    entityId: userId,
    schoolId: profile.school_id,
    result: error ? "failure" : "success",
    details: {
      user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      reason,
      error: error?.message,
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/users");
}

export async function reactivateUser(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_users");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("A user id is required.");

  const profile = await getProfile(userId);
  if (!profile) throw new Error("User not found.");

  const supabaseAdmin = createAdminClient();

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({ account_status: "active" })
    .eq("id", userId);

  const error = authError || profileError;

  await logPlatformAction({
    admin,
    action: "user.reactivate",
    entityType: "profile",
    entityId: userId,
    schoolId: profile.school_id,
    result: error ? "failure" : "success",
    details: {
      user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      error: error?.message,
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/users");
}

export async function forceLogoutUser(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_users");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("A user id is required.");

  const profile = await getProfile(userId);
  if (!profile) throw new Error("User not found.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.signOut(userId, "global");

  await logPlatformAction({
    admin,
    action: "user.force_logout",
    entityType: "profile",
    entityId: userId,
    schoolId: profile.school_id,
    result: error ? "failure" : "success",
    details: {
      user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
      error: error?.message,
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/users");
}