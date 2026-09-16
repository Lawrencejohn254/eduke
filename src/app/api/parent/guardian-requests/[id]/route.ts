import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Note: 'principal' | 'deputy_principal' | 'super_admin' matches the
// user_role enum and the guardian_link_requests RLS "staff update" policy —
// keep this list in sync with that policy if it ever changes.
const ALLOWED_ROLES = ["principal", "deputy_principal", "super_admin"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action;
    const reason: string | undefined = body.reason;

    if (action !== "approve" && action !== "reject" && action !== "edit") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: reviewer } = await supabase
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!reviewer) {
      return NextResponse.json({ error: "Profile not found." }, { status: 403 });
    }

    if (!ALLOWED_ROLES.includes(reviewer.role?.toLowerCase())) {
      return NextResponse.json({ error: "You are not authorized." }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: linkRequest } = await admin
      .from("guardian_link_requests")
      .select("*")
      .eq("id", id)
      .eq("school_id", reviewer.school_id)
      .maybeSingle();

    if (!linkRequest) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    if (linkRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed." },
        { status: 409 }
      );
    }

    // =====================================================
    // EDIT
    // =====================================================
    // Lets staff correct what the parent typed (name/phone/relationship,
    // and — most importantly — the student admission number) before
    // approving. Only touches allow-listed columns; status/reviewed_*
    // are untouched since editing isn't a final decision.
    if (action === "edit") {
      const fields = body.fields ?? {};
      const ALLOWED_FIELDS = [
        "full_name",
        "phone",
        "email",
        "relationship",
        "student_full_name_hint",
        "student_admission_number_hint",
      ] as const;

      const update: Record<string, unknown> = {};
      for (const key of ALLOWED_FIELDS) {
        if (key in fields) {
          update[key] = fields[key] === "" ? null : fields[key];
        }
      }

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: "No fields to update." }, { status: 400 });
      }

      const { error: updateError } = await admin
        .from("guardian_link_requests")
        .update(update)
        .eq("id", id);

      if (updateError) {
        console.error(updateError);
        return NextResponse.json({ error: "Could not save changes." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Changes saved." });
    }

    // =====================================================
    // REJECT
    // =====================================================
    // Note: we deliberately do NOT touch profiles.account_status here.
    // 'rejected' is not a valid value for that column (it's constrained to
    // pending/active/inactive/suspended) — the parent's account simply
    // stays 'pending' and they can retry with a corrected phone number
    // via /link-child. The rejection itself is recorded on this request row.
    if (action === "reject") {
      await admin
        .from("guardian_link_requests")
        .update({
          status: "rejected",
          rejection_reason: reason ?? null,
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json({ success: true, message: "Request rejected." });
    }

    // =====================================================
    // APPROVE
    // =====================================================
    // We require a resolvable admission number so we're never guessing
    // which student this parent belongs to. If it can't be resolved, the
    // reviewer needs to fix the request data (or the student record) first
    // rather than the API silently picking the "closest" match.
    if (!linkRequest.student_admission_number_hint) {
      return NextResponse.json(
        {
          error:
            "No admission number was provided, so the student can't be verified automatically. Ask the parent to resubmit with their child's admission number, or add them manually from the student's guardian list.",
        },
        { status: 422 }
      );
    }

    const { data: student } = await admin
      .from("students")
      .select("id, school_id")
      .eq("school_id", reviewer.school_id)
      .eq("admission_number", linkRequest.student_admission_number_hint.trim())
      .maybeSingle();

    if (!student) {
      return NextResponse.json(
        {
          error: `No student found with admission number "${linkRequest.student_admission_number_hint}" at this school. Check the number and try again, or add the parent manually.`,
        },
        { status: 422 }
      );
    }

    // Find or create the guardian record for this phone number — scoped to
    // THIS school only. A guardian with the same phone at a different
    // school (e.g. a test account, or a genuinely different family) must
    // never block approval or get reused here.
    const { data: existingGuardian } = await admin
      .from("guardians")
      .select("id, profile_id, student_guardians!inner(students!inner(school_id))")
      .eq("phone_primary", linkRequest.phone)
      .eq("student_guardians.students.school_id", reviewer.school_id)
      .maybeSingle();

    let guardianId: string;

    if (existingGuardian) {
      if (existingGuardian.profile_id && existingGuardian.profile_id !== linkRequest.auth_user_id) {
        return NextResponse.json(
          {
            error:
              "This phone number is already linked to a different parent account. Contact support before approving.",
          },
          { status: 409 }
        );
      }
      guardianId = existingGuardian.id;
    } else {
      const { data: newGuardian, error: guardianError } = await admin
        .from("guardians")
        .insert({
          full_name: linkRequest.full_name,
          phone_primary: linkRequest.phone,
          email: linkRequest.email,
          relationship: linkRequest.relationship,
        })
        .select("id")
        .single();

      if (guardianError || !newGuardian) {
        console.error(guardianError);
        return NextResponse.json(
          { error: "Could not create guardian record." },
          { status: 500 }
        );
      }
      guardianId = newGuardian.id;
    }

    // Link guardian <-> student if not already linked.
    const { data: existingLink } = await admin
      .from("student_guardians")
      .select("id")
      .eq("student_id", student.id)
      .eq("guardian_id", guardianId)
      .maybeSingle();

    if (!existingLink) {
      const { count: existingGuardianCount } = await admin
        .from("student_guardians")
        .select("id", { count: "exact", head: true })
        .eq("student_id", student.id);

      await admin.from("student_guardians").insert({
        student_id: student.id,
        guardian_id: guardianId,
        is_primary: (existingGuardianCount ?? 0) === 0,
        fee_payer: false,
        can_pickup: true,
      });
    }

    // Claim the guardian record and activate the profile.
    await admin.from("guardians").update({ profile_id: linkRequest.auth_user_id }).eq("id", guardianId);

    await admin
      .from("profiles")
      .update({
        role: "parent",
        guardian_id: guardianId,
        school_id: reviewer.school_id,
        account_status: "active",
        otp_verified: true,
      })
      .eq("id", linkRequest.auth_user_id);

    await admin
      .from("guardian_link_requests")
      .update({
        status: "approved",
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      message: "Parent account approved and linked.",
    });
  } catch (error) {
    console.error("Guardian request processing error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}