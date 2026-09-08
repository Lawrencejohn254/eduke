import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashOtp, MAX_OTP_ATTEMPTS } from "@/lib/otp";

export async function POST(req: NextRequest) {
  const { userId, otp } = await req.json();

  if (!userId || !otp) {
    return NextResponse.json({ error: "Missing userId or code" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: record } = await supabaseAdmin
    .from("login_otps")
    .select("*")
    .eq("user_id", userId)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!record) {
    return NextResponse.json({ error: "No pending verification. Request a new code." }, { status: 400 });
  }
  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
  }
  if (hashOtp(otp) !== record.otp_hash) {
    await supabaseAdmin
      .from("login_otps")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  await supabaseAdmin.from("login_otps").update({ consumed: true }).eq("id", record.id);
  await supabaseAdmin.from("profiles").update({ otp_verified: true }).eq("id", userId);

  // Determine where this user belongs
  const { data: adminRow } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const redirectTo = adminRow ? "/platform-admin" : "/dashboard";

  return NextResponse.json({ success: true, redirectTo });
}