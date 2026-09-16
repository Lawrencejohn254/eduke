import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/lib/get-profile";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/Loaders";
import LinkGuardianInline from "./LinkGuardianInline";
import ReportCardGenerator from "./ReportCardGenerator";
import { ArrowLeft, User, Users, Award, Wallet, CalendarCheck, GraduationCap, FileText } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { formatKES, formatDateDMY, gradeFromMarks } from "@/lib/format";
import DisciplinaryNotes from "@/components/DisciplinaryNotes";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getProfileOrRedirect();
  const { id } = await params;
  const supabase = await createClient();
  const canSeeFees = ["principal", "deputy_principal", "bursar", "super_admin"].includes(profile.role);
  const canManage = ["principal", "deputy_principal", "hod", "teacher", "super_admin"].includes(profile.role);
  // NEW: only Principal/Admin can link a staff (teacher) account as a guardian.
  // This is a UI convenience only — the real enforcement is server-side, in
  // Supabase's admin_add_staff_guardian_link / admin_verify_guardian_link /
  // admin_unlink_guardian RPCs, which independently re-check the caller's role.
  const canLinkStaff = ["principal", "deputy_principal", "super_admin"].includes(profile.role);

  const { data: student } = await supabase
    .from("students")
    .select(
      "*, class:classes(name), stream:streams(name)"
    )
    .eq("id", id)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (!student) notFound();

  const klass = student.class as unknown as { name: string } | null;
  const stream = student.stream as unknown as { name: string } | null;

  // Note: guardian data is no longer fetched here. LinkGuardianInline owns
  // its own fetch (list + add + unlink) so there's a single source of truth
  // for this section instead of two renderers showing the same data.

  const { data: examResults } = await supabase
    .from("exam_results")
    .select("marks_obtained, grade, teacher_comment, subject:subjects(name), exam:exams(id, name, start_date)")
    .eq("student_id", id)
    .order("id", { ascending: false });

  const resultsByExam = new Map<string, { name: string; date: string | null; rows: typeof examResults }>();
  for (const r of examResults ?? []) {
    const exam = r.exam as unknown as { id: string; name: string; start_date: string | null } | null;
    if (!exam) continue;
    if (!resultsByExam.has(exam.id)) resultsByExam.set(exam.id, { name: exam.name, date: exam.start_date, rows: [] });
    resultsByExam.get(exam.id)!.rows!.push(r);
  }

  const allMarks = (examResults ?? []).map((r) => r.marks_obtained).filter((m): m is number => m !== null);
  const overallAverage = allMarks.length ? Math.round((allMarks.reduce((a, b) => a + b, 0) / allMarks.length) * 10) / 10 : null;

  const { data: currentTermForExams } = await supabase.from("terms").select("id").eq("is_current", true).maybeSingle();

  const { data: examsForClass } = await supabase
    .from("exams")
    .select("id, name")
    .eq("class_id", student.class_id)
    .eq("term_id", currentTermForExams?.id ?? "")
    .order("start_date", { ascending: false });

  let feeSection = null;
  if (canSeeFees) {
    const { data: currentTerm } = await supabase.from("terms").select("id, term_number").eq("is_current", true).maybeSingle();
    let balance = null;
    if (currentTerm && student.class_id) {
      const { data: structure } = await supabase.from("fee_structure").select("amount").eq("term_id", currentTerm.id).eq("class_id", student.class_id);
      const expected = (structure ?? []).reduce((s, f) => s + Number(f.amount), 0);
      const { data: payments } = await supabase.from("fee_payments").select("amount").eq("student_id", id).eq("term_id", currentTerm.id).eq("status", "Confirmed");
      const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
      balance = expected + Number(student.balance_brought_forward ?? 0) - paid;
    }
    const { data: paymentHistory } = await supabase
      .from("fee_payments")
      .select("id, amount, payment_method, receipt_number, payment_date, status")
      .eq("student_id", id)
      .order("payment_date", { ascending: false })
      .limit(10);

    feeSection = { balance, paymentHistory: paymentHistory ?? [], broughtForward: Number(student.balance_brought_forward ?? 0) };
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: attendanceRows } = await supabase
    .from("attendance")
    .select("status")
    .eq("student_id", id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10));
  const present = (attendanceRows ?? []).filter((a) => a.status === "Present").length;
  const attendanceRate = attendanceRows && attendanceRows.length ? Math.round((present / attendanceRows.length) * 100) : null;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/students" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-eduke-green w-fit">
        <ArrowLeft size={15} /> Back to Students
      </Link>

      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{student.first_name} {student.last_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {student.admission_number} · {klass?.name ?? "-"} {stream?.name ?? ""} · {student.gender}
          </p>
        </div>
        <StatusBadge status={student.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Overall Average</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{overallAverage !== null ? `${overallAverage}%` : "-"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Attendance (30 days)</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{attendanceRate !== null ? `${attendanceRate}%` : "-"}</p>
        </div>
        {canSeeFees && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 col-span-2 md:col-span-1">
            <p className="text-xs text-gray-500">Fee Balance</p>
            <p className={`text-xl font-bold mt-1 ${feeSection && feeSection.balance !== null && feeSection.balance > 0 ? "text-red-600" : "text-eduke-green"}`}>
              {feeSection?.balance !== null && feeSection?.balance !== undefined ? formatKES(feeSection.balance) : "-"}
            </p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Boarding Status</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{student.boarding_status ?? "-"}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> Personal Information</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">Date of Birth</p><p className="font-medium">{formatDateDMY(student.date_of_birth)}</p></div>
          <div><p className="text-xs text-gray-500">Enrollment Date</p><p className="font-medium">{formatDateDMY(student.enrollment_date)}</p></div>
          <div><p className="text-xs text-gray-500">Special Needs</p><p className="font-medium">{student.special_needs ?? "None"}</p></div>
          <div><p className="text-xs text-gray-500">Previous School</p><p className="font-medium">{student.previous_school ?? "-"}</p></div>
          <div><p className="text-xs text-gray-500">KCPE Index</p><p className="font-medium">{student.kcpe_index ?? "-"}</p></div>
          <div><p className="text-xs text-gray-500">NEMIS Number</p><p className="font-medium">{student.nemis_id ?? "-"}</p></div>
        </div>
        {student.medical_notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Medical Notes</p>
            <p className="text-sm mt-0.5">{student.medical_notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Users size={16} /> Parent / Guardian</p>
        <LinkGuardianInline studentId={id} canEdit={canSeeFees} canLinkStaff={canLinkStaff} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Award size={16} /> Exam Results</p>
        {resultsByExam.size === 0 ? (
          <EmptyState title="No results yet" description="Exam results will appear here once entered." />
        ) : (
          <div className="space-y-4">
            {Array.from(resultsByExam.values()).map((group) => (
              <div key={group.name}>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">{group.name} {group.date ? `· ${formatDateDMY(group.date)}` : ""}</p>
                <div className="space-y-1">
                  {group.rows!.map((r, i) => {
                    const subject = r.subject as unknown as { name: string } | null;
                    return (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-1 last:border-0">
                        <span className="text-gray-700">{subject?.name}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-gray-500">{r.marks_obtained ?? "-"}</span>
                          <span className="badge badge-blue">{r.grade ?? gradeFromMarks(r.marks_obtained).grade}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><FileText size={16} /> Report Card</p>
          <ReportCardGenerator studentId={id} exams={examsForClass ?? []} />
        </div>
      )}

      {canSeeFees && feeSection && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Wallet size={16} /> Fees
          </p>

          {feeSection.broughtForward !== 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Brought forward from previous term:{" "}
              <strong
                className={
                  feeSection.broughtForward > 0
                    ? "text-red-600"
                    : "text-eduke-green"
                }
              >
                {formatKES(feeSection.broughtForward)}
              </strong>
            </p>
          )}

          {feeSection.paymentHistory.length === 0 ? (
            <p className="text-sm text-gray-400">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {feeSection.paymentHistory.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between text-sm border-b border-gray-50 pb-1.5 last:border-0"
                >
                  <span className="text-gray-600 font-mono text-xs">
                    {p.receipt_number}
                  </span>

                  <span className="text-gray-700">
                    {p.payment_method}
                  </span>

                  <span className="text-gray-500 text-xs">
                    {formatDateDMY(p.payment_date)}
                  </span>

                  <span className="font-semibold">
                    {formatKES(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISCIPLINARY & CASE MANAGEMENT */}

      <DisciplinaryNotes
        schoolId={profile.school_id}
        profileId={profile.id}
        role={profile.role}
        targetType="student"
        targetId={student.id}
      />

      {/* CLASS & STREAM */}

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <GraduationCap size={16} /> Class &amp; Stream
        </p>

        <p className="text-sm text-gray-600">
          {klass?.name ?? "-"} {stream?.name ?? ""}
        </p>
    </div>
    </div>
  );
}