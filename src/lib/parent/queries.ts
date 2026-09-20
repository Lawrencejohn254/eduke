import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect, type Profile } from "@/lib/get-profile";
import { getChildrenForGuardian, type ChildOption } from "@/lib/get-children";
import { DEFAULT_TIMEZONE, formatDateTime, formatRelative, getSchoolClock, type SchoolClock } from "./time";
import type { CurriculumType, RawResultRow } from "./results";

/**
 * Every query here runs through the signed-in parent's own Supabase session, so Row Level Security
 * decides what comes back — nothing in this file uses the service-role client or widens access.
 * Wrapped in React cache() so the layout, page and notification bell never repeat a query in one request.
 */

/* ───────────────────────────── context ───────────────────────────── */

export type ParentContext = {
  profile: Profile;
  children: ChildOption[];
  activeChild: ChildOption | null;
};

const loadChildren = cache((guardianId: string | null) => getChildrenForGuardian(guardianId));

/** Profile + the parent's real linked children + the child selected via ?child= (defaults to the first). */
export async function getParentContext(childParam?: string): Promise<ParentContext> {
  const profile = await getProfileOrRedirect();
  const children = await loadChildren(profile.guardian_id);
  const activeChild = children.find((c) => c.id === childParam) ?? children[0] ?? null;
  return { profile, children, activeChild };
}

/* ───────────────────────────── school & term ───────────────────────────── */

export type SchoolInfo = { name: string; timezone: string; phone: string | null; email: string | null };

export const getSchoolInfo = cache(async (schoolId: string, fallbackName: string): Promise<SchoolInfo> => {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("name, timezone, phone, email").eq("id", schoolId).maybeSingle();
  const row = data as { name: string | null; timezone: string | null; phone: string | null; email: string | null } | null;
  return {
    name: row?.name || fallbackName,
    timezone: row?.timezone || DEFAULT_TIMEZONE,
    phone: row?.phone ?? null,
    email: row?.email ?? null,
  };
});

export type CurrentTerm = { id: string; termNumber: string; year: number | null; startDate: string | null; endDate: string | null };

export const getCurrentTerm = cache(async (): Promise<CurrentTerm | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terms")
    .select("id, term_number, start_date, end_date, academic_year:academic_years(year)")
    .eq("is_current", true)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    term_number: string;
    start_date: string | null;
    end_date: string | null;
    academic_year: { year: number } | null;
  };
  return { id: row.id, termNumber: row.term_number, year: row.academic_year?.year ?? null, startDate: row.start_date, endDate: row.end_date };
});

export async function getClock(schoolId: string, fallbackName: string): Promise<SchoolClock> {
  const school = await getSchoolInfo(schoolId, fallbackName);
  return getSchoolClock(school.timezone);
}

/* ───────────────────────────── results ───────────────────────────── */

export const getCurriculum = cache(async (classId: string | null): Promise<CurriculumType> => {
  if (!classId) return "8-4-4";
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("curriculum_type").eq("id", classId).maybeSingle();
  return (data as { curriculum_type: CurriculumType | null } | null)?.curriculum_type === "CBC" ? "CBC" : "8-4-4";
});

/**
 * Results for one child, restricted to exams the school has RELEASED.
 *
 * The exam_results RLS policy lets a guardian read every result row for their child (including exams
 * still being marked), so the release check has to happen here. `exams!inner` + the status filter
 * means an unreleased — or not-yet-visible — exam never reaches the parent's screen.
 */
export const getReleasedResults = cache(async (studentId: string): Promise<RawResultRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_results")
    .select(
      "exam_id, subject_id, marks_obtained, grade, teacher_comment, subject:subjects(name), exam:exams!inner(id, name, out_of, start_date, end_date, status, term:terms(id, term_number, academic_year:academic_years(id, year)))"
    )
    .eq("student_id", studentId)
    .eq("exam.status", "Results Released");
  return (data ?? []) as unknown as RawResultRow[];
});

export type TermRemark = { termId: string; classTeacherComment: string | null; principalComment: string | null };

