import Link from "next/link";
import { Award, CalendarCheck, Plus, Wallet } from "lucide-react";
import EmptyState from "@/components/parent/EmptyState";
import { childSubtitle } from "@/components/parent/StudentPlate";
import { withChild } from "@/components/parent/nav";
import { Avatar, GradeBadge, PageHeader, StatusPill } from "@/components/parent/ui";
import { createClient } from "@/lib/supabase/server";
import { getFeeSummary } from "@/lib/parent/fees";
import { formatKSh } from "@/lib/parent/money";
import { attendanceTone, summarizeAttendance } from "@/lib/parent/attendance";
import { buildYearReports, latestTerm } from "@/lib/parent/results";
import { getAttendanceBetween, getCurrentTerm, getCurriculum, getParentContext, getReleasedResults, getSchoolInfo } from "@/lib/parent/queries";
import { getSchoolClock, shiftDateKey } from "@/lib/parent/time";

export default async function ParentChildrenPage() {
  const { profile, children } = await getParentContext();
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");

  const header = (
    <PageHeader
      title="My children"
      description="Everyone linked to your account, with a snapshot of how each is doing."
      actions={
        <Link href="/link-child" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-pp-rule-strong bg-pp-surface px-4 text-[0.875rem] font-semibold hover:bg-pp-sunken">
          <Plus size={16} aria-hidden /> Link another child
        </Link>
      }
    />
  );

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const supabase = await createClient();
  const clock = getSchoolClock(school.timezone);
  const from30 = shiftDateKey(clock.dateKey, -30);
  const term = await getCurrentTerm();

  const snapshots = await Promise.all(
    children.map(async (c) => {
      const [results, curriculum, attendance, fee] = await Promise.all([
        getReleasedResults(c.id),
        getCurriculum(c.class_id),
        getAttendanceBetween(c.id, from30, null),
        getFeeSummary(supabase, { studentId: c.id, classId: c.class_id, termId: term?.id ?? null }),
      ]);
      const latest = latestTerm(buildYearReports(results, curriculum));
      return { child: c, latest, att: summarizeAttendance(attendance), fee: fee.summary };
    })
  );

  return (
    <div className="space-y-6">
      {header}
      <ul className="space-y-4">
        {snapshots.map(({ child, latest, att, fee }) => {
          const tone = attendanceTone(att.rate);
          return (
            <li key={child.id} className="overflow-hidden rounded-lg border border-pp-rule bg-pp-surface">
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <Avatar first={child.first_name} last={child.last_name} size={48} />
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-[1.25rem] leading-tight font-semibold">
                      {child.first_name} {child.last_name}
                    </h2>
                    <p className="truncate text-[0.875rem] text-pp-muted">
                      {childSubtitle(child, school.name)}
                      {child.admission_number ? ` • Adm. ${child.admission_number}` : ""}
                    </p>
                  </div>
                </div>
                <Link href={withChild("/parent", child.id)} className="inline-flex min-h-11 items-center rounded-md bg-pp-green px-4 text-[0.875rem] font-semibold text-white hover:bg-pp-green-deep">
                  Open dashboard
                </Link>
              </div>

              <ul className="grid grid-cols-1 gap-px border-t border-pp-rule bg-pp-rule sm:grid-cols-3">
                <li className="bg-pp-surface">
                  <Link href={withChild("/parent/results", child.id)} className="block px-4 py-3.5 hover:bg-pp-sunken sm:px-5">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-pp-muted"><Award size={15} aria-hidden /> Average{latest ? ` · ${latest.term.termLabel}` : ""}</span>
                    <span className="mt-1.5 flex items-center gap-2.5">
                      <span className="pp-num font-display text-[1.5rem] leading-none font-semibold">{latest?.term.view.averagePct != null ? `${latest.term.view.averagePct}%` : "–"}</span>
                      {latest?.term.view.averageGrade ? <GradeBadge grade={latest.term.view.averageGrade} size="sm" /> : <span className="text-[0.8125rem] text-pp-muted">No published results</span>}
                    </span>
                  </Link>
                </li>
                <li className="bg-pp-surface">
                  <Link href={withChild("/parent/attendance", child.id)} className="block px-4 py-3.5 hover:bg-pp-sunken sm:px-5">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-pp-muted"><CalendarCheck size={15} aria-hidden /> Attendance · 30 days</span>
                    <span className="mt-1.5 flex items-center gap-2.5">
                      <span className="pp-num font-display text-[1.5rem] leading-none font-semibold">{att.rate !== null ? `${att.rate}%` : "–"}</span>
                      {tone === "concern" ? <StatusPill tone="danger">Low</StatusPill> : tone === "watch" ? <StatusPill tone="warn">Watch</StatusPill> : tone === "good" ? <StatusPill tone="good">Good</StatusPill> : <span className="text-[0.8125rem] text-pp-muted">No records</span>}
                    </span>
                  </Link>
                </li>
                <li className="bg-pp-surface">
                  <Link href={withChild("/parent/fees", child.id)} className="block px-4 py-3.5 hover:bg-pp-sunken sm:px-5">
                    <span className="flex items-center gap-2 text-[0.8125rem] font-medium text-pp-muted"><Wallet size={15} aria-hidden /> Fee balance</span>
                    <span className="mt-1.5 flex items-center gap-2.5">
                      <span className="pp-num font-display text-[1.5rem] leading-none font-semibold">{fee.status === "none" ? "–" : formatKSh(fee.outstanding)}</span>
                      {fee.status === "paid" ? <StatusPill tone="good">Paid</StatusPill> : fee.outstanding > 0 ? <StatusPill tone="warn">Due</StatusPill> : null}
                    </span>
                  </Link>
                </li>
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
