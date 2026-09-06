import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// Confirms the current logged-in user is a platform admin before letting them into
// /platform-admin. This deliberately does NOT rely on profiles.role (which is scoped to a
// single school and used by ordinary app RLS) — it checks a completely separate, RLS-locked
// table using the service-role client, which only ever runs server-side and is never sent
// to the browser. A normal principal/teacher/bursar login — however privileged within their
// own school — will always be redirected away from this area.
export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!data) redirect("/dashboard");

  return user;
}