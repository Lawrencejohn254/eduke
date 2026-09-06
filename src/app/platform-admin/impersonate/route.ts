import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  // Verify the CALLER is a genuine platform admin, using their own real session — never trust
  // the request body for this check.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: isAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!isAdmin) return NextResponse.json({ error: "Not a platform admin" }, { status: 403 });

  const { schoolId } = await req.json();
  if (!schoolId) return NextResponse.json({ error: "schoolId is required" }, { status: 400 });

  const { data: principalProfile } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("school_id", schoolId)
    .eq("role", "principal")
    .maybeSingle();

  if (!principalProfile) return NextResponse.json({ error: "No principal account found for this school" }, { status: 404 });

  const { data: authUser } = await admin.auth.admin.getUserById(principalProfile.id);
  const targetEmail = authUser?.user?.email;
  if (!targetEmail) return NextResponse.json({ error: "Could not resolve the principal's login email" }, { status: 404 });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: linkError?.message ?? "Could not generate an impersonation session" }, { status: 500 });
  }

  // Record this for accountability — impersonation is powerful and must be auditable.
  await admin.from("impersonation_log").insert({
    admin_user_id: user.id,
    admin_email: user.email,
    target_school_id: schoolId,
    target_user_id: principalProfile.id,
    target_name: `${principalProfile.first_name} ${principalProfile.last_name}`,
  });

  return NextResponse.json({
    email: targetEmail,
    tokenHash: linkData.properties.hashed_token,
    principalName: `${principalProfile.first_name} ${principalProfile.last_name}`,
  });
}