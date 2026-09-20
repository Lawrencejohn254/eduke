import Link from "next/link";
import { CalendarCheck, CalendarClock, Megaphone, MessageSquare, Award, Wallet, ClipboardList } from "lucide-react";
import EmptyState from "@/components/parent/EmptyState";
import StudentPlate from "@/components/parent/StudentPlate";
import { GradeBadge, Ledger, LedgerItem, PageHeader, Panel, StatusPill } from "@/components/parent/ui";
import { withChild } from "@/components/parent/nav";
import { iconForCommunication } from "@/components/parent/commIcons";
import { createClient } from "@/lib/supabase/server";
import { getFeeSummary } from "@/lib/parent/fees";
import { formatKSh } from "@/lib/parent/money";
import { summarizeAttendance, attendanceTone } from "@/lib/parent/attendance";
import { buildYearReports, latestTerm } from "@/lib/parent/results";
import {
  getAttendanceBetween,
  getCommunications,
  getCurrentTerm,
  getCurriculum,
  getParentContext,
  getPayments,
  getReleasedResults,
  getSchoolInfo,
  getUpcomingExams,
  getWeekLessons,
} from "@/lib/parent/queries";
import { formatClock, formatDayMonth, formatWeekdayDayMonth, getSchoolClock, shiftDateKey, timeToMinutes, toDateKey } from "@/lib/parent/time";

type Activity = { key: string; date: string; text: string; icon: typeof Award; href: string };

