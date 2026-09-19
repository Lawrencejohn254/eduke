import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformAdminContext } from "@/lib/supabase/platform-admin-guard";

export interface ActiveSupportSession {
  id: string;
  target_school_id: string;
  target_name: string;
  role_used: string;
  started_at: string;
  expires_at: string;
}

/**
 * Returns the admin's current active support-mode session, or null.
 * A session past its expires_at is treated as ended and closed out here
 * (best-effort) rather than left dangling — support mode should never
 * silently stay "active" past its stated expiry.
 */
export async function getActiveSupportSession(
  admin: PlatformAdminContext
): Promise<ActiveSupportSession | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("impersonation_log")
    .select("id, target_school_id, target_name, role_used, started_at, expires_at")
    .eq("admin_user_id", admin.userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    // Auto-close expired sessions rather than leaving them "active" forever.
    await supabaseAdmin
      .from("impersonation_log")
      .update({ ended_at: data.expires_at })
      .eq("id", data.id);
    return null;
  }

  return data as ActiveSupportSession;
}