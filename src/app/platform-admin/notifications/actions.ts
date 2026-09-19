"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

type Audience = "all" | "selected";
type RecipientRole = "all" | "principals" | "teachers" | "parents";
type Priority = "normal" | "high" | "urgent";

export async function sendPlatformNotification(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_notifications");

  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const audience = (formData.get("audience") as Audience) || "all";
  const recipientRole = (formData.get("recipientRole") as RecipientRole) || "all";
  const priority = (formData.get("priority") as Priority) || "normal";
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "").trim();
  const selectedSchoolIds = formData.getAll("schoolIds").map(String).filter(Boolean);

  if (!title || !message) {
    throw new Error("A title and message are required.");
  }
  if (audience === "selected" && selectedSchoolIds.length === 0) {
    throw new Error("Select at least one school, or choose \"All schools\".");
  }

  const supabaseAdmin = createAdminClient();

  let targetSchoolIds: string[];
  if (audience === "all") {
    const { data: activeSchools, error } = await supabaseAdmin
      .from("schools")
      .select("id")
      .eq("status", "active");
    if (error) throw new Error(error.message);
    targetSchoolIds = (activeSchools ?? []).map((s) => s.id);
  } else {
    targetSchoolIds = selectedSchoolIds;
  }

  if (targetSchoolIds.length === 0) {
    throw new Error("No active schools to notify.");
  }

  const communicationType = priority === "urgent" ? "Emergency Alert" : "General Announcement";
  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw).toISOString() : null;
  const isFuture = scheduledFor && new Date(scheduledFor).getTime() > Date.now();
  const campaignId = randomUUID();
  const now = new Date().toISOString();

  const rows = targetSchoolIds.map((schoolId) => ({
    school_id: schoolId,
    target_type: "school" as const,
    target_id: schoolId,
    recipient_type: recipientRole,
    channels: ["In-App"],
    communication_type: communicationType,
    subject: title,
    message,
    sent_by: admin.userId,
    status: isFuture ? "Scheduled" : "Queued",
    scheduled_for: scheduledFor,
    sent_at: isFuture ? null : now,
    campaign_id: campaignId,
    is_platform_broadcast: true,
  }));

  const { error } = await supabaseAdmin.from("notifications").insert(rows);

  await logPlatformAction({
    admin,
    action: "notification.send",
    entityType: "notification_campaign",
    entityId: campaignId,
    result: error ? "failure" : "success",
    details: {
      title,
      recipient_role: recipientRole,
      audience,
      priority,
      school_count: targetSchoolIds.length,
      scheduled_for: scheduledFor,
      error: error?.message,
    },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/platform-admin/notifications");
}