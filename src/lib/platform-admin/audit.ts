import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformAdminContext } from "@/lib/supabase/platform-admin-guard";

async function getRequestIp(): Promise<string | null> {
  try {
    const h = await headers();
    // x-forwarded-for can be a comma-separated list; the first entry is the
    // original client. Falls back to x-real-ip for setups that only send that.
    const forwardedFor = h.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    // headers() throws outside a request context (e.g. some background jobs).
    return null;
  }
}

interface LogPlatformActionInput {
  admin: PlatformAdminContext;
  action: string; // e.g. "school.suspend", "signup.approve", "user.disable"
  entityType?: string; // e.g. "school", "signup_request", "profile"
  entityId?: string | null;
  schoolId?: string | null; // null for platform-wide actions
  result?: "success" | "failure";
  details?: Record<string, unknown>;
}

/**
 * Records a platform-admin action in the existing `audit_log` table.
 * Reuses the same table normal school activity already writes to — no
 * separate platform_admin_audit_logs table needed. `school_id` is nullable
 * so platform-wide actions (feature flags, notifications, etc.) still log
 * cleanly.
 *
 * This is called with the service-role admin client because audit_log's
 * existing RLS only grants SELECT to principals for their own school; an
 * INSERT path for platform admins doesn't exist yet and shouldn't be opened
 * up via RLS. Every call site MUST have already passed
 * requirePlatformAdmin() — this helper does not re-check authorization.
 */
export async function logPlatformAction({
  admin,
  action,
  entityType,
  entityId,
  schoolId = null,
  result = "success",
  details = {},
}: LogPlatformActionInput) {
  const supabaseAdmin = createAdminClient();
  const ip_address = await getRequestIp();

  const { error } = await supabaseAdmin.from("audit_log").insert({
    school_id: schoolId,
    actor_id: admin.userId,
    actor_name: admin.email ?? admin.userId,
    actor_role: "platform_admin",
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details: { result, ...details },
    ip_address,
  });

  if (error) {
    // Never let an audit-log failure silently mask itself as success, but
    // also never let it block the admin action that already happened —
    // log server-side for investigation.
    console.error("Failed to write platform admin audit log:", error, {
      action,
      entityType,
      entityId,
    });
  }
}