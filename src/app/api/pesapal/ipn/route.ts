import { NextRequest, NextResponse } from "next/server";
import { getPesapalTransactionStatus } from "@/lib/pesapal";
import { createAdminClient } from "@/lib/supabase/admin";

// Pesapal calls this URL directly (no user session), so we use the admin client.
// Expected query params per Pesapal v3: OrderTrackingId, OrderMerchantReference
export async function GET(req: NextRequest) {
  const orderTrackingId = req.nextUrl.searchParams.get("OrderTrackingId");
  const merchantReference = req.nextUrl.searchParams.get("OrderMerchantReference");

  if (!orderTrackingId || !merchantReference) {
    return NextResponse.json({ error: "Missing tracking parameters" }, { status: 400 });
  }

  const status = await getPesapalTransactionStatus(orderTrackingId);
  const admin = createAdminClient();

  if (status.paymentStatus === "COMPLETED") {
    // merchantReference format: EDUKE-<studentIdPrefix>-<timestamp>-<amount>
    const parts = merchantReference.split("-");
    const studentIdPrefix = parts[1];
    const amount = Number(parts[3] ?? 0);

    const { data: student } = await admin
      .from("students")
      .select("id")
      .ilike("id", `${studentIdPrefix}%`)
      .maybeSingle();

    const { data: currentTerm } = await admin.from("terms").select("id").eq("is_current", true).maybeSingle();

    if (student && currentTerm && amount > 0) {
      await admin.from("fee_payments").insert({
        student_id: student.id,
        term_id: currentTerm.id,
        amount,
        payment_method: "M-Pesa",
        pesapal_order_id: orderTrackingId,
        fee_category: "Tuition",
        status: "Confirmed",
      });
    }
  }

  return NextResponse.json({ orderNotificationType: "IPNCHANGE", orderTrackingId, orderMerchantReference: merchantReference, status: 200 });
}
