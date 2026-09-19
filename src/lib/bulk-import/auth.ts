import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_TIER_ROLES = ["principal", "deputy_principal", "super_admin"];

/**
 * Bulk import is a higher-risk, school-wide write compared to the single "Add Student" form
 * (which teachers can also use when enrollment is opened for them) — so it's restricted to
 * the principal/admin tier, matching the feature's stated scope, regardless of the
 * per-school `student_enrollment_enabled` toggle used elsewhere.
 */
export async function requireImportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, school_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) {
    return { error: NextResponse.json({ error: "Profile not found." }, { status: 403 }) } as const;
  }

  if (!ADMIN_TIER_ROLES.includes(profile.role)) {
    return {
      error: NextResponse.json(
        { error: "Only the principal or a school admin can bulk import students." },
        { status: 403 }
      ),
    } as const;
  }

  return { profile, supabase } as const;
}
