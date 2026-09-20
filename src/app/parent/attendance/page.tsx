import EmptyState from "@/components/parent/EmptyState";
import StudentPlate from "@/components/parent/StudentPlate";
import TrendChart from "@/components/parent/TrendChart";
import AttendanceCalendar, { STATUS_META } from "@/components/parent/AttendanceCalendar";
import MonthPicker from "@/components/parent/MonthPicker";
import { PageHeader, Panel, StatusPill } from "@/components/parent/ui";
import { attendanceTone, summarizeAttendance } from "@/lib/parent/attendance";
import { getAttendanceBetween, getParentContext, getSchoolInfo } from "@/lib/parent/queries";
import { formatDayMonth, getSchoolClock } from "@/lib/parent/time";
import { MONTH_NAMES, type AttendanceRecord } from "@/lib/calendar";

const EARLIEST_YEARS_BACK = 5;

export default async function ParentAttendancePage({ searchParams }: { searchParams: Promise<{ child?: string; year?: string; month?: string }> }) {
  const params = await searchParams;
  const { profile, children, activeChild } = await getParentContext(params.child);

  if (!activeChild) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Mahudhurio" />
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const child = activeChild;
  const school = await getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school");
  const clock = getSchoolClock(school.timezone);
  const currentYear = Number(clock.dateKey.slice(0, 4));
  const currentMonth = Number(clock.dateKey.slice(5, 7)) - 1;

  const year = Number(params.year) || currentYear;
  // URL stores month 1-based (more natural in a link); everything else uses 0-11.
  const month = params.month ? Math.min(11, Math.max(0, Number(params.month) - 1)) : currentMonth;

  const yearRecords: AttendanceRecord[] = await getAttendanceBetween(child.id, `${year}-01-01`, `${year}-12-31`);
  const monthRecords = yearRecords.filter((r) => Number(r.date.slice(5, 7)) - 1 === month);
  const yearCounts = summarizeAttendance(yearRecords);
  const monthCounts = summarizeAttendance(monthRecords);
  const tone = attendanceTone(yearCounts.rate);

  // Monthly rate for the trend; months with no records are gaps, not zeros.
  const trend = MONTH_NAMES.map((name, i) => {
    const rows = yearRecords.filter((r) => Number(r.date.slice(5, 7)) - 1 === i);
    return { label: name.slice(0, 3), value: rows.length ? summarizeAttendance(rows).rate : null };
  });

  const notedRecords = [...monthRecords].filter((r) => r.notes && r.notes.trim() !== "").reverse();

  const segments = (["Present", "Late", "Excused", "Absent"] as const).map((s) => ({
    status: s,
    count: s === "Present" ? yearCounts.present : s === "Late" ? yearCounts.late : s === "Excused" ? yearCounts.excused : yearCounts.absent,
  }));

  const toneText = tone === "good" ? "text-pp-green" : tone === "watch" ? "text-pp-warn" : tone === "concern" ? "text-pp-danger" : "text-pp-ink";

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description={`Mahudhurio · ${year} school year to date`} />
      <StudentPlate child={child} allChildren={children} schoolName={school.name} />

      {yearRecords.length === 0 ? (
        <EmptyState kind="attendance" description={`No attendance was recorded for ${year}. Daily attendance will appear here once the class teacher records it.`} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Panel title="Attendance rate" description={`${year}`} className="lg:col-span-2">
            <div className="flex items-end gap-3">
              <span className={`pp-num font-display text-[3.25rem] leading-none font-semibold ${toneText}`}>{yearCounts.rate}%</span>
              <span className="pb-1.5">
                {tone === "good" ? <StatusPill tone="good">On track</StatusPill> : tone === "watch" ? <StatusPill tone="warn">Needs attention</StatusPill> : <StatusPill tone="danger">Low attendance</StatusPill>}
              </span>
            </div>

            <div
              role="img"
              aria-label={segments.map((s) => `${s.count} ${s.status.toLowerCase()}`).join(", ")}
              className="mt-5 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-pp-sunken"
            >
              {segments.map((s) =>
                s.count ? <span key={s.status} className={STATUS_META[s.status].swatch} style={{ width: `${(s.count / yearCounts.total) * 100}%` }} /> : null
              )}
            </div>

            <ul className="mt-4 divide-y divide-pp-rule">
              {segments.map((s) => {
                const m = STATUS_META[s.status];
                const Icon = m.icon;
                return (
                  <li key={s.status} className="flex items-center gap-3 py-2.5 text-[0.9375rem]">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded ${m.cell}`}>
                      <Icon size={13} strokeWidth={3} aria-hidden />
                    </span>
                    <span className="flex-1">{m.label}</span>
                    <span className="pp-num font-semibold">{s.count}</span>
                    <span className="pp-num w-10 text-right text-[0.8125rem] text-pp-muted">{Math.round((s.count / yearCounts.total) * 100)}%</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[0.75rem] leading-snug text-pp-muted">
              Rate = days present ÷ days recorded ({yearCounts.total}). Late and excused days are shown separately and aren&apos;t counted as present.
            </p>
          </Panel>

          <Panel title="Monthly trend" description={`Attendance rate by month, ${year}`} className="lg:col-span-3">
            <TrendChart points={trend} ariaLabel={`Attendance rate by month in ${year}`} />
          </Panel>
        </div>
      )}

      <Panel
        title={`${MONTH_NAMES[month]} ${year}`}
        description={
          monthCounts.total
            ? `${monthCounts.present} present · ${monthCounts.absent} absent · ${monthCounts.late} late · ${monthCounts.excused} excused`
            : "No records this month"
        }
        action={<MonthPicker year={year} month={month} earliestYear={currentYear - EARLIEST_YEARS_BACK} currentYear={currentYear} currentMonth={currentMonth} />}
      >
        <AttendanceCalendar year={year} month={month} records={monthRecords} today={clock.dateKey} />
      </Panel>

      {notedRecords.length > 0 ? (
        <Panel title="Teacher notes" description={`${MONTH_NAMES[month]} ${year}`} bodyClassName="p-0">
          <ul className="divide-y divide-pp-rule">
            {notedRecords.map((a) => {
              const m = STATUS_META[a.status];
              const Icon = m?.icon;
              return (
                <li key={a.date} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <span className="pp-num w-14 shrink-0 pt-0.5 text-[0.8125rem] text-pp-muted">{formatDayMonth(a.date)}</span>
                  <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">{a.notes}</span>
                  {m && Icon ? (
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${m.cell}`}>
                      <Icon size={12} strokeWidth={3} aria-hidden /> {m.label}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
