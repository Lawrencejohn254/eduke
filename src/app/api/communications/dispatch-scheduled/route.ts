import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { renderTemplate } from "@/lib/communications/render-template";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: due, error } = await supabase.rpc("claim_due_scheduled_communications", { p_limit: 20 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due || due.length === 0) return NextResponse.json({ dispatched: 0 });

  for (const comm of due) {
    const { data: fullComm } = await supabase.from("notifications").select("message, template_variables").eq("id", comm.id).single();
    const { data: school } = await supabase.from("schools").select("name").eq("id", comm.school_id).single();
    const schoolName = school?.name || "";
    const templateVars = fullComm?.template_variables || {};
    const template = fullComm?.message || comm.message;

    const { data: recipients } = await supabase.rpc("resolve_communication_recipients_for_school", {
      p_school_id: comm.school_id,
      p_target_type: comm.target_type,
      p_target_id: comm.target_id,
    });

    const dedupedGuardians = new Map<string, {
      student_id: string; guardian_id: string; phone: string | null;
      guardian_name: string | null; student_name: string | null; class_name: string | null; stream_name: string | null;
    }>();
    for (const r of recipients ?? []) {
      if (r.guardian_id) dedupedGuardians.set(r.guardian_id, r);
    }
    const recipientList = Array.from(dedupedGuardians.values());

    const recipientRows = [];
    for (const r of recipientList) {
      const rendered = renderTemplate(template, r, schoolName, templateVars);
      if (comm.channels.includes("SMS")) {
        recipientRows.push(
          r.phone
            ? { notification_id: comm.id, guardian_id: r.guardian_id, student_id: r.student_id, channel: "SMS", phone: r.phone, delivery_status: "Pending", rendered_message: rendered }
            : { notification_id: comm.id, guardian_id: r.guardian_id, student_id: r.student_id, channel: "SMS", phone: null, delivery_status: "Failed", failure_reason: "No phone number on file", rendered_message: rendered }
        );
      }
      if (comm.channels.includes("In-App")) {
        recipientRows.push({
          notification_id: comm.id, guardian_id: r.guardian_id, student_id: r.student_id,
          channel: "In-App", phone: r.phone, delivery_status: "Delivered", rendered_message: rendered,
          sent_at: new Date().toISOString(), delivered_at: new Date().toISOString(),
        });
      }
    }

    if (recipientRows.length > 0) {
      await supabase.from("notification_recipients").insert(recipientRows);
      await supabase.from("notifications").update({ recipient_count: recipientList.length }).eq("id", comm.id);
    }

    await supabase.rpc("refresh_notification_status", { p_notification_id: comm.id });
  }

  return NextResponse.json({ dispatched: due.length });
}