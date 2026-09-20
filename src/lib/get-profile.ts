import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

export type Profile = {
  id: string;
  school_id: string;
  role:
    | "super_admin"
    | "principal"
    | "deputy_principal"
    | "hod"
    | "teacher"
    | "bursar"
    | "parent"
    | "librarian"
    | "support_staff";
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  photo_url: string | null;
  staff_id: string | null;
  guardian_id: string | null;

  // Account approval status
  account_status: string | null;

  school?: {
    name: string;
    student_enrollment_enabled: boolean;
  } | null;
};

// Runs with the service-role key — never touches cookies(), so it's safe
// to call inside unstable_cache. Only ever called with the id the *current*
// session resolved via auth.getUser() below, so bypassing RLS here is safe.
async function fetchProfileRow(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(`*, school:schools (name, student_enrollment_enabled)`)
    .eq("id", userId)
    .single();
  return data;
}

const getCachedProfileRow = unstable_cache(fetchProfileRow, ["profile-row"], {
  revalidate: 60,
  tags: ["profiles"],
});

export const getProfileOrRedirect = cache(async (): Promise<Profile> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCachedProfileRow(user.id);

  if (!profile) {
    // Check whether this is a pending school registration
    const { data: signupRequest } = await supabase
      .from("school_signup_requests")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (signupRequest) {
      redirect("/pending-approval");
    }

    // Platform admin
    redirect("/platform-admin");
  }

  // BLOCK STAFF ACCOUNTS UNTIL APPROVED
  if (profile.account_status === "pending") {
    redirect("/pending-approval");
  }

  if (profile.account_status === "rejected") {
    redirect("/pending-approval");
  }

  return profile as Profile;
});