export const getRemarks = cache(async (studentId: string): Promise<TermRemark[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_card_remarks")
    .select("term_id, class_teacher_comment, principal_comment")
    .eq("student_id", studentId);
  return ((data ?? []) as { term_id: string | null; class_teacher_comment: string | null; principal_comment: string | null }[])
    .filter((r): r is typeof r & { term_id: string } => Boolean(r.term_id))
    .map((r) => ({ termId: r.term_id, classTeacherComment: r.class_teacher_comment?.trim() || null, principalComment: r.principal_comment?.trim() || null }));
});

/** Class teacher's name via streams.class_teacher_id (parents can't read class_teacher_assignments). */
export const getClassTeacherName = cache(async (streamId: string | null): Promise<string | null> => {
  if (!streamId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("streams")
    .select("class_teacher:staff!class_teacher_id(first_name, last_name)")
    .eq("id", streamId)
    .maybeSingle();
  const t = (data as unknown as { class_teacher: { first_name: string; last_name: string } | null } | null)?.class_teacher;
  return t ? `${t.first_name} ${t.last_name}`.trim() : null;
});

/* ───────────────────────────── communications ───────────────────────────── */

export type CommunicationType =
  | "General Announcement"
  | "Attendance Alert"
  | "Fee Reminder"
  | "Academic Notice"
  | "Event/Meeting"
  | "Emergency Alert"
  | "School Closure"
  | "Custom Message";

export type CommunicationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  /** "school" = whole-school notice; "personal" = sent to a class, stream or your child */
  scope: "school" | "personal";
  audience: string;
  iso: string;
  relative: string;
  absolute: string;
  /** sent within the last 30 days — older items never show as "new" on a fresh device */
  recent: boolean;
};

const SENT_STATUSES = ["Sent", "Partially Failed"];

/**
 * What the school has actually sent to this parent.
 *
 * RLS already limits rows to communications targeted at the parent's school / children's classes /
 * streams / children. It does NOT hide drafts, scheduled or cancelled rows, so those are filtered here.
 */
export const getCommunications = cache(async (guardianId: string | null, schoolId: string, fallbackSchoolName: string): Promise<CommunicationItem[]> => {
  if (!guardianId) return [];
  const supabase = await createClient();

  const [{ data }, children, school] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, subject, message, communication_type, target_type, target_id, status, sent_at, created_at")
      .in("status", SENT_STATUSES)
      .eq("is_platform_broadcast", false)
      .order("created_at", { ascending: false })
      .limit(80),
    loadChildren(guardianId),
    getSchoolInfo(schoolId, fallbackSchoolName),
  ]);

  const nameById = new Map(children.map((c) => [c.id, c.first_name]));
  const now = new Date();
  const thirtyDaysMs = 30 * 86_400_000;

  const rows = (data ?? []) as {
    id: string;
    subject: string | null;
    message: string;
    communication_type: string;
    target_type: string | null;
    target_id: string | null;
    sent_at: string | null;
    created_at: string | null;
  }[];

  return rows
    .map((n): CommunicationItem => {
      const iso = n.sent_at ?? n.created_at ?? new Date(0).toISOString();
      const isSchool = n.target_type === "school" || !n.target_type;
      let audience = "Whole school";
      if (n.target_type === "class") audience = "Your child's class";
      else if (n.target_type === "stream") audience = "Your child's stream";
      else if (n.target_type === "student") audience = nameById.get(n.target_id ?? "") ? `For ${nameById.get(n.target_id ?? "")}` : "For your child";

      return {
        id: n.id,
        title: n.subject?.trim() || n.communication_type,
        message: n.message,
        type: n.communication_type,
        scope: isSchool ? "school" : "personal",
        audience,
        iso,
        relative: formatRelative(iso, school.timezone, now),
        absolute: formatDateTime(iso, school.timezone),
        recent: now.getTime() - new Date(iso).getTime() <= thirtyDaysMs,
      };
    })
    .sort((a, b) => b.iso.localeCompare(a.iso));
});

/* ───────────────────────────── attendance ───────────────────────────── */

