import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderTemplate } from "@/lib/communications/render-template";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("school_id, staff_id, role").eq("id", user.id).single();
  if (!profile || profile.role === "parent") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetType, targetId, subject, message, communicationType, channels, sendMode, scheduledFor, templateId, templateVariables } = await req.json();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (!Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ error: "Select at least one delivery channel" }, { status: 400 });
  }
  const allowedChannels = channels.filter((c: string) => ["SMS", "In-App"].includes(c));
  if (allowedChannels.length === 0) {
    return NextResponse.json({ error: "Selected channels are not yet available" }, { status: 400 });
  }

  const commType = communicationType || "General Announcement";
  const isScheduled = sendMode === "schedule";
  const variables = templateVariables && typeof templateVariables === "object" ? templateVariables : {};

  if (isScheduled) {
    if (!scheduledFor) return NextResponse.json({ error: "Choose a date and time to schedule this for" }, { status: 400 });
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }
  }

  const { data: allowed, error: permError } = await supabase.rpc("can_send_communication", {
    p_type: commType,
    p_target_type: targetType,
    p_target_id: targetId || null,
  });
  if (permError) return NextResponse.json({ error: "Could not verify permissions" }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: "You are not authorized to send this type of communication to this audience." }, { status: 403 });

  // Scheduled: store the template body as-is; rendering happens per-recipient at dispatch time.
  if (isScheduled) {
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        school_id: profile.school_id,
        recipient_type: targetType,
        target_type: targetType,
        target_id: targetType === "school" ? null : targetId,
        communication_type: commType,
        channel: allowedChannels[0],
        channels: allowedChannels,
        subject: subject || null,
        message,
        template_id: templateId || null,
        template_variables: variables,
        sent_by: profile.staff_id,
        scheduled_for: scheduledFor,
        recipient_count: 0,
        status: "Scheduled",
      })
      .select()
      .single();
    if (notifError) return NextResponse.json({ error: "Could not schedule communication" }, { status: 500 });
    return NextResponse.json({ success: true, scheduled: true, scheduledFor: notification.scheduled_for });
  }

  // Send now
  const { data: recipients, error: recipientsError } = await supabase.rpc("resolve_communication_recipients", {
    p_target_type: targetType,
    p_target_id: targetId || null,
  });
  if (recipientsError) return NextResponse.json({ error: "Could not resolve recipients" }, { status: 500 });

  const dedupedGuardians = new Map<string, {
    student_id: string; guardian_id: string; phone: string | null; email: string | null;
    guardian_name: string | null; student_name: string | null; class_name: string | null; stream_name: string | null;
  }>();
  for (const r of recipients ?? []) {
    if (r.guardian_id) dedupedGuardians.set(r.guardian_id, r);
  }
  const recipientList = Array.from(dedupedGuardians.values());

  const { data: school } = await supabase.from("schools").select("name").eq("id", profile.school_id).single();
  const schoolName = school?.name || "";

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: profile.school_id,
      recipient_type: targetType,
      target_type: targetType,
      target_id: targetType === "school" ? null : targetId,
      communication_type: commType,
      channel: allowedChannels[0],
      channels: allowedChannels,
      subject: subject || null,
      message,
      template_id: templateId || null,
      template_variables: variables,
      sent_by: profile.staff_id,
      sent_at: new Date().toISOString(),
      recipient_count: recipientList.length,
      status: recipientList.length > 0 ? "Queued" : "Failed",
    })
    .select()
    .single();
  if (notifError) return NextResponse.json({ error: "Could not create communication" }, { status: 500 });

  const recipientRows = [];
  for (const r of recipientList) {
    const rendered = renderTemplate(message, r, schoolName, variables);
    if (allowedChannels.includes("SMS")) {
      recipientRows.push(
        r.phone
          ? { notification_id: notification.id, guardian_id: r.guardian_id, student_id: r.student_id, channel: "SMS", phone: r.phone, delivery_status: "Pending", rendered_message: rendered }
          : { notification_id: notification.id, guardian_id: r.guardian_id, student_id: r.student_id, channel: "SMS", phone: null, delivery_status: "Failed", failure_reason: "No phone number on file", rendered_message: rendered }
      );
    }
    if (allowedChannels.includes("In-App")) {
      recipientRows.push({
        notification_id: notification.id, guardian_id: r.guardian_id, student_id: r.student_id,
        channel: "In-App", phone: r.phone, delivery_status: "Delivered", rendered_message: rendered,
        sent_at: new Date().toISOString(), delivered_at: new Date().toISOString(),
      });
    }
  }
  if (recipientRows.length > 0) {
    await supabase.from("notification_recipients").insert(recipientRows);
  }

  return NextResponse.json({
    success: true,
    recipientCount: recipientList.length,
    queued: allowedChannels.includes("SMS"),
  });
}