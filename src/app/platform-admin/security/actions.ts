"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

export async function terminateSession(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_security");
  const sessionId = String(formData.get("sessionId") ?? "");
  const userLabel = String(formData.get("userLabel") ?? "");
  if (!sessionId) throw new Error("A session id is required.");

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.rpc("platform_terminate_session", {
    target_session_id: sessionId,
  });

  await logPlatformAction({
    admin,
    action: "security.terminate_session",
    entityType: "session",
    entityId: sessionId,
    result: error || !data ? "failure" : "success",
    details: { user: userLabel, error: error?.message },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/security");
}