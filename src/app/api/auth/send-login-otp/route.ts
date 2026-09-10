import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtp, hashOtp, OTP_EXPIRY_MINUTES } from "@/lib/otp";

const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting: a short cooldown prevents rapid-fire re-clicks, and the
// sliding window prevents someone from grinding through many codes (e.g.
// to burn through email-sending quota or brute-force nearby guesses).
// Both are enforced here, server-side — the client's own cooldown timer is
// just UX polish and isn't trusted for anything.
const COOLDOWN_SECONDS = 30;
const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_MINUTES = 15;

export async function POST(req: NextRequest) {
  const { userId, email, firstName } = await req.json();

  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  // =====================================================
  // RATE LIMIT CHECK (before any mutation or email send)
  // =====================================================

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { data: recentOtps, error: recentError } = await supabaseAdmin
    .from("login_otps")
    .select("created_at")
    .eq("user_id", userId)
    .eq("purpose", "login")
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  if (recentError) {
    console.error("OTP rate-limit lookup error:", recentError);
    return NextResponse.json({ error: "Could not process request" }, { status: 500 });
  }

  if (recentOtps && recentOtps.length > 0) {
    const mostRecentMs = new Date(recentOtps[0].created_at).getTime();
    const secondsSinceLast = (Date.now() - mostRecentMs) / 1000;

    if (secondsSinceLast < COOLDOWN_SECONDS) {
      const retryAfterSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLast);
      return NextResponse.json(
        {
          error: "Please wait before requesting another code.",
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    if (recentOtps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestInWindowMs = new Date(
        recentOtps[recentOtps.length - 1].created_at
      ).getTime();
      const windowEndsAtMs = oldestInWindowMs + WINDOW_MINUTES * 60_000;
      const retryAfterSeconds = Math.max(1, Math.ceil((windowEndsAtMs - Date.now()) / 1000));

      return NextResponse.json(
        {
          error: "Too many code requests. Please try again later.",
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }
  }

  // =====================================================
  // GENERATE + SEND
  // =====================================================

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