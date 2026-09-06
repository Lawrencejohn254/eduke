import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    schoolName,
    county,
    subCounty,
    schoolPhone,
    schoolEmail,
    schoolType,
    schoolLevel,
    curriculum,
    isBoarding,
    principalFirstName,
    principalLastName,
    principalEmail,
    principalPhone,
    password,
  } = body;

  if (!schoolName || !principalFirstName || !principalLastName || !principalEmail || !password) {
    return NextResponse.json({ error: "School name, principal name, email, and password are all required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: principalEmail,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: requestError } = await admin.from("school_signup_requests").insert({
    auth_user_id: authUser.user.id,
    school_name: schoolName,
    county: county || null,
    sub_county: subCounty || null,
    school_phone: schoolPhone || null,
    school_email: schoolEmail || null,
    school_type: schoolType || "Private",
    school_level: schoolLevel || "Secondary",
    curriculum: curriculum || "CBC",
    is_boarding: Boolean(isBoarding),
    principal_first_name: principalFirstName,
    principal_last_name: principalLastName,
    principal_email: principalEmail,
    principal_phone: principalPhone || null,
    status: "pending",
  });

  if (requestError) {
    // Clean up the orphaned auth user so this email can be retried cleanly.
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}