"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

type SignupStatus = "pending" | "under_review" | "approved" | "rejected" | "on_hold";

async function getSignup(id: string) {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("school_signup_requests")
    .select("id, school_name, status")
    .eq("id", id)
    .single();
  return data;
}

async function transition(
  id: string,
  admin: Awaited<ReturnType<typeof requirePlatformAdmin>>,
  action: string,
  updates: Record<string, unknown>,
  allowedFrom: SignupStatus[],
  details: Record<string, unknown> = {}
) {
  const supabaseAdmin = createAdminClient();
  const current = await getSignup(id);

  if (!current) throw new Error("Signup request not found.");

  if (!allowedFrom.includes(current.status as SignupStatus)) {
    // e.g. prevents double-approval, rejecting an already-approved request, etc.
    await logPlatformAction({
      admin,
      action,
      entityType: "school_signup_request",
      entityId: id,
      result: "failure",
      details: {
        reason: "invalid_transition",
        current_status: current.status,
        school_name: current.school_name,
        ...details,
      },
    });
    throw new Error(
      `Cannot perform this action: request is already "${current.status}".`
    );
  }

  const { error } = await supabaseAdmin
    .from("school_signup_requests")
    .update({
      ...updates,
      reviewed_by: admin.userId,
      reviewed_by_email: admin.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logPlatformAction({
    admin,
    action,
    entityType: "school_signup_request",
    entityId: id,
    result: error ? "failure" : "success",
    details: { school_name: current.school_name, error: error?.message, ...details },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/signups");
  revalidatePath("/platform-admin");
}

export async function moveToUnderReview(formData: FormData) {
  const admin = await requirePlatformAdmin("approve_signups");
  const id = String(formData.get("signupId") ?? "");
  if (!id) throw new Error("Missing signup id.");
  await transition(id, admin, "signup.under_review", { status: "under_review" }, [
    "pending",
    "on_hold",
  ]);
}

export async function approveSignup(formData: FormData) {
  const admin = await requirePlatformAdmin("approve_signups");
  const id = String(formData.get("signupId") ?? "");
  if (!id) throw new Error("Missing signup id.");

  // Note: this records the decision only. There is no automated school
  // provisioning hook in the database today — the existing
  // `npm run onboard-school` CLI script is still the actual onboarding
  // step, run manually after approval, per the current architecture.
  await transition(
    id,
    admin,
    "signup.approve",
    { status: "approved" },
    ["pending", "under_review", "on_hold"],
    { note: "School must still be provisioned via the onboarding script." }
  );
}

export async function rejectSignup(formData: FormData) {
  const admin = await requirePlatformAdmin("approve_signups");
  const id = String(formData.get("signupId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) throw new Error("Missing signup id.");
  if (!reason) throw new Error("A rejection reason is required.");

  await transition(
    id,
    admin,
    "signup.reject",
    { status: "rejected", rejection_reason: reason },
    ["pending", "under_review", "on_hold"],
    { reason }
  );
}

export async function holdSignup(formData: FormData) {
  const admin = await requirePlatformAdmin("approve_signups");
  const id = String(formData.get("signupId") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();
  if (!id) throw new Error("Missing signup id.");

  await transition(
    id,
    admin,
    "signup.hold",
    { status: "on_hold", admin_notes: notes || null },
    ["pending", "under_review"],
    { notes }
  );
}

export async function requestMoreInfo(formData: FormData) {
  const admin = await requirePlatformAdmin("approve_signups");
  const id = String(formData.get("signupId") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();
  if (!id) throw new Error("Missing signup id.");
  if (!notes) throw new Error("Describe what information is needed.");

  // Kept as its own status-neutral action: records the request without
  // forcing a status the spec doesn't define ("info requested" isn't one
  // of the five statuses), but moves pending -> under_review since someone
  // is now actively handling it.
  await transition(
    id,
    admin,
    "signup.request_info",
    { status: "under_review", admin_notes: notes },
    ["pending", "under_review", "on_hold"],
    { notes }
  );
}