import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Normal authenticated client — used to identify the current user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Use admin client for privileged database operations
    const admin = createAdminClient();

    // Get current user's profile
    const { data: reviewerProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !reviewerProfile) {
      return NextResponse.json(
        { error: "Unable to verify your account." },
        { status: 403 }
      );
    }

    // Only authorized roles can approve staff
    const authorizedRoles = [
      "principal",
      "deputy_principal",
      "admin",
      "school_admin",
    ];

    if (!authorizedRoles.includes(reviewerProfile.role)) {
      return NextResponse.json(
        { error: "You are not authorized to approve staff registrations." },
        { status: 403 }
      );
    }

    // Fetch registration request
    const { data: staffRequest, error: requestError } = await admin
      .from("staff_registration_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !staffRequest) {
      return NextResponse.json(
        { error: "Staff registration request not found." },
        { status: 404 }
      );
    }

    // CRITICAL: Prevent principals approving staff from another school
    if (staffRequest.school_id !== reviewerProfile.school_id) {
      return NextResponse.json(
        { error: "You cannot approve requests for another school." },
        { status: 403 }
      );
    }

    // Prevent processing an already reviewed request
    if (staffRequest.status !== "pending") {
      return NextResponse.json(
        {
          error: `This request has already been ${staffRequest.status}.`,
        },
        { status: 400 }
      );
    }

    /*
      Create the official staff record.
    */
    const { data: staff, error: staffError } = await admin
      .from("staff")
      .insert({
        school_id: staffRequest.school_id,
        staff_number: staffRequest.staff_number || null,
        first_name: staffRequest.first_name,
        last_name: staffRequest.last_name,
        gender: staffRequest.gender,
        phone: staffRequest.phone,
        email: staffRequest.email,
        tsc_number: staffRequest.tsc_number || null,
        role: staffRequest.requested_role,
        department: staffRequest.department || null,
        contract_type: staffRequest.contract_type || null,
        date_joined:
          staffRequest.date_joined ||
          new Date().toISOString().slice(0, 10),
        status: "Active",
      })
      .select("id")
      .single();

    if (staffError || !staff) {
      console.error("Staff creation error:", staffError);

      return NextResponse.json(
        {
          error:
            staffError?.message ||
            "Unable to create staff record.",
        },
        { status: 500 }
      );
    }

    // Activate profile and link staff record
    const { error: activateError } = await admin
      .from("profiles")
      .update({
        staff_id: staff.id,
        school_id: staffRequest.school_id,
        role: staffRequest.requested_role,
        first_name: staffRequest.first_name,
        last_name: staffRequest.last_name,
        phone: staffRequest.phone,
        account_status: "active",
      })
      .eq("id", staffRequest.auth_user_id);

    if (activateError) {
      console.error("Profile activation error:", activateError);

      // Roll back staff creation
      await admin.from("staff").delete().eq("id", staff.id);

      return NextResponse.json(
        {
          error: "Unable to activate staff account.",
        },
        { status: 500 }
      );
    }

    // Mark request as approved
    const { error: updateRequestError } = await admin
      .from("staff_registration_requests")
      .update({
        status: "approved",
        reviewed_by: reviewerProfile.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateRequestError) {
      console.error(
        "Request approval update error:",
        updateRequestError
      );

      // Note: We don't delete the staff/profile here because partial rollback
      // can create worse inconsistencies. Log for investigation instead.
      return NextResponse.json(
        {
          error:
            "Staff was created but approval status could not be finalized.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Staff member approved successfully.",
      staffId: staff.id,
    });
  } catch (error) {
    console.error("Staff approval error:", error);

    return NextResponse.json(
      {
        error: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}