export default async function ParentDashboardPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const params = await searchParams;
  const { profile, children, activeChild } = await getParentContext(params.child);

  if (!activeChild) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Welcome${profile.first_name ? `, ${profile.first_name}` : ""}`} description="Your parent dashboard will fill in once a child is linked to your account." />
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const supabase = await createClient();
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");
  const clock = getSchoolClock(school.timezone);
  const from30 = shiftDateKey(clock.dateKey, -30);
  const child = activeChild;
  const childHref = (path: string) => withChild(path, child.id);

  const term = await getCurrentTerm();
  const [feeResult, rawResults, curriculum, attendance, upcoming, week, communications, payments] = await Promise.all([
    getFeeSummary(supabase, { studentId: child.id, classId: child.class_id, termId: term?.id ?? null }),
    getReleasedResults(child.id),
    getCurriculum(child.class_id),
    getAttendanceBetween(child.id, from30, null),
    getUpcomingExams(child.class_id, clock.dateKey),
    getWeekLessons(child.stream_id),
    getCommunications(profile.guardian_id, profile.school_id, school.name),
    getPayments(child.id, 6),
  ]);

  const fees = feeResult.summary;
  const years = buildYearReports(rawResults, curriculum);
  const latest = latestTerm(years);
  const att = summarizeAttendance(attendance);
  const attTone = attendanceTone(att.rate);
  const termLabel = term ? `${term.termNumber}${term.year ? ` ${term.year}` : ""}` : null;

  const recentResults = latest ? [...latest.term.view.subjects].filter((s) => s.averagePct !== null).sort((a, b) => (b.averagePct ?? 0) - (a.averagePct ?? 0)).slice(0, 6) : [];

  const todaysLessons = week.filter((l) => l.day === clock.weekday);
  const lessonState = (start: string, end: string) => {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    return clock.minutes >= e ? "done" : clock.minutes >= s ? "now" : "later";
  };
  const nextUp = todaysLessons.find((l) => lessonState(l.start, l.end) === "later");

  /* Recent activity — assembled only from real records */
  const activity: Activity[] = [];
  const seenExams = new Set<string>();
  for (const r of rawResults) {
    if (!r.exam || seenExams.has(r.exam.id)) continue;
    seenExams.add(r.exam.id);
    const d = r.exam.end_date ?? r.exam.start_date;
    if (d) activity.push({ key: `exam-${r.exam.id}`, date: d, text: `${r.exam.name} results are available`, icon: Award, href: childHref("/parent/results") });
  }
  for (const p of payments.filter((p) => p.status === "Confirmed")) {
    activity.push({ key: `pay-${p.id}`, date: p.date.slice(0, 10), text: `Payment of ${formatKSh(p.amount)} received`, icon: Wallet, href: childHref("/parent/fees") });
  }
  for (const a of attendance.filter((a) => a.status === "Absent" || a.status === "Late")) {
    activity.push({ key: `att-${a.date}`, date: a.date, text: `${child.first_name} was marked ${a.status.toLowerCase()}`, icon: CalendarCheck, href: childHref("/parent/attendance") });
  }
  for (const c of communications.slice(0, 5)) {
    activity.push({ key: `msg-${c.id}`, date: toDateKey(c.iso, school.timezone), text: c.title, icon: iconForCommunication(c.type), href: c.scope === "school" ? "/parent/notices" : "/parent/messages" });
  }
  activity.sort((a, b) => b.date.localeCompare(a.date));
  const recentActivity = activity.slice(0, 6);

  const feeNote =
    fees.status === "none"
      ? "No fees set for this term yet"
      : fees.status === "paid"
        ? fees.credit > 0
          ? `Fully paid · ${formatKSh(fees.credit)} credit`
          : "Fully paid for this term"
        : `${formatKSh(fees.paid)} paid of ${formatKSh(fees.totalDue)}`;

  const meta = [termLabel, latest ? `${latest.term.view.subjects.length} subjects` : null, child.admission_number ? `Adm. no. ${child.admission_number}` : null].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${clock.greeting}, ${profile.first_name ?? "Parent"}`}
        description={`Here's a quick look at how ${child.first_name} is doing${termLabel ? ` in ${termLabel}` : ""}.`}
      />

      <StudentPlate child={child} allChildren={children} schoolName={school.name} variant="hero" meta={meta} />

      <Ledger cols={3}>
        <LedgerItem
          icon={Award}
          label={latest ? `Average · ${latest.term.termLabel}` : "Average"}
          href={childHref("/parent/results")}
          value={latest?.term.view.averagePct != null ? `${latest.term.view.averagePct}%` : "–"}
          aside={latest?.term.view.averageGrade ? <GradeBadge grade={latest.term.view.averageGrade} /> : undefined}
          note={latest ? `Across ${latest.term.view.subjects.length} subjects` : "No published results yet"}
        />
        <LedgerItem
          icon={CalendarCheck}
          label="Attendance · last 30 days"
          href={childHref("/parent/attendance")}
          value={att.rate !== null ? `${att.rate}%` : "–"}
          tone={attTone === "good" ? "good" : attTone === "watch" ? "warn" : attTone === "concern" ? "danger" : "default"}
          note={att.total ? `${att.present} present · ${att.absent} absent · ${att.late} late` : "No attendance recorded yet"}
        />
        <LedgerItem
          icon={Wallet}
          label="Fee balance"
          href={childHref("/parent/fees")}
          value={fees.status === "none" ? "–" : formatKSh(fees.outstanding)}
          tone={fees.status === "paid" ? "good" : fees.outstanding > 0 ? "warn" : "default"}
          note={feeNote}
        />
      </Ledger>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Panel title="Recent results" description={latest ? `${latest.term.termLabel} ${latest.year.year}` : undefined} action={{ href: childHref("/parent/results"), label: "Full report" }} bodyClassName="p-0">
            {recentResults.length === 0 ? (
              <div className="p-4">
                <EmptyState kind="results" compact />
              </div>
            ) : (
              <ul className="divide-y divide-pp-rule">
                {recentResults.map((s) => (
                  <li key={s.subjectId} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{s.name}</span>
                    <span className="pp-num w-14 text-right text-[0.9375rem] text-pp-muted">{s.averagePct}%</span>
                    <span className="w-12 text-right">
                      <GradeBadge grade={s.grade} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent activity" bodyClassName="p-0">
            {recentActivity.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.875rem] text-pp-muted">Updates about {child.first_name} will show up here.</p>
            ) : (
              <ol className="divide-y divide-pp-rule">
                {recentActivity.map((a) => {
                  const Icon = a.icon;
                  return (
                    <li key={a.key}>
                      <Link href={a.href} className="flex items-center gap-3 px-4 py-3 hover:bg-pp-sunken sm:px-5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pp-green-tint text-pp-green">
                          <Icon size={16} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[0.875rem]">{a.text}</span>
                        <span className="shrink-0 text-[0.8125rem] text-pp-muted">{formatDayMonth(a.date)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Up next" bodyClassName="p-0">
            <div className="divide-y divide-pp-rule">
              <div className="px-4 py-3.5 sm:px-5">
                <h3 className="mb-2.5 flex items-center gap-2 text-[0.8125rem] font-semibold text-pp-muted">
                  <CalendarClock size={15} aria-hidden /> Today&apos;s lessons
                </h3>
                {todaysLessons.length === 0 ? (
                  <p className="text-[0.875rem] text-pp-muted">{week.length ? "No lessons scheduled today." : "The timetable hasn't been set yet."}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {todaysLessons.slice(0, 6).map((l) => {
                      const state = lessonState(l.start, l.end);
                      return (
                        <li key={l.id} className={`flex items-start gap-3 ${state === "done" ? "opacity-55" : ""}`}>
                          <span className="pp-num w-[4.5rem] shrink-0 pt-0.5 text-[0.8125rem] text-pp-muted">{formatClock(l.start)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.875rem] font-medium">{l.title}</span>
                            {l.teacher || l.room ? <span className="block truncate text-[0.8125rem] text-pp-muted">{[l.teacher, l.room].filter(Boolean).join(" · ")}</span> : null}
                          </span>
                          {state === "now" ? <StatusPill tone="good">Now</StatusPill> : l === nextUp ? <StatusPill tone="info">Next</StatusPill> : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="px-4 py-3.5 sm:px-5">
                <h3 className="mb-2.5 flex items-center gap-2 text-[0.8125rem] font-semibold text-pp-muted">
                  <ClipboardList size={15} aria-hidden /> Exams
                </h3>
                {upcoming.length === 0 ? (
                  <p className="text-[0.875rem] text-pp-muted">No upcoming exams scheduled.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {upcoming.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3">
                        <span className="min-w-0 truncate text-[0.875rem] font-medium">{e.name}</span>
                        <span className="shrink-0 text-[0.8125rem] text-pp-muted">
                          {e.status === "Ongoing" ? "In progress" : e.startDate ? formatWeekdayDayMonth(e.startDate) : "Date to be confirmed"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="From the school" action={{ href: "/parent/messages", label: "All messages" }} bodyClassName="p-0">
            {communications.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.875rem] text-pp-muted">No messages from the school yet.</p>
            ) : (
              <ul className="divide-y divide-pp-rule">
                {communications.slice(0, 3).map((c) => {
                  const Icon = c.scope === "school" ? Megaphone : MessageSquare;
                  return (
                    <li key={c.id}>
                      <Link href={c.scope === "school" ? "/parent/notices" : "/parent/messages"} className="block px-4 py-3 hover:bg-pp-sunken sm:px-5">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2 text-[0.875rem] font-medium">
                            <Icon size={14} aria-hidden className="shrink-0 text-pp-faint" />
                            <span className="truncate">{c.title}</span>
                          </span>
                          <span className="shrink-0 text-[0.75rem] text-pp-muted">{c.relative}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-pp-muted">{c.message}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
