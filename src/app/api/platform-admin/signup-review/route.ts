import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Verify the CALLER is a genuine platform admin, using their own real session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: isAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!isAdmin) return NextResponse.json({ error: "Not a platform admin" }, { status: 403 });

  const { requestId, action, rejectionReason } = await req.json();
  if (!requestId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "requestId and a valid action ('approve' or 'reject') are required" }, { status: 400 });
  }

  const { data: request, error: requestError } = await admin
    .from("school_signup_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return NextResponse.json({ error: "Signup request not found" }, { status: 404 });
  }
  if (request.status !== "pending") {
    return NextResponse.json({ error: `This request has already been ${request.status}.` }, { status: 400 });
  }

  if (action === "reject") {
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("school_signup_requests")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Free up the email for a future retry — this account can no longer do anything useful anyway.
    if (request.auth_user_id) {
      await admin.auth.admin.deleteUser(request.auth_user_id);
    }

    return NextResponse.json({ success: true, status: "rejected" });
  }

  // action === "approve" — create the real school, academic calendar, and principal record.
  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({
      name: request.school_name,
      county: request.county,
      sub_county: request.sub_county,
      phone: request.school_phone,
      email: request.school_email,
      school_type: request.school_type ?? "Private",
      school_level: request.school_level ?? "Secondary",
      curriculum: request.curriculum ?? "CBC",
      is_boarding: request.is_boarding ?? false,
      sms_sender_id: "EduKe",
    })
    .select()
    .single();

  if (schoolError) return NextResponse.json({ error: `Failed to create school: ${schoolError.message}` }, { status: 500 });

  const { data: academicYear, error: yearError } = await admin
    .from("academic_years")
    .insert({ school_id: school.id, year: new Date().getFullYear(), is_current: true })
    .select()
    .single();

  if (yearError) return NextResponse.json({ error: `Failed to create academic year: ${yearError.message}` }, { status: 500 });

  for (const termNumber of ["Term 1", "Term 2", "Term 3"]) {
    await admin.from("terms").insert({
      academic_year_id: academicYear.id,
      term_number: termNumber,
      is_current: termNumber === "Term 1",
    });
  }

  // Profile must be created before staff — staff.profile_id has a foreign key to profiles(id).
  const { error: profileError } = await admin.from("profiles").insert({
    id: request.auth_user_id,
    school_id: school.id,
    role: "principal",
    first_name: request.principal_first_name,
    last_name: request.principal_last_name,
    phone: request.principal_phone,
  });

  if (profileError) return NextResponse.json({ error: `Failed to create principal profile: ${profileError.message}` }, { status: 500 });

  const { data: principalStaff, error: staffError } = await admin
    .from("staff")
    .insert({
      school_id: school.id,
      profile_id: request.auth_user_id,
      first_name: request.principal_first_name,
      last_name: request.principal_last_name,
      phone: request.principal_phone ?? "+254700000000",
      role: "principal",
      department: "Administration",
      date_joined: new Date().toISOString().slice(0, 10),
      status: "Active",
    })
    .select()
    .single();

  if (staffError) return NextResponse.json({ error: `Failed to create staff record: ${staffError.message}` }, { status: 500 });

  await admin.from("profiles").update({ staff_id: principalStaff.id }).eq("id", request.auth_user_id);

  const { error: finalizeError } = await admin
    .from("school_signup_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (finalizeError) return NextResponse.json({ error: finalizeError.message }, { status: 500 });

  return NextResponse.json({ success: true, status: "approved", schoolId: school.id });
}