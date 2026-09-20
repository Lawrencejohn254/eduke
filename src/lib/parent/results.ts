import { gradeFromMarks } from "@/lib/format";

/**
 * Pure report-card logic for the parent portal. No I/O — feed it the rows the page already loaded.
 *
 * Only *released* exams should ever be passed in (the query filters on exams.status).
 * Averages follow one rule everywhere: a subject's average is the mean of its exam percentages,
 * and a term/annual average is the mean of the subject averages. That way the headline figure
 * always equals what the table underneath it shows.
 */

export type CurriculumType = "CBC" | "8-4-4";

export type RawResultRow = {
  exam_id: string;
  subject_id: string;
  marks_obtained: number | string | null;
  grade: string | null;
  teacher_comment: string | null;
  subject: { name: string } | null;
  exam: {
    id: string;
    name: string;
    out_of: number | null;
    start_date: string | null;
    end_date: string | null;
    term: {
      id: string;
      term_number: string;
      academic_year: { id: string; year: number } | null;
    } | null;
  } | null;
};

export type ReportColumn = {
  id: string;
  label: string;
  /** e.g. "out of 100" for an exam column, null for a term column */
  sublabel: string | null;
};

export type ReportCell = {
  pct: number;
  /** raw marks and out-of — only present for a single exam */
  marks: number | null;
  outOf: number | null;
  grade: string | null;
};

export type SubjectRow = {
  subjectId: string;
  name: string;
  cells: Record<string, ReportCell | undefined>;
  /** rounded whole percentage across this subject's cells */
  averagePct: number | null;
  grade: string | null;
  /** most recent teacher comment for the subject, if any */
  comment: string | null;
};

export type ReportView = {
  columns: ReportColumn[];
  subjects: SubjectRow[];
  averagePct: number | null;
  averageGrade: string | null;
  /** how many exams contributed */
  examCount: number;
};

export type TermReport = {
  termId: string;
  /** 1, 2, 3 … parsed from "Term 1" */
  termNo: number;
  termLabel: string;
  view: ReportView;
};

export type YearReport = {
  yearId: string;
  year: number;
  terms: TermReport[]; // ascending by termNo
};

const round = (n: number) => Math.round(n);
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function parseTermNumber(termNumber: string | null | undefined): number {
  const m = /(\d+)/.exec(termNumber ?? "");
  return m ? Number(m[1]) : 0;
}

function pctOf(marks: number, outOf: number | null): number {
  const denominator = outOf && outOf > 0 ? outOf : 100;
  return (marks / denominator) * 100;
}

function gradeForAverage(avg: number | null, curriculum: CurriculumType): string | null {
  if (avg === null) return null;
  const g = gradeFromMarks(avg, curriculum).grade;
  return g === "-" ? null : g;
}

/** Builds the per-subject table for a set of exam-columns. */
function buildView(rows: RawResultRow[], curriculum: CurriculumType, columns: ReportColumn[], columnOf: (r: RawResultRow) => string | null): ReportView {
  const bySubject = new Map<string, SubjectRow & { _exams: { date: string; comment: string | null; grade: string | null }[]; _pcts: number[] }>();

  for (const r of rows) {
    const colId = columnOf(r);
    if (!colId || r.marks_obtained === null || r.marks_obtained === undefined) continue;
    const marks = Number(r.marks_obtained);
    if (!Number.isFinite(marks)) continue;

    let subj = bySubject.get(r.subject_id);
    if (!subj) {
      subj = {
        subjectId: r.subject_id,
        name: r.subject?.name?.trim() || "Subject",
        cells: {},
        averagePct: null,
        grade: null,
        comment: null,
        _exams: [],
        _pcts: [],
      };
      bySubject.set(r.subject_id, subj);
    }

    const outOf = r.exam?.out_of ?? null;
    const pct = pctOf(marks, outOf);
    // If a subject somehow has two rows for the same column, keep the higher-information (later) one.
    subj.cells[colId] = { pct, marks, outOf: outOf && outOf > 0 ? outOf : 100, grade: r.grade };
    subj._pcts = Object.values(subj.cells).filter(Boolean).map((c) => c!.pct);
    subj._exams.push({ date: r.exam?.end_date ?? r.exam?.start_date ?? "", comment: r.teacher_comment?.trim() || null, grade: r.grade });
  }

  const subjects: SubjectRow[] = [];
  for (const s of bySubject.values()) {
    const avg = mean(s._pcts);
    const averagePct = avg === null ? null : round(avg);
    const scoredCells = Object.values(s.cells).filter(Boolean);
    // With a single exam, trust the grade the database trigger stored; otherwise grade the average.
    const storedGrade = scoredCells.length === 1 ? scoredCells[0]!.grade : null;
    const latestComment = [...s._exams].filter((e) => e.comment).sort((a, b) => b.date.localeCompare(a.date))[0]?.comment ?? null;

    subjects.push({
      subjectId: s.subjectId,
      name: s.name,
      cells: s.cells,
      averagePct,
      grade: storedGrade || gradeForAverage(averagePct, curriculum),
      comment: latestComment,
    });
  }
  subjects.sort((a, b) => a.name.localeCompare(b.name));

  const subjectAverages = subjects.map((s) => s.averagePct).filter((v): v is number => v !== null);
  const averagePct = subjectAverages.length ? round(mean(subjectAverages)!) : null;

  return {
    columns,
    subjects,
    averagePct,
    averageGrade: gradeForAverage(averagePct, curriculum),
    examCount: new Set(rows.map((r) => r.exam_id)).size,
  };
}

