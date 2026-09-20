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

  // Staff only. Without this any signed-in account (including a parent) could send SMS to arbitrary numbers
  // on the school's Africa's Talking balance.
  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user.id).single();
  if (!profile || profile.role === "parent") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  if (body.studentIds && body.reason === "absent") {
    // The admin client bypasses RLS, so only accept students that belong to the caller's own school.
    const { data: ownStudents } = await admin.from("students").select("id").in("id", body.studentIds).eq("school_id", profile.school_id);
    const ownIds = (ownStudents ?? []).map((s: { id: string }) => s.id);

    const { data: guardianLinks } = await admin
      .from("student_guardians")
      .select("student:students(first_name, last_name), guardian:guardians(phone_primary)")
      .in("student_id", ownIds);

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
