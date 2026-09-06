// Seeds a demo Kenyan secondary school with sample data for all 5 MVP roles.
// Run with: npm run seed
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "password123";

async function createUser(email, role) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) {
    if (error.message.includes("already been registered")) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list.users.find((u) => u.email === email);
      return existing;
    }
    throw error;
  }
  return data.user;
}

async function main() {
  console.log("Seeding EduKe demo school…");

  // 1. School
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: "Greenfield Secondary School",
      knec_code: "12345001",
      county: "Nairobi",
      sub_county: "Westlands",
      phone: "+254700000000",
      email: "info@greenfield.ac.ke",
      motto: "Knowledge and Integrity",
      school_type: "Private",
      school_level: "Secondary",
      curriculum: "CBC",
      is_boarding: false,
      sms_sender_id: "EduKe",
    })
    .select()
    .single();
  if (schoolError) throw schoolError;
  console.log("Created school:", school.name);

  // 2. Academic year + terms
  const { data: year } = await supabase
    .from("academic_years")
    .insert({ school_id: school.id, year: 2026, is_current: true })
    .select()
    .single();

  const { data: term1 } = await supabase
    .from("terms")
    .insert({ academic_year_id: year.id, term_number: "Term 1", is_current: false })
    .select()
    .single();
  const { data: term2 } = await supabase
    .from("terms")
    .insert({ academic_year_id: year.id, term_number: "Term 2", is_current: true })
    .select()
    .single();
  await supabase.from("terms").insert({ academic_year_id: year.id, term_number: "Term 3", is_current: false });

  // 3. Classes + streams
  const classNames = ["Grade 9", "Grade 10"];
  const classes = [];
  for (const name of classNames) {
    const { data: klass } = await supabase
      .from("classes")
      .insert({ school_id: school.id, name, level: "Secondary", curriculum_type: "CBC" })
      .select()
      .single();
    classes.push(klass);
  }

  const streams = [];
  for (const klass of classes) {
    for (const streamName of ["East", "West"]) {
      const { data: stream } = await supabase
        .from("streams")
        .insert({ class_id: klass.id, name: streamName, capacity: 45 })
        .select()
        .single();
      streams.push({ ...stream, class: klass });
    }
  }

  // 4. Subjects
  const subjectNames = ["Mathematics", "English", "Kiswahili", "Integrated Science"];
  const subjects = [];
  for (const klass of classes) {
    for (const name of subjectNames) {
      const { data: subj } = await supabase
        .from("subjects")
        .insert({ school_id: school.id, name, class_id: klass.id, curriculum_type: "CBC", max_marks: 100 })
        .select()
        .single();
      subjects.push(subj);
    }
  }

  // 5. Users + staff + profiles
  const principalUser = await createUser("principal@greenfield.ac.ke", "principal");
  const teacherUser = await createUser("teacher@greenfield.ac.ke", "teacher");
  const hodUser = await createUser("hod@greenfield.ac.ke", "hod");
  const bursarUser = await createUser("bursar@greenfield.ac.ke", "bursar");
  const parentUser = await createUser("parent@greenfield.ac.ke", "parent");

  // Profiles must exist BEFORE staff rows, since staff.profile_id has a foreign key to profiles(id).
  // staff_id on each profile is backfilled after the staff rows are created below.
  const { error: profilesError } = await supabase.from("profiles").insert([
    { id: principalUser.id, school_id: school.id, role: "principal", first_name: "Grace", last_name: "Wanjiru", phone: "+254711000001" },
    { id: teacherUser.id, school_id: school.id, role: "teacher", first_name: "John", last_name: "Otieno", phone: "+254711000002" },
    { id: hodUser.id, school_id: school.id, role: "hod", first_name: "Mary", last_name: "Achieng", phone: "+254711000003" },
    { id: bursarUser.id, school_id: school.id, role: "bursar", first_name: "Peter", last_name: "Kamau", phone: "+254711000004" },
  ]);
  if (profilesError) throw profilesError;

  const { data: principalStaff, error: e1 } = await supabase
    .from("staff")
    .insert({ school_id: school.id, profile_id: principalUser.id, staff_number: "STF001", first_name: "Grace", last_name: "Wanjiru", gender: "Female", phone: "+254711000001", role: "principal", department: "Administration", date_joined: "2018-01-10" })
    .select()
    .single();
  if (e1) throw e1;

  const { data: teacherStaff, error: e2 } = await supabase
    .from("staff")
    .insert({ school_id: school.id, profile_id: teacherUser.id, staff_number: "STF002", first_name: "John", last_name: "Otieno", gender: "Male", phone: "+254711000002", role: "teacher", department: "Mathematics", date_joined: "2020-01-10" })
    .select()
    .single();
  if (e2) throw e2;

  const { data: hodStaff, error: e3 } = await supabase
    .from("staff")
    .insert({ school_id: school.id, profile_id: hodUser.id, staff_number: "STF003", first_name: "Mary", last_name: "Achieng", gender: "Female", phone: "+254711000003", role: "hod", department: "Sciences", date_joined: "2017-05-01" })
    .select()
    .single();
  if (e3) throw e3;

  const { data: bursarStaff, error: e4 } = await supabase
    .from("staff")
    .insert({ school_id: school.id, profile_id: bursarUser.id, staff_number: "STF004", first_name: "Peter", last_name: "Kamau", gender: "Male", phone: "+254711000004", role: "bursar", department: "Finance", date_joined: "2019-03-01" })
    .select()
    .single();
  if (e4) throw e4;

  await supabase.from("profiles").update({ staff_id: principalStaff.id }).eq("id", principalUser.id);
  await supabase.from("profiles").update({ staff_id: teacherStaff.id }).eq("id", teacherUser.id);
  await supabase.from("profiles").update({ staff_id: hodStaff.id }).eq("id", hodUser.id);
  await supabase.from("profiles").update({ staff_id: bursarStaff.id }).eq("id", bursarUser.id);

  // 6. Teacher assignments (John Otieno teaches Maths to all streams; Mary Achieng teaches Science)
  const mathsSubjects = subjects.filter((s) => s.name === "Mathematics");
  const scienceSubjects = subjects.filter((s) => s.name === "Integrated Science");
  for (const stream of streams) {
    const maths = mathsSubjects.find((s) => s.class_id === stream.class_id);
    if (maths) await supabase.from("teacher_subjects").insert({ teacher_id: teacherStaff.id, subject_id: maths.id, stream_id: stream.id, term_id: term2.id });
    const science = scienceSubjects.find((s) => s.class_id === stream.class_id);
    if (science) await supabase.from("teacher_subjects").insert({ teacher_id: hodStaff.id, subject_id: science.id, stream_id: stream.id, term_id: term2.id });
  }

  // 7. Students + guardian
  // Parent's profile must exist BEFORE the guardian row, since guardians.profile_id has a foreign key to profiles(id).
  const { error: parentProfileError } = await supabase
    .from("profiles")
    .insert({ id: parentUser.id, school_id: school.id, role: "parent", first_name: "Alice", last_name: "Mwangi", phone: "+254722000001" });
  if (parentProfileError) throw parentProfileError;

  const { data: guardian, error: guardianError } = await supabase
    .from("guardians")
    .insert({ profile_id: parentUser.id, full_name: "Alice Mwangi", phone_primary: "+254722000001", email: "parent@greenfield.ac.ke", relationship: "Mother", occupation: "Nurse", residence: "Nairobi" })
    .select()
    .single();
  if (guardianError) throw guardianError;

  await supabase.from("profiles").update({ guardian_id: guardian.id }).eq("id", parentUser.id);

  const grade9East = streams.find((s) => s.class.name === "Grade 9" && s.name === "East");
  const studentNames = [
    ["Faith", "Mwangi"], ["Brian", "Kiptoo"], ["Diana", "Njoroge"], ["Kevin", "Omondi"], ["Sharon", "Cheruiyot"],
  ];
  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const [first, last] = studentNames[i];
    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert({
        school_id: school.id,
        admission_number: `ADM${1000 + i}`,
        first_name: first,
        last_name: last,
        gender: i % 2 === 0 ? "Female" : "Male",
        stream_id: grade9East.id,
        class_id: grade9East.class_id,
        status: "Active",
        boarding_status: "Day Scholar",
      })
      .select()
      .single();
    if (studentError) throw studentError;
    students.push(student);
  }

  // Link the parent's own child (Faith Mwangi) to their guardian record
  await supabase.from("student_guardians").insert({ student_id: students[0].id, guardian_id: guardian.id, is_primary: true, fee_payer: true });

  // 8. Fee structure for the current term
  const feeItems = [
    { fee_category: "Tuition", amount: 15000 },
    { fee_category: "Activity", amount: 2000 },
    { fee_category: "Exam Fee", amount: 1500 },
  ];
  for (const klass of classes) {
    for (const item of feeItems) {
      await supabase.from("fee_structure").insert({ class_id: klass.id, term_id: term2.id, ...item, is_mandatory: true });
    }
  }

  // A partial payment for the parent's child, so the fees page has something to show
  await supabase.from("fee_payments").insert({
    student_id: students[0].id,
    term_id: term2.id,
    amount: 10000,
    payment_method: "M-Pesa",
    fee_category: "Tuition",
    status: "Confirmed",
  });

  // 9. Attendance for the last 5 school days
  const today = new Date();
  for (let d = 0; d < 5; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);
    for (const student of students) {
      await supabase.from("attendance").insert({
        student_id: student.id,
        date: dateStr,
        status: d === 2 && student.id === students[1].id ? "Absent" : "Present",
        recorded_by: teacherStaff.id,
      });
    }
  }

  // 10. A sample exam with results
  const { data: exam } = await supabase
    .from("exams")
    .insert({ school_id: school.id, name: "Term 2 CAT 1", exam_type: "CAT 1", class_id: grade9East.class_id, term_id: term2.id, out_of: 100, status: "Results Released" })
    .select()
    .single();

  const grade9Subjects = subjects.filter((s) => s.class_id === grade9East.class_id);
  for (const student of students) {
    for (const subj of grade9Subjects) {
      const marks = 40 + Math.floor(Math.random() * 55);
      await supabase.from("exam_results").insert({
        student_id: student.id,
        exam_id: exam.id,
        subject_id: subj.id,
        marks_obtained: marks,
        entered_by: teacherStaff.id,
      });
    }
  }

  console.log("\nSeed complete! Demo login accounts (password: password123):");
  console.log("  Principal: principal@greenfield.ac.ke");
  console.log("  Teacher:   teacher@greenfield.ac.ke");
  console.log("  HOD:       hod@greenfield.ac.ke");
  console.log("  Bursar:    bursar@greenfield.ac.ke");
  console.log("  Parent:    parent@greenfield.ac.ke");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
