import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/africastalking";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("school_id, staff_id, role").eq("id", user.id).single();
  if (!profile || profile.role === "parent") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetType, targetId, subject, message } = await req.json();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  // Resolve the guardian phone numbers for the chosen audience.
  let guardianQuery = supabase
    .from("student_guardians")
    .select("guardian:guardians(id, phone_primary), student:students!inner(school_id, class_id, stream_id, id)")
    .eq("student.school_id", profile.school_id);

  if (targetType === "class") guardianQuery = guardianQuery.eq("student.class_id", targetId);
  if (targetType === "stream") guardianQuery = guardianQuery.eq("student.stream_id", targetId);
  if (targetType === "student") guardianQuery = guardianQuery.eq("student.id", targetId);

  const { data: links, error: linksError } = await guardianQuery;
  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

  const guardianMap = new Map<string, { id: string; phone_primary: string }>();
  for (const link of links ?? []) {
    const g = link.guardian as unknown as { id: string; phone_primary: string } | null;
    if (g) guardianMap.set(g.id, g);
  }
  const recipients = Array.from(guardianMap.values());

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: profile.school_id,
      recipient_type: targetType,
      target_type: targetType,
      target_id: targetType === "school" ? null : targetId,
      channel: "SMS",
      subject: subject || null,
      message,
      sent_by: profile.staff_id,
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length,
      status: recipients.length > 0 ? "Sent" : "Failed",
    })
    .select()
    .single();
  if (notifError) return NextResponse.json({ error: notifError.message }, { status: 500 });

  let simulated = false;
  const recipientRows = [];
  for (const g of recipients) {
    const result = await sendSMS(g.phone_primary, message);
    simulated = result.simulated;
    recipientRows.push({
      notification_id: notification.id,
      guardian_id: g.id,
      phone: g.phone_primary,
      delivery_status: result.success ? "Sent" : "Failed",
    });
  }
  if (recipientRows.length > 0) {
    await supabase.from("notification_recipients").insert(recipientRows);
  }

  return NextResponse.json({ success: true, recipientCount: recipients.length, simulated });
}
