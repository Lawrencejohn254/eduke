import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSMS } from "@/lib/africastalking";
import { formatDateDMY } from "@/lib/format";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  if (body.studentIds && body.reason === "absent") {
    const { data: guardianLinks } = await admin
      .from("student_guardians")
      .select("student:students(first_name, last_name), guardian:guardians(phone_primary)")
      .in("student_id", body.studentIds);

    let sent = 0;
    for (const link of guardianLinks ?? []) {
      const student = link.student as unknown as { first_name: string; last_name: string } | null;
      const guardian = link.guardian as unknown as { phone_primary: string } | null;
      if (!student || !guardian) continue;
      await sendSMS(
        guardian.phone_primary,
        `EduKe: ${student.first_name} ${student.last_name} was marked ABSENT on ${formatDateDMY(body.date)}. Please contact the school if this is unexpected.`
      );
      sent++;
    }
    return NextResponse.json({ sent });
  }

  if (body.message && body.recipientPhones) {
    const result = await sendSMS(body.recipientPhones, body.message);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
