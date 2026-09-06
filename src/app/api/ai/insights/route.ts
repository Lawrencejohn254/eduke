import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInsight, GroqRateLimitError, GroqError } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  let dataContext = "";
  let roleLabel = profile.role;

  try {
    if (["principal", "deputy_principal", "super_admin"].includes(profile.role)) {
      const [academic, finance, attendance] = await Promise.all([
        buildAcademicSummary(supabase, profile.school_id),
        buildFinanceSummary(supabase, profile.school_id),
        buildAttendanceSummary(supabase, profile.school_id),
      ]);
      dataContext = `${academic}\n\n${finance}\n\n${attendance}`;
      roleLabel = "Principal/Admin";
    } else if (profile.role === "hod") {
      dataContext = await buildAcademicSummary(supabase, profile.school_id);
      roleLabel = "Head of Department";
    } else if (profile.role === "bursar") {
      dataContext = await buildFinanceSummary(supabase, profile.school_id);
      roleLabel = "Bursar";
    } else if (profile.role === "teacher") {
      if (!profile.staff_id) {
        return NextResponse.json({ error: "Your account isn't linked to a staff record yet." }, { status: 400 });
      }
      dataContext = await buildTeacherSummary(supabase, profile.staff_id);
      roleLabel = "Teacher";
    } else {
      return NextResponse.json({ error: "AI Insights isn't available for your role yet." }, { status: 403 });
    }

    if (!dataContext.trim()) {
      dataContext = "No data is available yet (no results, payments, or assignments recorded).";
    }

    const answer = await generateInsight({ question, dataContext, roleLabel });
    return NextResponse.json({ answer, dataContext });
  } catch (e) {
    if (e instanceof GroqRateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof GroqError) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ error: "Something went wrong generating that insight." }, { status: 500 });
  }
}

// ---------- Data-gathering helpers (real numbers, computed server-side) ----------

