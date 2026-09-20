import { BookOpen, GraduationCap, Award, Layers } from "lucide-react";
import EmptyState from "@/components/parent/EmptyState";
import ResultsReport, { Tabs, type TermTab } from "@/components/parent/ResultsReport";
import StudentPlate from "@/components/parent/StudentPlate";
import TrendChart from "@/components/parent/TrendChart";
import { GradeBadge, Ledger, LedgerItem, PageHeader, Panel } from "@/components/parent/ui";
import { buildAnnualView, buildYearReports } from "@/lib/parent/results";
import { getClassTeacherName, getCurrentTerm, getCurriculum, getParentContext, getReleasedResults, getRemarks, getSchoolInfo } from "@/lib/parent/queries";

export default async function ParentResultsPage({ searchParams }: { searchParams: Promise<{ child?: string; year?: string; term?: string }> }) {
  const params = await searchParams;
  const { profile, children, activeChild } = await getParentContext(params.child);

  if (!activeChild) {
    return (
      <div className="space-y-6">
        <PageHeader title="Academic performance" />
        <EmptyState kind="children" action={{ href: "/link-child", label: "Link a child" }} />
      </div>
    );
  }

  const child = activeChild;
  const [school, rawResults, curriculum, remarks, teacherName, currentTerm] = await Promise.all([
    getSchoolInfo(profile.school_id, profile.school?.name ?? "Your school"),
    getReleasedResults(child.id),
    getCurriculum(child.class_id),
    getRemarks(child.id),
    getClassTeacherName(child.stream_id),
    getCurrentTerm(),
  ]);

  const header = <PageHeader title="Academic performance" description="Published exam results, term by term." />;
  const plate = <StudentPlate child={child} allChildren={children} schoolName={school.name} />;

  const years = buildYearReports(rawResults, curriculum);
  if (years.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        {plate}
        <EmptyState kind="results" />
      </div>
    );
  }

  // Which academic year, and which term (or "annual") are we showing?
  const requestedYear = Number(params.year);
  const year =
    years.find((y) => y.year === requestedYear) ?? years.find((y) => y.year === currentTerm?.year) ?? years[years.length - 1];

  const isAnnual = params.term === "annual";
  const requestedNo = Number(params.term);
  const currentNo = currentTerm?.year === year.year ? Number(/\d+/.exec(currentTerm.termNumber)?.[0]) : NaN;
  const term =
    (!isAnnual && year.terms.find((t) => t.termNo === requestedNo)) ||
    (!isAnnual && year.terms.find((t) => t.termNo === currentNo)) ||
    year.terms[year.terms.length - 1];

  const view = isAnnual ? buildAnnualView(year, curriculum) : term.view;
  const periodLabel = isAnnual ? `Annual ${year.year}` : `${term.termLabel} ${year.year}`;

  const base = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ child: child.id, year: String(year.year), ...extra });
    return `/parent/results?${q.toString()}`;
  };

  const termNos = [...new Set([1, 2, 3, ...year.terms.map((t) => t.termNo)])].sort((a, b) => a - b);
  const termTabs: TermTab[] = [
    ...termNos.map((n) => {
      const has = year.terms.some((t) => t.termNo === n);
      return { key: `t${n}`, label: `Term ${n}`, href: has ? base({ term: String(n) }) : null, active: !isAnnual && term.termNo === n };
    }),
    { key: "annual", label: "Annual", href: base({ term: "annual" }), active: isAnnual },
  ];
  const yearTabs: TermTab[] = years
    .slice()
    .reverse()
    .map((y) => ({
      key: String(y.year),
      label: String(y.year),
      href: `/parent/results?${new URLSearchParams({ child: child.id, year: String(y.year) }).toString()}`,
      active: y.year === year.year,
    }));

  const trend = termNos.map((n) => ({ label: `Term ${n}`, value: year.terms.find((t) => t.termNo === n)?.view.averagePct ?? null }));

  // Teacher's remarks: the selected term's, or (for the annual view) the latest term that has one.
  const remarkTerms = isAnnual ? [...year.terms].reverse() : [term];
  const remark = remarkTerms.map((t) => ({ t, r: remarks.find((x) => x.termId === t.termId) })).find((x) => x.r && (x.r.classTeacherComment || x.r.principalComment));

  return (
    <div className="space-y-6">
      {header}
      {plate}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Term" tabs={termTabs} />
        {years.length > 1 ? <Tabs label="Academic year" tabs={yearTabs} /> : null}
      </div>

      <Ledger cols={3}>
        <LedgerItem
          icon={Award}
          label="Average"
          value={view.averagePct !== null ? `${view.averagePct}%` : "–"}
          aside={view.averageGrade ? <GradeBadge grade={view.averageGrade} size="lg" /> : undefined}
          note="Mean of the subject averages below"
        />
        <LedgerItem icon={BookOpen} label="Subjects" value={view.subjects.length} note={`${view.examCount} ${view.examCount === 1 ? "exam" : "exams"} published`} />
        <LedgerItem icon={Layers} label={isAnnual ? "Period" : "Term"} value={isAnnual ? "Annual" : term.termLabel} note={String(year.year)} />
      </Ledger>

      <Panel title="Subject performance" description={periodLabel} bodyClassName="p-0">
        {view.subjects.length === 0 ? (
          <div className="p-4">
            <EmptyState kind="results" compact />
          </div>
        ) : (
          <ResultsReport view={view} mode={isAnnual ? "annual" : "term"} />
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Performance trend" description={`Term averages, ${year.year}`}>
          <TrendChart points={trend} ariaLabel={`Average by term in ${year.year}`} emptyText="The trend appears once results are published." />
        </Panel>

        {remark ? (
          <Panel title="Teacher's comment" description={`${remark.t.termLabel} ${year.year}`}>
            <div className="flex flex-col gap-6">
              {remark.r?.classTeacherComment ? (
                <figure className="m-0 border-l-[3px] border-pp-gold pl-4">
                  <blockquote className="m-0 font-display text-[1.0625rem] leading-relaxed text-pp-ink">{remark.r.classTeacherComment}</blockquote>
                  <figcaption className="mt-2 flex items-center gap-2 text-[0.8125rem] text-pp-muted">
                    <GraduationCap size={15} aria-hidden />
                    {teacherName ? `${teacherName}, class teacher` : "Class teacher"}
                  </figcaption>
                </figure>
              ) : null}
              {remark.r?.principalComment ? (
                <figure className="m-0 border-l-[3px] border-pp-rule-strong pl-4">
                  <blockquote className="m-0 font-display text-[1.0625rem] leading-relaxed text-pp-ink">{remark.r.principalComment}</blockquote>
                  <figcaption className="mt-2 text-[0.8125rem] text-pp-muted">Principal</figcaption>
                </figure>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
