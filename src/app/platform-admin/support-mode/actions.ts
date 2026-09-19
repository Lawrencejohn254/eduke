"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";
import { getActiveSupportSession } from "@/lib/platform-admin/support-mode";

const SESSION_MINUTES = 30;

export async function startSupportSession(formData: FormData) {
  const admin = await requirePlatformAdmin("use_support_mode");
  const schoolId = String(formData.get("schoolId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!schoolId || !role) throw new Error("A school and role are required.");

  const existing = await getActiveSupportSession(admin);
  if (existing) {
    throw new Error("You already have an active support session. End it before starting another.");
  }

  const supabaseAdmin = createAdminClient();
  const { data: school } = await supabaseAdmin.from("schools").select("name").eq("id", schoolId).single();
  if (!school) throw new Error("School not found.");

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SESSION_MINUTES * 60 * 1000);

  const { error } = await supabaseAdmin.from("impersonation_log").insert({
    admin_user_id: admin.userId,
    admin_email: admin.email,
    target_school_id: schoolId,
    target_name: school.name,
    role_used: role,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_read_only: true,
  });

  await logPlatformAction({
    admin,
    action: "support_mode.start",
    entityType: "school",
    entityId: schoolId,
    schoolId,
    result: error ? "failure" : "success",
    details: { school_name: school.name, role_used: role, expires_at: expiresAt.toISOString() },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/support-mode");
}

export async function endSupportSession(formData: FormData) {
  const admin = await requirePlatformAdmin("use_support_mode");
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) throw new Error("Missing session id.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("impersonation_log")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("admin_user_id", admin.userId); // can only end your own session

  await logPlatformAction({
    admin,
    action: "support_mode.end",
    entityType: "support_session",
    entityId: sessionId,
    result: error ? "failure" : "success",
    details: { error: error?.message },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/support-mode");
}