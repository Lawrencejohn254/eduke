"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

const EDITABLE_SCHOOL_FIELDS = [
  "name",
  "county",
  "sub_county",
  "phone",
  "email",
  "motto",
] as const;

export async function suspendSchool(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_schools");
  const schoolId = String(formData.get("schoolId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!schoolId || !reason) {
    throw new Error("A school id and a reason are required to suspend a school.");
  }

  const supabaseAdmin = createAdminClient();

  // Idempotency: don't overwrite an existing suspension's original reason/date.
  const { data: current } = await supabaseAdmin
    .from("schools")
    .select("id, name, status")
    .eq("id", schoolId)
    .single();

  if (!current) throw new Error("School not found.");

  if (current.status === "suspended") {
    // Already suspended — no-op, but still recorded for traceability.
    await logPlatformAction({
      admin,
      action: "school.suspend",
      entityType: "school",
      entityId: schoolId,
      schoolId,
      result: "failure",
      details: { reason: "already_suspended" },
    });
    return;
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
      suspended_by: admin.userId,
      suspension_reason: reason,
    })
    .eq("id", schoolId);

  await logPlatformAction({
    admin,
    action: "school.suspend",
    entityType: "school",
    entityId: schoolId,
    schoolId,
    result: error ? "failure" : "success",
    details: { school_name: current.name, reason, error: error?.message },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/schools");
  revalidatePath("/platform-admin");
  revalidatePath(`/platform-admin/${schoolId}`);
}

export async function reactivateSchool(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_schools");
  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) throw new Error("A school id is required.");

  const supabaseAdmin = createAdminClient();

  const { data: current } = await supabaseAdmin
    .from("schools")
    .select("id, name, status")
    .eq("id", schoolId)
    .single();

  if (!current) throw new Error("School not found.");

  if (current.status !== "suspended") {
    await logPlatformAction({
      admin,
      action: "school.reactivate",
      entityType: "school",
      entityId: schoolId,
      schoolId,
      result: "failure",
      details: { reason: "not_suspended", current_status: current.status },
    });
    return;
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .update({
      status: "active",
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    })
    .eq("id", schoolId);

  await logPlatformAction({
    admin,
    action: "school.reactivate",
    entityType: "school",
    entityId: schoolId,
    schoolId,
    result: error ? "failure" : "success",
    details: { school_name: current.name, error: error?.message },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/schools");
  revalidatePath("/platform-admin");
  revalidatePath(`/platform-admin/${schoolId}`);
}

export async function updateSchoolMetadata(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_schools");
  const schoolId = String(formData.get("schoolId") ?? "");
  if (!schoolId) throw new Error("A school id is required.");

  const supabaseAdmin = createAdminClient();

  const { data: before } = await supabaseAdmin
    .from("schools")
    .select(EDITABLE_SCHOOL_FIELDS.join(","))
    .eq("id", schoolId)
    .single();

  if (!before) throw new Error("School not found.");

  const updates: Record<string, string> = {};
  for (const field of EDITABLE_SCHOOL_FIELDS) {
    const value = formData.get(field);
    if (value !== null) updates[field] = String(value).trim();
  }

  const { error } = await supabaseAdmin
    .from("schools")
    .update(updates)
    .eq("id", schoolId);

  await logPlatformAction({
    admin,
    action: "school.edit_metadata",
    entityType: "school",
    entityId: schoolId,
    schoolId,
    result: error ? "failure" : "success",
    details: { before, after: updates, error: error?.message },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/schools");
  revalidatePath(`/platform-admin/${schoolId}`);
}