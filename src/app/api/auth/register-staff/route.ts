import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      requestedRole,
      department,
      tscNumber,
      contractType,
      schoolId,
    } = body;

    // Normalize email
    const normalizedEmail = email?.trim().toLowerCase();

    // Basic validation
    if (
      !firstName ||
      !lastName ||
      !normalizedEmail ||
      !phone ||
      !password ||
      !schoolId
    ) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Verify school exists
    const { data: school } = await adminSupabase
      .from("schools")
      .select("id, name")
      .eq("id", schoolId)
      .maybeSingle();

    if (!school) {
      return NextResponse.json(
        { error: "School not yet registered on EduKe." },
        { status: 404 }
      );
    }

    // Check duplicate pending request
    const { data: existingRequest } = await adminSupabase
      .from("staff_registration_requests")
      .select("id")
      .eq("school_id", schoolId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending registration request for this school.",
        },
        { status: 409 }
      );
    }

    // PUBLIC CLIENT — this triggers Supabase confirmation email
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Create user and send verification email
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error:
            authError?.message ?? "Unable to create account.",
        },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Create pending profile
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .insert({
        id: userId,
        school_id: schoolId,
        role: requestedRole || "teacher",
        account_status: "pending",
        first_name: firstName,
        last_name: lastName,
        phone,
      });

    if (profileError) {
      console.error("Profile error:", profileError);

      return NextResponse.json(
        {
          error:
            "Account created, but unable to create staff profile.",
        },
        { status: 500 }
      );
    }

    // Create staff registration request
    const { error: requestError } = await adminSupabase
      .from("staff_registration_requests")
      .insert({
        school_id: schoolId,
        auth_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        phone,
        gender,
        requested_role: requestedRole || "teacher",
        department: department || null,
        tsc_number: tscNumber || null,
        contract_type: contractType || null,
        status: "pending",
      });

    if (requestError) {
      console.error("Staff request error:", requestError);

      return NextResponse.json(
        {
          error:
            "Account created, but unable to submit approval request.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Account created. Please check your email and verify your address. Your account will then wait for principal approval.",
    });
  } catch (error) {
    console.error("Staff registration error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}