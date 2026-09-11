import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSMS } from "@/lib/africastalking";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: batch, error } = await supabase.rpc("claim_pending_sms_recipients", { p_limit: 50 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!batch || batch.length === 0) return NextResponse.json({ processed: 0 });

  const touchedNotifications = new Set<string>();

  for (const item of batch) {
    touchedNotifications.add(item.notification_id);
    const result = await sendSMS(item.phone, item.message);
    await supabase.rpc("update_recipient_delivery_status", {
    p_recipient_id: item.recipient_id,
    p_status: result.success ? "Sent" : "Failed",
    p_provider_message_id: null,
    p_failure_reason: result.success ? null : "SMS provider rejected the message",
    });
  }

  for (const notificationId of touchedNotifications) {
    await supabase.rpc("refresh_notification_status", { p_notification_id: notificationId });
  }

  return NextResponse.json({ processed: batch.length });
}