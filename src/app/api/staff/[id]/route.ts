import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Free-text HR label on the `staff` table — broader than portal access roles.
const STAFF_ROLES = [
  "teacher",
  "hod",
  "principal",
  "deputy_principal",
  "bursar",
  "librarian",
  "support_staff",
];

// `profiles.role` is a strict Postgres enum (see migrations/0001_init.sql:
// `create type user_role as enum (...)`). Only these values can ever be
// written there — "librarian" / "support_staff" are NOT valid portal
// roles and will make Postgres reject the update if attempted.
const PORTAL_ROLES = [
  "super_admin",
  "principal",
  "deputy_principal",
  "hod",
  "teacher",
  "bursar",
];

const ALLOWED_STATUSES = [
  "Active",
  "Inactive",
  "On Leave",
  "Suspended",
  "Terminated",
];



export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Caller must be a principal/deputy/super_admin of the same school.
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (
      !callerProfile ||
      !["principal", "deputy_principal", "super_admin"].includes(callerProfile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorized to manage staff." },
        { status: 403 }
      );
    }

    // Target staff record (this is the HR record — id used throughout the UI).
    const { data: targetStaff } = await supabase
      .from("staff")
      .select("id, school_id, profile_id")
      .eq("id", staffId)
      .single();

    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    // Prevent cross-school edits.
    if (targetStaff.school_id !== callerProfile.school_id) {
      return NextResponse.json(
        { error: "You cannot manage staff from another school." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      first_name,
      last_name,
      staff_number,
      gender,
      phone,
      email,
      role,
      department,
      tsc_number,
      contract_type,
      date_joined,
      status,
      national_id,
      kra_pin,
      nhif_number,
      nssf_number,
      basic_salary,
    } = body;

    if (role !== undefined && role !== null && !STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid staff role." }, { status: 400 });
    }

    if (status !== undefined && status !== null && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid employment status." }, { status: 400 });
    }

    // 1) Update the HR record on `staff` (broad free-text roles allowed here).
    const staffUpdates: Record<string, unknown> = {};
    if (first_name !== undefined) staffUpdates.first_name = first_name?.trim() || null;
    if (last_name !== undefined) staffUpdates.last_name = last_name?.trim() || null;
    if (staff_number !== undefined) staffUpdates.staff_number = staff_number || null;
    if (gender !== undefined) staffUpdates.gender = gender || null;
    if (phone !== undefined) staffUpdates.phone = phone?.trim() || null;
    if (email !== undefined) staffUpdates.email = email?.trim() || null;
    if (role !== undefined) staffUpdates.role = role || null;
    if (department !== undefined) staffUpdates.department = department || null;
    if (tsc_number !== undefined) staffUpdates.tsc_number = tsc_number || null;
    if (contract_type !== undefined) staffUpdates.contract_type = contract_type || null;
    if (date_joined !== undefined) staffUpdates.date_joined = date_joined || null;
    if (status !== undefined) staffUpdates.status = status || null;
    if (national_id !== undefined) staffUpdates.national_id = national_id || null;
    if (kra_pin !== undefined) staffUpdates.kra_pin = kra_pin || null;
    if (nhif_number !== undefined) staffUpdates.nhif_number = nhif_number || null;
    if (nssf_number !== undefined) staffUpdates.nssf_number = nssf_number || null;
    if (basic_salary !== undefined)
      staffUpdates.basic_salary = basic_salary === "" || basic_salary === null ? null : Number(basic_salary);

    if (Object.keys(staffUpdates).length > 0) {
      const { error: staffError } = await supabase
        .from("staff")
        .update(staffUpdates)
        .eq("id", staffId);

      if (staffError) throw staffError;
    }

    // 2) Sync the PORTAL role on `profiles` — this is what actually
    // determines the nav/dashboard the staff member sees when logged in.
    // Only touch it if:
    //   a) this staff member has a linked profile (i.e. has a login), and
    //   b) the new role is one Postgres' user_role enum actually accepts.
    let portalRoleUpdated = false;
    let portalRoleSkippedReason: string | null = null;

    if (role !== undefined && role !== null) {
      if (!targetStaff.profile_id) {
        portalRoleSkippedReason = "This staff member has no portal login yet, so there's no dashboard to update.";
      } else if (!PORTAL_ROLES.includes(role)) {
        portalRoleSkippedReason = `"${role.replaceAll("_", " ")}" is an HR label only — it isn't a portal role, so this person's login access is unchanged.`;
      } else {
        // IMPORTANT: use the admin client here, not the request-scoped one.
        // The `profiles` table's RLS policy ("profiles self update") only
        // allows a row to update itself (id = auth.uid()) — a principal
        // updating someone ELSE's profile.role would be silently blocked
        // by RLS otherwise (0 rows affected, no thrown error). We've
        // already verified the caller's authorization above, so bypassing
        // RLS here specifically for this write is intentional and safe.
        const adminSupabase = createAdminClient();

        const { data: updatedRows, error: profileError } = await adminSupabase
          .from("profiles")
          .update({ role })
          .eq("id", targetStaff.profile_id)
          .select("id");

        if (profileError) throw profileError;

        if (!updatedRows || updatedRows.length === 0) {
          // Should not happen now that we use the admin client, but guard
          // against it anyway rather than silently reporting success.
          portalRoleSkippedReason =
            "Could not find a matching profile to update — the portal role was not changed.";
        } else {
          portalRoleUpdated = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Staff information updated successfully.",
      portalRoleUpdated,
      portalRoleSkippedReason,
    });
  } catch (error) {
    console.error("Staff update error:", error);
    return NextResponse.json(
      { error: "Unable to update staff information." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: staffId } = await params;

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (
      !callerProfile ||
      !["principal", "deputy_principal", "super_admin"].includes(callerProfile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorized to delete staff." },
        { status: 403 }
      );
    }

    const { data: targetStaff } = await supabase
      .from("staff")
      .select("id, school_id, profile_id, first_name, last_name")
      .eq("id", staffId)
      .single();

    if (!targetStaff) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (targetStaff.school_id !== callerProfile.school_id) {
      return NextResponse.json(
        { error: "You cannot manage staff from another school." },
        { status: 403 }
      );
    }

    // Don't let a principal delete their own staff/login record this way.
    if (targetStaff.profile_id === user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own staff record." },
        { status: 400 }
      );
    }

    // The modal already requires the exact name to be typed client-side,
    // but a destructive, irreversible action shouldn't trust the client
    // alone — re-check it against the real record server-side too.
    const body = await request.json();
    const expectedName = `${targetStaff.first_name} ${targetStaff.last_name}`.trim();

    if ((body.confirmName ?? "").trim() !== expectedName) {
      return NextResponse.json(
        { error: "Typed name does not match. Nothing was deleted." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // lesson_plans.teacher_id and schemes_of_work.teacher_id are NOT NULL —
    // a lesson plan / scheme of work can't exist without an author, so the
    // database will refuse this delete if either exists. Check up front so
    // we can give a clear, actionable message instead of a raw Postgres
    // constraint-violation error.
    const [{ count: lessonPlanCount }, { count: schemeCount }] = await Promise.all([
      adminSupabase
        .from("lesson_plans")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", staffId),
      adminSupabase
        .from("schemes_of_work")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", staffId),
    ]);

    if ((lessonPlanCount ?? 0) > 0 || (schemeCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This staff member has authored lesson plans or schemes of work, which can't be deleted. Deactivate their account instead to remove their access without losing academic records.",
        },
        { status: 409 }
      );
    }

    // Delete the HR record. Nullable references elsewhere (attendance,
    // exam results, fee payments, notifications, book borrowings, class
    // teacher assignment, HOD reviews) are set to NULL automatically by
    // the database — see migrations/0002_staff_delete_safety.sql. Those
    // historical records are preserved, just without attribution.
    const { error: staffDeleteError } = await adminSupabase
      .from("staff")
      .delete()
      .eq("id", staffId);

    if (staffDeleteError) throw staffDeleteError;

    // Fully remove login access, if this staff member had one. Deleting the
    // auth user cascades to delete the `profiles` row automatically
    // (profiles.id references auth.users(id) on delete cascade).
    if (targetStaff.profile_id) {
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(
        targetStaff.profile_id
      );
      if (authDeleteError) throw authDeleteError;
    }

    return NextResponse.json({ success: true, message: "Staff member deleted." });
  } catch (error) {
    console.error("Staff delete error:", error);
    return NextResponse.json(
      { error: "This staff member has history. To preserve school records, deactivate the staff member instead." },
      { status: 500 }
    );
  }
}