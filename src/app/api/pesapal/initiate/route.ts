import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitPesapalOrder } from "@/lib/pesapal";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, amount } = await req.json();

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, admission_number")
    .eq("id", studentId)
    .single();

  const { data: profile } = await supabase.from("profiles").select("guardian_id, phone").eq("id", user.id).single();
  const { data: guardian } = profile?.guardian_id
    ? await supabase.from("guardians").select("phone_primary, email").eq("id", profile.guardian_id).single()
    : { data: null };

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const origin = req.nextUrl.origin;
  const merchantReference = `EDUKE-${studentId.slice(0, 8)}-${Date.now()}-${Number(amount)}`;

  const order = await submitPesapalOrder({
    amount: Number(amount),
    studentName: `${student.first_name} ${student.last_name}`,
    studentAdmission: student.admission_number,
    guardianEmail: guardian?.email ?? undefined,
    guardianPhone: guardian?.phone_primary ?? profile?.phone ?? "0700000000",
    ipnUrl: `${origin}/api/pesapal/ipn`,
    callbackUrl: `${origin}/parent/fees?paid=1`,
    merchantReference,
  });

  return NextResponse.json(order);
}
