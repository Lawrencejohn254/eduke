import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, amount } = await req.json();

  const { data: currentTerm } = await supabase.from("terms").select("id").eq("is_current", true).maybeSingle();
  if (!currentTerm) return NextResponse.json({ error: "No current term set" }, { status: 400 });

  const { error } = await supabase.from("fee_payments").insert({
    student_id: studentId,
    term_id: currentTerm.id,
    amount: Number(amount),
    payment_method: "M-Pesa",
    pesapal_order_id: `MOCK-${Date.now()}`,
    fee_category: "Tuition",
    status: "Confirmed",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
