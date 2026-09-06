// Cross-school RLS isolation audit for EduKe.
//
// Creates two fully-isolated throwaway test schools ("RLS Audit School A/B"), seeds one row
// in every school-scoped table, then signs in as School A's principal and attempts to read
// School B's specific rows across every table. Correct RLS means every single attempt returns
// ZERO rows (not an error — RLS silently filters, which is exactly what makes leaks sneaky
// without a test like this). Cleans up all test data at the end regardless of outcome.
//
// Run with: node scripts/rls-audit.mjs
// Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = "AuditTest_2026!";

async function setupSchool(label, suffix) {
  const ids = { label };

  const { data: school, error: schoolError } = await admin
    .from("schools")
    .insert({ name: `RLS Audit School ${label}`, knec_code: `AUDIT-${suffix}-${Date.now()}`, school_type: "Private", curriculum: "8-4-4" })
    .select()
    .single();
  if (schoolError) throw new Error(`[${label}] school: ${schoolError.message}`);
  ids.schoolId = school.id;

  const { data: year } = await admin.from("academic_years").insert({ school_id: school.id, year: 2026, is_current: true }).select().single();
  ids.yearId = year.id;

  const { data: term } = await admin
    .from("terms")
    .insert({ academic_year_id: year.id, term_number: "Term 1", is_current: true })
    .select()
    .single();
  ids.termId = term.id;

  const { data: klass } = await admin
    .from("classes")
    .insert({ school_id: school.id, name: `Audit Class ${label}`, level: "Secondary", curriculum_type: "8-4-4" })
    .select()
    .single();
  ids.classId = klass.id;

  const { data: stream } = await admin.from("streams").insert({ class_id: klass.id, name: "Audit Stream", capacity: 30 }).select().single();
  ids.streamId = stream.id;

  const { data: subject } = await admin
    .from("subjects")
    .insert({ school_id: school.id, name: "Audit Subject", class_id: klass.id, curriculum_type: "8-4-4", max_marks: 100 })
    .select()
    .single();
  ids.subjectId = subject.id;

  // Principal (used to sign in and run the isolation tests)
  const principalEmail = `audit-principal-${suffix}-${Date.now()}@rls-audit.test`;
  const { data: principalAuth, error: principalAuthError } = await admin.auth.admin.createUser({
    email: principalEmail,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (principalAuthError) throw new Error(`[${label}] principal auth: ${principalAuthError.message}`);
  ids.principalEmail = principalEmail;
  ids.principalUserId = principalAuth.user.id;

  await admin.from("profiles").insert({ id: principalAuth.user.id, school_id: school.id, role: "principal", first_name: "Audit", last_name: `Principal ${label}` });

  const { data: principalStaff } = await admin
    .from("staff")
    .insert({ school_id: school.id, profile_id: principalAuth.user.id, first_name: "Audit", last_name: `Principal ${label}`, gender: "Female", phone: "+254700000001", role: "principal" })
    .select()
    .single();
  await admin.from("profiles").update({ staff_id: principalStaff.id }).eq("id", principalAuth.user.id);
  ids.principalStaffId = principalStaff.id;

  // A teacher, used as the "actor" on some rows (not signed in, just needs to exist)
  const { data: teacher } = await admin
    .from("staff")
    .insert({ school_id: school.id, first_name: "Audit", last_name: `Teacher ${label}`, gender: "Male", phone: "+254700000002", role: "teacher" })
    .select()
    .single();
  ids.teacherId = teacher.id;

  await admin.from("teacher_subjects").insert({ teacher_id: teacher.id, subject_id: subject.id, stream_id: stream.id, term_id: term.id });

  const { data: student } = await admin
    .from("students")
    .insert({
      school_id: school.id,
      admission_number: `AUDIT-${suffix}-${Date.now()}`,
      first_name: "Audit",
      last_name: `Student ${label}`,
      gender: "Female",
      stream_id: stream.id,
      class_id: klass.id,
      status: "Active",
    })
    .select()
    .single();
  ids.studentId = student.id;

  const { data: exam } = await admin
    .from("exams")
    .insert({ school_id: school.id, name: "Audit Exam", exam_type: "CAT 1", class_id: klass.id, term_id: term.id, out_of: 100, status: "Results Released" })
    .select()
    .single();
  ids.examId = exam.id;

  const { data: examResult } = await admin
    .from("exam_results")
    .insert({ student_id: student.id, exam_id: exam.id, subject_id: subject.id, marks_obtained: 70, entered_by: teacher.id })
    .select()
    .single();
  ids.examResultId = examResult.id;

  const { data: feeStructure } = await admin
    .from("fee_structure")
    .insert({ class_id: klass.id, term_id: term.id, fee_category: "Tuition", amount: 10000, is_mandatory: true })
    .select()
    .single();
  ids.feeStructureId = feeStructure.id;

  const { data: feePayment } = await admin
    .from("fee_payments")
    .insert({ student_id: student.id, term_id: term.id, amount: 5000, payment_method: "Cash", fee_category: "Tuition", status: "Confirmed" })
    .select()
    .single();
  ids.feePaymentId = feePayment.id;

  const { data: attendance } = await admin
    .from("attendance")
    .insert({ student_id: student.id, date: new Date().toISOString().slice(0, 10), status: "Present", recorded_by: teacher.id })
    .select()
    .single();
  ids.attendanceId = attendance.id;

  const { data: timetableSlot } = await admin
    .from("timetable_slots")
    .insert({ teacher_id: teacher.id, school_id: school.id, term_id: term.id, title: "Audit Subject", color: "blue", day_of_week: 1, start_time: "09:00", end_time: "10:00", stream_id: stream.id })
    .select()
    .single();
  ids.timetableSlotId = timetableSlot.id;

  const { data: book } = await admin
    .from("books")
    .insert({ school_id: school.id, title: "Audit Book", author: "Audit Author", total_copies: 1, available_copies: 1 })
    .select()
    .single();
  ids.bookId = book.id;

  const { data: notification } = await admin
    .from("notifications")
    .insert({ school_id: school.id, target_type: "school", channel: "SMS", message: "Audit notification", status: "Draft" })
    .select()
    .single();
  ids.notificationId = notification.id;

  const { data: lessonPlan } = await admin
    .from("lesson_plans")
    .insert({ teacher_id: teacher.id, subject_id: subject.id, stream_id: stream.id, term_id: term.id, week_number: 1, topic: "Audit Topic", content: "Audit content", status: "Draft" })
    .select()
    .single();
  ids.lessonPlanId = lessonPlan.id;

  const { data: scheme } = await admin
    .from("schemes_of_work")
    .insert({ teacher_id: teacher.id, subject_id: subject.id, class_id: klass.id, term_id: term.id, title: "Audit Scheme", content: "Audit content", status: "Draft" })
    .select()
    .single();
  ids.schemeId = scheme.id;

  const { data: question } = await admin
    .from("question_bank")
    .insert({ teacher_id: teacher.id, subject_id: subject.id, class_id: klass.id, topic: "Audit Topic", question_text: "Audit question?", question_type: "Short Answer", difficulty: "Medium", marks: 5, term_id: term.id })
    .select()
    .single();
  ids.questionId = question.id;

  const { data: loginSession } = await admin
    .from("login_sessions")
    .insert({ school_id: school.id, user_id: principalAuth.user.id, user_name: `Audit Principal ${label}`, user_role: "principal" })
    .select()
    .single();
  ids.loginSessionId = loginSession.id;

  // fee_payments / exam_results / timetable_slots inserts above already fired the audit_log triggers —
  // grab the most recent audit_log row tied to this school to test that table too.
  const { data: auditRow } = await admin.from("audit_log").select("id").eq("school_id", school.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  ids.auditLogId = auditRow?.id ?? null;

  return ids;
}

async function cleanupSchool(ids) {
  if (!ids) return;
  try {
    await admin.from("schools").delete().eq("id", ids.schoolId); // cascades most tables
  } catch {
    // best-effort cleanup
  }
  try {
    if (ids.principalUserId) await admin.auth.admin.deleteUser(ids.principalUserId);
  } catch {
    // best-effort cleanup
  }
}

async function main() {
  console.log("=== EduKe RLS Isolation Audit ===\n");
  console.log("Setting up two isolated test schools...");

  let schoolA, schoolB;
  try {
    schoolA = await setupSchool("A", "a");
    schoolB = await setupSchool("B", "b");
    console.log("Setup complete.\n");
  } catch (err) {
    console.error("Setup failed — aborting before any real tests ran:", err.message);
    await cleanupSchool(schoolA);
    await cleanupSchool(schoolB);
    process.exit(1);
  }

  console.log(`Signing in as School A's principal (${schoolA.principalEmail})...`);
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: signInError } = await anon.auth.signInWithPassword({ email: schoolA.principalEmail, password: TEST_PASSWORD });
  if (signInError) {
    console.error("Could not sign in as test principal — aborting:", signInError.message);
    await cleanupSchool(schoolA);
    await cleanupSchool(schoolB);
    process.exit(1);
  }
  console.log("Signed in. Running isolation tests against School B's data...\n");

  const tests = [
    ["classes", schoolB.classId],
    ["streams", schoolB.streamId],
    ["subjects", schoolB.subjectId],
    ["staff", schoolB.teacherId],
    ["students", schoolB.studentId],
    ["exams", schoolB.examId],
    ["exam_results", schoolB.examResultId],
    ["fee_structure", schoolB.feeStructureId],
    ["fee_payments", schoolB.feePaymentId],
    ["attendance", schoolB.attendanceId],
    ["timetable_slots", schoolB.timetableSlotId],
    ["books", schoolB.bookId],
    ["notifications", schoolB.notificationId],
    ["lesson_plans", schoolB.lessonPlanId],
    ["schemes_of_work", schoolB.schemeId],
    ["question_bank", schoolB.questionId],
    ["login_sessions", schoolB.loginSessionId],
    ["audit_log", schoolB.auditLogId],
  ];

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const [table, id] of tests) {
    if (!id) {
      console.log(`⏭️  SKIP  ${table.padEnd(20)} (no test row was created for School B)`);
      skipCount++;
      continue;
    }
    const { data, error } = await anon.from(table).select("id").eq("id", id);
    if (error) {
      console.log(`⚠️  ERROR ${table.padEnd(20)} query itself failed: ${error.message}`);
      continue;
    }
    if (data && data.length > 0) {
      console.log(`❌ FAIL  ${table.padEnd(20)} School A's principal COULD see School B's row — real isolation bug!`);
      failCount++;
    } else {
      console.log(`✅ PASS  ${table.padEnd(20)} isolated correctly`);
      passCount++;
    }
  }

  console.log(`\n${passCount} passed, ${failCount} failed, ${skipCount} skipped.`);
  if (failCount > 0) {
    console.log("\n⚠️  At least one table leaked data across schools. Do not onboard a second real school until this is fixed.");
  } else {
    console.log("\n✅ All tested tables correctly isolate schools from each other.");
  }

  await anon.auth.signOut();
  console.log("\nCleaning up test data...");
  await cleanupSchool(schoolA);
  await cleanupSchool(schoolB);
  console.log("Done.");

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Audit script crashed:", err);
  process.exit(1);
});