export type AttendanceRecord = { date: string; status: string; notes: string | null };

export const getAttendanceBetween = cache(async (studentId: string, fromDate: string, toDate: string | null): Promise<AttendanceRecord[]> => {
  const supabase = await createClient();
  let q = supabase.from("attendance").select("date, status, notes").eq("student_id", studentId).gte("date", fromDate);
  if (toDate) q = q.lte("date", toDate);
  const { data } = await q.order("date", { ascending: true });
  return (data ?? []) as AttendanceRecord[];
});

/* ───────────────────────────── exams & lessons ───────────────────────────── */

export type UpcomingExam = { id: string; name: string; startDate: string | null; endDate: string | null; status: string };

/** Exams for the child's class that haven't finished marking yet. RLS limits this to the parent's children's classes. */
export const getUpcomingExams = cache(async (classId: string | null, todayKey: string): Promise<UpcomingExam[]> => {
  if (!classId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, status")
    .eq("class_id", classId)
    .in("status", ["Upcoming", "Ongoing"])
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(20);
  return ((data ?? []) as { id: string; name: string; start_date: string | null; end_date: string | null; status: string }[])
    .filter((e) => !e.end_date || e.end_date >= todayKey)
    .slice(0, 4)
    .map((e) => ({ id: e.id, name: e.name, startDate: e.start_date, endDate: e.end_date, status: e.status }));
});

export type Lesson = {
  id: string;
  title: string;
  description: string | null;
  day: number;
  start: string;
  end: string;
  room: string | null;
  color: string | null;
  teacher: string | null;
};

type SlotRow = {
  id: string;
  title: string;
  description: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  color: string | null;
  teacher: { first_name: string; last_name: string } | null;
};

const toLesson = (r: SlotRow): Lesson => ({
  id: r.id,
  title: r.title,
  description: r.description,
  day: r.day_of_week,
  start: r.start_time,
  end: r.end_time,
  room: r.room,
  color: r.color,
  teacher: r.teacher ? `${r.teacher.first_name} ${r.teacher.last_name}`.trim() : null,
});

const SLOT_SELECT = "id, title, description, day_of_week, start_time, end_time, room, color, teacher:staff(first_name, last_name)";

/** The stream's whole weekly timetable. */
export const getWeekLessons = cache(async (streamId: string | null): Promise<Lesson[]> => {
  if (!streamId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("timetable_slots")
    .select(SLOT_SELECT)
    .eq("stream_id", streamId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  return ((data ?? []) as unknown as SlotRow[]).map(toLesson);
});

/* ───────────────────────────── fees ───────────────────────────── */

export type PaymentRow = {
  id: string;
  date: string;
  amount: number;
  method: string | null;
  status: "Confirmed" | "Pending" | "Failed";
  category: string | null;
  receiptNumber: string | null;
  reference: string | null;
  termLabel: string | null;
  notes: string | null;
};

export const getPayments = cache(async (studentId: string, limit = 50): Promise<PaymentRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fee_payments")
    .select("id, amount, payment_method, payment_date, fee_category, receipt_number, mpesa_reference, notes, status, term:terms(term_number, academic_year:academic_years(year))")
    .eq("student_id", studentId)
    .order("payment_date", { ascending: false })
    .limit(limit);

  return ((data ?? []) as unknown as {
    id: string;
    amount: number | string;
    payment_method: string | null;
    payment_date: string;
    fee_category: string | null;
    receipt_number: string | null;
    mpesa_reference: string | null;
    notes: string | null;
    status: PaymentRow["status"];
    term: { term_number: string; academic_year: { year: number } | null } | null;
  }[]).map((p) => ({
    id: p.id,
    date: p.payment_date,
    amount: Number(p.amount),
    method: p.payment_method,
    status: p.status,
    category: p.fee_category,
    receiptNumber: p.receipt_number,
    reference: p.mpesa_reference,
    termLabel: p.term ? `${p.term.term_number}${p.term.academic_year ? ` ${p.term.academic_year.year}` : ""}` : null,
    notes: p.notes,
  }));
});
