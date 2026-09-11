import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    | "parent";
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

export async function getProfileOrRedirect(): Promise<Profile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
  .from("profiles")
  .select(`
    *,
    school:schools (
      name,
      student_enrollment_enabled
    )
  `)
  .eq("id", user.id)
  .single();

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
}