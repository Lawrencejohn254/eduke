import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncStudentToNemis } from "@/lib/nemis";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await req.json();
  const { data: student, error } = await supabase
    .from("students")
    .select("admission_number, first_name, last_name, date_of_birth, gender, upi")
    .eq("id", studentId)
    .single();
  if (error || !student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const result = await syncStudentToNemis({
    admissionNumber: student.admission_number,
    firstName: student.first_name,
    lastName: student.last_name,
    dateOfBirth: student.date_of_birth,
    gender: student.gender,
    upi: student.upi,
  });

  if (result.success && result.nemisId) {
    await supabase.from("students").update({ upi: result.nemisId }).eq("id", studentId);
  }

  return NextResponse.json(result);
}
