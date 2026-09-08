import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtp, hashOtp, OTP_EXPIRY_MINUTES } from "@/lib/otp";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { userId, email, firstName } = await req.json();

  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // Mark this session as unverified until OTP succeeds
  await supabaseAdmin
    .from("profiles")
    .update({ otp_verified: false })
    .eq("id", userId);

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000).toISOString();

  const { error: insertError } = await supabaseAdmin.from("login_otps").insert({
    user_id: userId,
    otp_hash: otpHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("OTP insert error:", insertError);
    return NextResponse.json({ error: "Could not create verification code" }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: "EduKe <noreply@edukeschools.com>",
      to: email,
      subject: "Your EduKe login code",
      html: `<p>Hi ${firstName || ""},</p>
             <p>Your verification code is:</p>
             <h2 style="letter-spacing:4px">${otp}</h2>
             <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  } catch (emailError) {
    console.error("Resend send error:", emailError);
    return NextResponse.json({ error: "Could not send verification email" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}