/** Groups released results into academic years → terms, each with a ready-to-render report table. */
export function buildYearReports(rows: RawResultRow[], curriculum: CurriculumType): YearReport[] {
  type TermBucket = { termId: string; termNo: number; termLabel: string; rows: RawResultRow[] };
  const years = new Map<string, { yearId: string; year: number; terms: Map<string, TermBucket> }>();

  for (const r of rows) {
    const term = r.exam?.term;
    const ay = term?.academic_year;
    if (!term || !ay) continue;
    let y = years.get(ay.id);
    if (!y) {
      y = { yearId: ay.id, year: ay.year, terms: new Map() };
      years.set(ay.id, y);
    }
    let t = y.terms.get(term.id);
    if (!t) {
      t = { termId: term.id, termNo: parseTermNumber(term.term_number), termLabel: term.term_number, rows: [] };
      y.terms.set(term.id, t);
    }
    t.rows.push(r);
  }

  return [...years.values()]
    .sort((a, b) => a.year - b.year)
    .map((y) => ({
      yearId: y.yearId,
      year: y.year,
      terms: [...y.terms.values()]
        .sort((a, b) => a.termNo - b.termNo)
        .map((t) => {
          // Columns = the exams in this term, oldest first.
          const examMap = new Map<string, { id: string; name: string; outOf: number | null; date: string }>();
          for (const r of t.rows) {
            if (!r.exam) continue;
            examMap.set(r.exam.id, { id: r.exam.id, name: r.exam.name, outOf: r.exam.out_of, date: r.exam.start_date ?? r.exam.end_date ?? "" });
          }
          const exams = [...examMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
          const columns: ReportColumn[] = exams.map((e) => ({
            id: e.id,
            label: e.name.trim() || "Exam",
            sublabel: `out of ${e.outOf && e.outOf > 0 ? e.outOf : 100}`,
          }));
          return {
            termId: t.termId,
            termNo: t.termNo,
            termLabel: t.termLabel,
            view: buildView(t.rows, curriculum, columns, (r) => r.exam_id),
          };
        }),
    }));
}

/** Whole-year view: one column per term, each cell being the subject's average in that term. */
export function buildAnnualView(year: YearReport, curriculum: CurriculumType): ReportView {
  const columns: ReportColumn[] = year.terms.map((t) => ({ id: t.termId, label: t.termLabel, sublabel: null }));

  const subjectMap = new Map<string, SubjectRow>();
  for (const t of year.terms) {
    for (const s of t.view.subjects) {
      if (s.averagePct === null) continue;
      let row = subjectMap.get(s.subjectId);
      if (!row) {
        row = { subjectId: s.subjectId, name: s.name, cells: {}, averagePct: null, grade: null, comment: null };
        subjectMap.set(s.subjectId, row);
      }
      row.cells[t.termId] = { pct: s.averagePct, marks: null, outOf: null, grade: s.grade };
      row.comment = s.comment ?? row.comment;
    }
  }

  const subjects = [...subjectMap.values()].map((row) => {
    const pcts = Object.values(row.cells).filter(Boolean).map((c) => c!.pct);
    const avg = mean(pcts);
    const averagePct = avg === null ? null : round(avg);
    return { ...row, averagePct, grade: gradeForAverage(averagePct, curriculum) };
  });
  subjects.sort((a, b) => a.name.localeCompare(b.name));

  const avgs = subjects.map((s) => s.averagePct).filter((v): v is number => v !== null);
  const averagePct = avgs.length ? round(mean(avgs)!) : null;

  return {
    columns,
    subjects,
    averagePct,
    averageGrade: gradeForAverage(averagePct, curriculum),
    examCount: year.terms.reduce((n, t) => n + t.view.examCount, 0),
  };
}

/** The most recent term that has any released results (used by the dashboard). */
export function latestTerm(years: YearReport[]): { year: YearReport; term: TermReport } | null {
  for (let i = years.length - 1; i >= 0; i--) {
    const terms = years[i].terms;
    if (terms.length) return { year: years[i], term: terms[terms.length - 1] };
  }
  return null;
}

/* ───────────────────────────── grade presentation ───────────────────────────── */

export type GradeTone = "top" | "good" | "fair" | "low" | "none";

/** Works for both 8-4-4 letters (A, B+, …) and CBC indicators (EE1, ME2, …). */
export function gradeTone(grade: string | null | undefined): GradeTone {
  if (!grade) return "none";
  const g = grade.trim().toUpperCase();
  if (g.startsWith("EE") || g === "A" || g === "A-" || g === "A+") return "top";
  if (g.startsWith("ME") || g.startsWith("B")) {
    // "BE1/BE2" (Below Expectations) starts with B but is the lowest CBC band.
    if (g.startsWith("BE")) return "low";
    return "good";
  }
  if (g.startsWith("AE") || g.startsWith("C")) return "fair";
  if (g.startsWith("D") || g === "E") return "low";
  return "none";
}

/** Plain-language meaning for CBC bands; empty for letter grades. */
export function gradeMeaning(grade: string | null | undefined): string {
  if (!grade) return "";
  const g = grade.toUpperCase();
  if (g.startsWith("EE")) return "Exceeding expectations";
  if (g.startsWith("ME")) return "Meeting expectations";
  if (g.startsWith("AE")) return "Approaching expectations";
  if (g.startsWith("BE")) return "Below expectations";
  return "";
}