async function buildAcademicSummary(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string): Promise<string> {
  const { data: results } = await supabase
    .from("exam_results")
    .select(
      "marks_obtained, subject:subjects(id, name), student:students!inner(id, first_name, last_name, class_id, stream_id, school_id, class:classes(name))"
    )
    .eq("student.school_id", schoolId);

  type Row = {
    marks_obtained: number | null;
    subject: { id: string; name: string } | null;
    student: { id: string; first_name: string; last_name: string; stream_id: string | null; class: { name: string } | null } | null;
  };
  const rows = (results ?? []) as unknown as Row[];

  const byStudent = new Map<string, { name: string; className: string; sum: number; count: number }>();
  const bySubject = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    if (r.marks_obtained === null || !r.student) continue;
    const sKey = r.student.id;
    const sEntry = byStudent.get(sKey) ?? { name: `${r.student.first_name} ${r.student.last_name}`, className: r.student.class?.name ?? "-", sum: 0, count: 0 };
    sEntry.sum += Number(r.marks_obtained);
    sEntry.count += 1;
    byStudent.set(sKey, sEntry);

    if (r.subject) {
      const subjEntry = bySubject.get(r.subject.name) ?? { sum: 0, count: 0 };
      subjEntry.sum += Number(r.marks_obtained);
      subjEntry.count += 1;
      bySubject.set(r.subject.name, subjEntry);
    }
  }

  const studentRankings = Array.from(byStudent.values())
    .map((s) => ({ ...s, average: Math.round((s.sum / s.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average);
  const top5 = studentRankings.slice(0, 5);
  const bottom5 = [...studentRankings].sort((a, b) => a.average - b.average).slice(0, 5);
  const subjectAverages = Array.from(bySubject.entries())
    .map(([name, v]) => ({ name, average: Math.round((v.sum / v.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average);

  // Teacher performance (via teacher_subjects assignments matched to results)
  const { data: staffRows } = await supabase.from("staff").select("id").eq("school_id", schoolId);
  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select("teacher_id, subject_id, stream_id, teacher:staff(first_name, last_name), subject:subjects(name)")
    .in("teacher_id", (staffRows ?? []).map((s) => s.id));

  const byTeacher = new Map<string, { name: string; sum: number; count: number }>();
  for (const a of assignments ?? []) {
    const teacher = a.teacher as unknown as { first_name: string; last_name: string } | null;
    const subject = a.subject as unknown as { name: string } | null;
    if (!teacher || !subject) continue;
    const matching = rows.filter((r) => r.subject?.name === subject.name && r.student?.stream_id === a.stream_id && r.marks_obtained !== null);
    if (matching.length === 0) continue;
    const key = `${teacher.first_name} ${teacher.last_name}`;
    const entry = byTeacher.get(key) ?? { name: key, sum: 0, count: 0 };
    for (const m of matching) entry.sum += Number(m.marks_obtained);
    entry.count += matching.length;
    byTeacher.set(key, entry);
  }
  const teacherRankings = Array.from(byTeacher.values())
    .map((t) => ({ name: t.name, average: Math.round((t.sum / t.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average);

  const lines: string[] = [];
  lines.push(`TOP 5 STUDENTS (by average marks across all exams):`);
  top5.forEach((s, i) => lines.push(`${i + 1}. ${s.name} (${s.className}) — ${s.average}%`));
  lines.push(``, `BOTTOM 5 STUDENTS (may need support):`);
  bottom5.forEach((s, i) => lines.push(`${i + 1}. ${s.name} (${s.className}) — ${s.average}%`));
  lines.push(``, `SUBJECT AVERAGES (school-wide):`);
  subjectAverages.forEach((s) => lines.push(`- ${s.name}: ${s.average}%`));
  lines.push(``, `TEACHER PERFORMANCE (average marks of students they teach):`);
  teacherRankings.forEach((t) => lines.push(`- ${t.name}: ${t.average}%`));

  return lines.join("\n");
}

async function buildFinanceSummary(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string): Promise<string> {
  const { data: currentTerm } = await supabase.from("terms").select("id, term_number").eq("is_current", true).maybeSingle();
  if (!currentTerm) return "No current term is set, so fee balances cannot be computed.";

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_number, class_id, balance_brought_forward, class:classes(id, name)")
    .eq("school_id", schoolId)
    .eq("status", "Active");

  const { data: structure } = await supabase
    .from("fee_structure")
    .select("class_id, amount, class:classes!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("class.school_id", schoolId);
  const expectedByClass = new Map<string, number>();
  for (const f of structure ?? []) expectedByClass.set(f.class_id, (expectedByClass.get(f.class_id) ?? 0) + Number(f.amount));

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("student_id, amount, student:students!inner(school_id)")
    .eq("term_id", currentTerm.id)
    .eq("status", "Confirmed")
    .eq("student.school_id", schoolId);
  const paidByStudent = new Map<string, number>();
  for (const p of payments ?? []) paidByStudent.set(p.student_id, (paidByStudent.get(p.student_id) ?? 0) + Number(p.amount));

  const balances = (students ?? []).map((s) => {
    const klass = s.class as unknown as { id: string; name: string } | null;
    const expected = klass ? expectedByClass.get(klass.id) ?? 0 : 0;
    const paid = paidByStudent.get(s.id) ?? 0;
    const broughtForward = Number(s.balance_brought_forward ?? 0);
    return {
      name: `${s.first_name} ${s.last_name} (${s.admission_number})`,
      className: klass?.name ?? "-",
      balance: expected + broughtForward - paid,
    };
  });

  const defaulters = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const totalOutstanding = defaulters.reduce((s, d) => s + d.balance, 0);
  const totalCollected = Array.from(paidByStudent.values()).reduce((s, v) => s + v, 0);

  const lines: string[] = [];
  lines.push(`CURRENT TERM: ${currentTerm.term_number}`);
  lines.push(`TOTAL COLLECTED THIS TERM: KES ${totalCollected.toLocaleString()}`);
  lines.push(`TOTAL OUTSTANDING (all defaulters): KES ${totalOutstanding.toLocaleString()}`);
  lines.push(`NUMBER OF DEFAULTERS: ${defaulters.length} out of ${balances.length} active students`);
  lines.push(``, `TOP 10 HIGHEST OUTSTANDING BALANCES:`);
  defaulters.slice(0, 10).forEach((d, i) => lines.push(`${i + 1}. ${d.name} — ${d.className} — KES ${d.balance.toLocaleString()}`));

  return lines.join("\n");
}

async function buildAttendanceSummary(supabase: Awaited<ReturnType<typeof createClient>>, schoolId: string): Promise<string> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: rows } = await supabase
    .from("attendance")
    .select("status, date, student:students!inner(school_id, class_id, class:classes(name))")
    .eq("student.school_id", schoolId)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));

  type Row = { status: string; student: { class: { name: string } | null } | null };
  const typed = (rows ?? []) as unknown as Row[];

  if (typed.length === 0) return "ATTENDANCE (last 30 days): No attendance records yet.";

  const overallPresent = typed.filter((r) => r.status === "Present").length;
  const overallRate = Math.round((overallPresent / typed.length) * 1000) / 10;

  const byClass = new Map<string, { present: number; total: number }>();
  for (const r of typed) {
    const className = r.student?.class?.name ?? "Unknown";
    const entry = byClass.get(className) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (r.status === "Present") entry.present += 1;
    byClass.set(className, entry);
  }
  const classRates = Array.from(byClass.entries())
    .map(([name, v]) => ({ name, rate: Math.round((v.present / v.total) * 1000) / 10 }))
    .sort((a, b) => a.rate - b.rate);

  const lines: string[] = [];
  lines.push(`ATTENDANCE (last 30 days, school-wide): ${overallRate}% present.`);
  lines.push(`BY CLASS (lowest attendance first):`);
  classRates.forEach((c) => lines.push(`- ${c.name}: ${c.rate}%`));

  return lines.join("\n");
}

async function buildTeacherSummary(supabase: Awaited<ReturnType<typeof createClient>>, staffId: string): Promise<string> {
  const { data: assignments } = await supabase
    .from("teacher_subjects")
    .select("subject_id, stream_id, subject:subjects(name), stream:streams(name, class:classes(name))")
    .eq("teacher_id", staffId);

  if (!assignments || assignments.length === 0) {
    return "This teacher has no assigned subjects/streams yet (via 'My Classes').";
  }

  const lines: string[] = [];
  for (const a of assignments) {
    const subject = a.subject as unknown as { name: string } | null;
    const stream = a.stream as unknown as { name: string; class: { name: string } | null } | null;
    if (!subject || !stream) continue;

    const { data: results } = await supabase
      .from("exam_results")
      .select("marks_obtained, student:students!inner(first_name, last_name, stream_id)")
      .eq("subject_id", a.subject_id)
      .eq("student.stream_id", a.stream_id);

    type Row = { marks_obtained: number | null; student: { first_name: string; last_name: string } | null };
    const rows = (results ?? []) as unknown as Row[];
    const withMarks = rows.filter((r) => r.marks_obtained !== null && r.student);
    if (withMarks.length === 0) {
      lines.push(`${subject.name} — ${stream.class?.name} ${stream.name}: no results recorded yet.`);
      continue;
    }
    const ranked = withMarks
      .map((r) => ({ name: `${r.student!.first_name} ${r.student!.last_name}`, marks: Number(r.marks_obtained) }))
      .sort((a, b) => b.marks - a.marks);
    const avg = Math.round((ranked.reduce((s, r) => s + r.marks, 0) / ranked.length) * 10) / 10;

    lines.push(``, `${subject.name} — ${stream.class?.name} ${stream.name} (class average: ${avg}%):`);
    lines.push(`Top performers: ${ranked.slice(0, 3).map((r) => `${r.name} (${r.marks}%)`).join(", ")}`);
    lines.push(`Struggling students: ${ranked.slice(-3).reverse().map((r) => `${r.name} (${r.marks}%)`).join(", ")}`);
  }

  return lines.join("\n");
}
