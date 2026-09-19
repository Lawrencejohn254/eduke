"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

export async function createTicket(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_support_tickets");
  const schoolId = String(formData.get("schoolId") ?? "") || null;
  const reporterName = String(formData.get("reporterName") ?? "").trim();
  const reporterEmail = String(formData.get("reporterEmail") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");

  if (!subject || !description) throw new Error("Subject and description are required.");

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .insert({
      school_id: schoolId,
      reporter_name: reporterName || null,
      reporter_email: reporterEmail || null,
      subject,
      description,
      priority,
    })
    .select("id")
    .single();

  await logPlatformAction({
    admin,
    action: "support.create_ticket",
    entityType: "support_ticket",
    entityId: data?.id ?? null,
    schoolId,
    result: error ? "failure" : "success",
    details: { subject, priority, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/support");
}

export async function assignTicket(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_support_tickets");
  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) throw new Error("Missing ticket id.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({ assigned_admin_id: admin.userId, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  await logPlatformAction({
    admin,
    action: "support.assign_ticket",
    entityType: "support_ticket",
    entityId: ticketId,
    result: error ? "failure" : "success",
    details: { assigned_to: admin.email, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/support");
}

export async function changeTicketStatus(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_support_tickets");
  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!ticketId || !status) throw new Error("Missing ticket id or status.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  await logPlatformAction({
    admin,
    action: "support.change_status",
    entityType: "support_ticket",
    entityId: ticketId,
    result: error ? "failure" : "success",
    details: { status, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/support");
}

export async function changeTicketPriority(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_support_tickets");
  const ticketId = String(formData.get("ticketId") ?? "");
  const priority = String(formData.get("priority") ?? "");
  if (!ticketId || !priority) throw new Error("Missing ticket id or priority.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  await logPlatformAction({
    admin,
    action: "support.change_priority",
    entityType: "support_ticket",
    entityId: ticketId,
    result: error ? "failure" : "success",
    details: { priority, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/support");
}

export async function replyToTicket(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_support_tickets");
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || !body) throw new Error("A reply body is required.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("support_ticket_replies").insert({
    ticket_id: ticketId,
    author_id: admin.userId,
    author_name: admin.email ?? admin.userId,
    body,
  });

  if (!error) {
    await supabaseAdmin
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);
  }

  await logPlatformAction({
    admin,
    action: "support.reply",
    entityType: "support_ticket",
    entityId: ticketId,
    result: error ? "failure" : "success",
    details: { error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/support");
  revalidatePath(`/platform-admin/support/${ticketId}`);
}