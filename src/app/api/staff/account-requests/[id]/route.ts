import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const action = body.action;

    if (
      action !== "approve" &&
      action !== "reject"
    ) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    // Current logged-in user
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Get current user's profile
    const { data: reviewer } = await supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!reviewer) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 403 }
      );
    }

    const allowedRoles = [
      "principal",
      "admin",
      "school_admin",
      "hr",
    ];

    if (
      !allowedRoles.includes(
        reviewer.role?.toLowerCase()
      )
    ) {
      return NextResponse.json(
        { error: "You are not authorized." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // Fetch request
    const { data: registration } = await admin
      .from("staff_registration_requests")
      .select("*")
      .eq("id", id)
      .eq("school_id", reviewer.school_id)
      .maybeSingle();

    if (!registration) {
      return NextResponse.json(
        { error: "Registration request not found." },
        { status: 404 }
      );
    }

    if (registration.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "This request has already been processed.",
        },
        { status: 409 }
      );
    }

    // =====================================================
    // REJECT
    // =====================================================

    if (action === "reject") {

      await admin
        .from("staff_registration_requests")
        .update({
          status: "rejected",
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      await admin
        .from("profiles")
        .update({
          account_status: "rejected",
        })
        .eq(
          "id",
          registration.auth_user_id
        );

      return NextResponse.json({
        success: true,
        message: "Request rejected.",
      });
    }

    // =====================================================
    // APPROVE
    // =====================================================

    // Check whether staff already exists
    const { data: existingStaff } = await admin
      .from("staff")
      .select("id")
      .eq(
        "profile_id",
        registration.auth_user_id
      )
      .maybeSingle();

    if (!existingStaff) {

      const { error: staffError } = await admin
        .from("staff")
        .insert({
          school_id:
            registration.school_id,

          profile_id:
            registration.auth_user_id,

          first_name:
            registration.first_name,

          last_name:
            registration.last_name,

          email:
            registration.email,

          phone:
            registration.phone,

          gender:
            registration.gender,

          staff_number:
            registration.staff_number,

          tsc_number:
            registration.tsc_number,

          role:
            registration.requested_role,

          department:
            registration.department,

          contract_type:
            registration.contract_type,

          date_joined:
            registration.date_joined ??
            new Date()
              .toISOString()
              .slice(0, 10),

          status: "Active",
        });

      if (staffError) {
        console.error(staffError);

        return NextResponse.json(
          {
            error:
              "Unable to create staff record.",
          },
          { status: 500 }
        );
      }
    }

    // Activate profile
    await admin
      .from("profiles")
      .update({
        school_id:
          registration.school_id,

        role:
          registration.requested_role,

        account_status: "active",
      })
      .eq(
        "id",
        registration.auth_user_id
      );

    // Approve request
    await admin
      .from("staff_registration_requests")
      .update({
        status: "approved",

        reviewed_by:
          reviewer.id,

        reviewed_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message:
        "Staff account approved successfully.",
    });

  } catch (error) {
    console.error(
      "Account request processing error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}