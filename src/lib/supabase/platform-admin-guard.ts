import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

/**
 * Platform-admin permission keys. Keep this list in sync with the
 * `platform_admin_permissions` table (public.platform_admin_permissions).
 */
export type PlatformPermission =
  | "view_schools"
  | "manage_schools"
  | "approve_signups"
  | "manage_users"
  | "view_billing"
  | "manage_billing"
  | "view_audit_logs"
  | "manage_security"
  | "manage_notifications"
  | "manage_feature_flags"
  | "manage_platform_settings"
  | "view_support_tickets"
  | "manage_support_tickets"
  | "use_support_mode";

export interface PlatformAdminContext {
  userId: string;
  email: string | null;
  permissions: PlatformPermission[];
  has: (perm: PlatformPermission) => boolean;
}

/**
 * Builds a request-scoped Supabase client bound to the caller's own auth
 * cookies (NOT the service-role admin client). RLS applies. This is what
 * lets is_platform_admin()/platform_admin_has_permission() run against the
 * *real* authenticated identity (auth.uid()) rather than something the
 * client could ever spoof.
 */
async function createUserContextClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // No-op: this client is only used for read-only auth checks inside
        // Server Components/Actions here, never to set auth cookies.
      },
    },
  });
}

/**
 * Verifies (a) the caller is authenticated, (b) is an active platform admin,
 * and, if `permission` is given, (c) their role grants that permission.
 *
 * Every check is done server-side via SECURITY DEFINER RPCs
 * (is_platform_admin / platform_admin_has_permission) evaluated against
 * auth.uid() from the caller's own session — never a client-supplied role,
 * school id, or URL/query parameter, and never the service-role client.
 *
 * On failure: unauthenticated -> /login. Authenticated but not authorized ->
 * 404 (the platform-admin surface is not acknowledged to exist for a
 * non-admin, rather than exposing a "you're not allowed" page that confirms
 * the route is real).
 */
export async function requirePlatformAdmin(
  permission?: PlatformPermission
): Promise<PlatformAdminContext> {
  const supabase = await createUserContextClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
    "is_platform_admin"
  );

  if (adminCheckError || !isAdmin) {
    // Fail closed on any error from the check itself.
    notFound();
  }

  const { data: permissionRows, error: permError } = await supabase.rpc(
    "platform_admin_permissions_for_current_user"
  );

  if (permError) {
    notFound();
  }

  const permissions = (permissionRows ?? []) as unknown as PlatformPermission[];

  if (permission && !permissions.includes(permission)) {
    notFound();
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    permissions,
    has: (perm: PlatformPermission) => permissions.includes(perm),
  };
}