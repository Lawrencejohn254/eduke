import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ROLES = [
  "principal",
  "deputy_principal",
  "hod",
  "teacher",
  "bursar",
  "librarian",
  "support_staff",
];

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "suspended",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();

    // Logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get principal profile
    const { data: principalProfile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (
      !principalProfile ||
      !["principal", "deputy_principal"].includes(
        principalProfile.role
      )
    ) {
      return NextResponse.json(
        { error: "You are not authorized to manage staff." },
        { status: 403 }
      );
    }

    // Get target staff profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id, school_id, role, staff_id")
      .eq("id", id)
      .single();

    if (!targetProfile) {
      return NextResponse.json(
        { error: "Staff member not found." },
        { status: 404 }
      );
    }

    // Critical: prevent cross-school edits
    if (
      targetProfile.school_id !==
      principalProfile.school_id
    ) {
      return NextResponse.json(
        { error: "You cannot manage staff from another school." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      role,
      account_status,
      department,
      staff_number,
      tsc_number,
      contract_type,
      date_joined,
    } = body;

    // Validate role
    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Invalid staff role." },
        { status: 400 }
      );
    }

    // Validate status
    if (
      account_status &&
      !ALLOWED_STATUSES.includes(account_status)
    ) {
      return NextResponse.json(
        { error: "Invalid account status." },
        { status: 400 }
      );
    }

    // Update profile
    const profileUpdates: Record<string, unknown> = {};

    if (role) {
      profileUpdates.role = role;
    }

    if (account_status) {
      profileUpdates.account_status = account_status;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", id);

      if (profileError) {
        throw profileError;
      }
    }

    // Update staff employment details
    if (targetProfile.staff_id) {
      const staffUpdates: Record<string, unknown> = {};

      if (department !== undefined)
        staffUpdates.department = department || null;

      if (staff_number !== undefined)
        staffUpdates.staff_number =
          staff_number || null;

      if (tsc_number !== undefined)
        staffUpdates.tsc_number =
          tsc_number || null;

      if (contract_type !== undefined)
        staffUpdates.contract_type =
          contract_type || null;

      if (date_joined !== undefined)
        staffUpdates.date_joined =
          date_joined || null;

      if (Object.keys(staffUpdates).length > 0) {
        const { error: staffError } = await supabase
          .from("staff")
          .update(staffUpdates)
          .eq("id", targetProfile.staff_id);

        if (staffError) {
          throw staffError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Staff information updated successfully.",
    });
  } catch (error) {
    console.error("Staff update error:", error);

    return NextResponse.json(
      { error: "Unable to update staff information." },
      { status: 500 }
    );
  }
}