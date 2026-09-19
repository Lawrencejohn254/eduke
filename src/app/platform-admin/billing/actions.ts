"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/supabase/platform-admin-guard";
import { logPlatformAction } from "@/lib/platform-admin/audit";

export async function createPlan(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_billing");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceRaw = String(formData.get("price_kes") ?? "").trim();
  const billingInterval = String(formData.get("billing_interval") ?? "monthly");

  if (!name) throw new Error("Plan name is required.");

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from("platform_subscription_plans")
    .insert({
      name,
      description: description || null,
      price_kes: priceRaw ? Number(priceRaw) : null,
      billing_interval: billingInterval,
    })
    .select("id")
    .single();

  await logPlatformAction({
    admin,
    action: "billing.create_plan",
    entityType: "subscription_plan",
    entityId: data?.id ?? null,
    result: error ? "failure" : "success",
    details: { name, price_kes: priceRaw, billing_interval: billingInterval, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/billing");
}

export async function assignSubscription(formData: FormData) {
  const admin = await requirePlatformAdmin("manage_billing");
  const schoolId = String(formData.get("schoolId") ?? "");
  const planId = String(formData.get("planId") ?? "") || null;
  const status = String(formData.get("status") ?? "none");
  const startDate = String(formData.get("start_date") ?? "") || null;
  const renewalDate = String(formData.get("renewal_date") ?? "") || null;

  if (!schoolId) throw new Error("Missing school id.");

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("platform_school_subscriptions")
    .upsert(
      {
        school_id: schoolId,
        plan_id: planId,
        status,
        start_date: startDate,
        renewal_date: renewalDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school_id" }
    );

  await logPlatformAction({
    admin,
    action: "billing.assign_subscription",
    entityType: "school_subscription",
    entityId: schoolId,
    schoolId,
    result: error ? "failure" : "success",
    details: { plan_id: planId, status, start_date: startDate, renewal_date: renewalDate, error: error?.message },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/platform-admin/billing");
}