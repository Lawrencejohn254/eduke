"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home, Users, TrendingUp, CheckCircle2, AlertTriangle, CalendarCheck,
  Search, ArrowUpDown, Plus, X, Loader2, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import { EmptyState } from "@/components/Loaders";
import { downloadHtmlAsPdf } from "@/lib/print";
import type { ActiveClassTeacherAssignment } from "@/lib/class-teacher";

export type SubjectPerformance = {
  subjectId: string;
  subjectName: string;
  students: number;
  average: number;
  passRate: number;
  highest: number;
  lowest: number;
  assessments: { name: string; average: number }[];
  studentScores: { id: string; name: string; admissionNumber: string; average: number }[];
};

export type StudentRow = {
  id: string;
  name: string;
  admissionNumber: string;
  average: number | null;
  position: number | null;
  attendance: number | null;
  atRisk: boolean;
  riskReasons: string[];
  subjects: { subjectName: string; pct: number }[];
};

export type InterventionRow = {
  id: string;
  studentId: string;
  studentName: string;
  schoolId: string;
  category: string;
  issue: string;
  observation: string | null;
  actionPlan: string | null;
  priority: string;
  followUpDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  createdBy: string;
};

const TABS = ["Overview", "Subjects", "Students", "At Risk", "Attendance", "Interventions"] as const;
type Tab = (typeof TABS)[number];

export default function MyClassDashboardClient({
  assignment,
  allAssignments,
  termOptions,
  selectedTermId,
  examOptions,
  selectedExamId,
  totalStudents,
  classAverage,
  passRate,
  attendanceThisTerm,
  atRiskCount,
  subjectPerformance,
  gradeDistribution,
  students,
  atRiskStudents,
  priorityAttention,
  attendanceToday,
  attendanceThisWeek,
  poorAttendance,
  interventions,
  passThreshold,
  hasReleasedResults,
  hasAttendanceData,
}: {
  assignment: ActiveClassTeacherAssignment;
  allAssignments: ActiveClassTeacherAssignment[];
  termOptions: { id: string; label: string; isCurrent: boolean }[];
  selectedTermId: string;
  examOptions: { id: string; name: string; examType: string }[];
  selectedExamId: string;
  totalStudents: number;
  classAverage: number | null;
  passRate: number | null;
  attendanceThisTerm: number | null;
  atRiskCount: number;
  subjectPerformance: SubjectPerformance[];
  gradeDistribution: { grade: string; count: number }[];
  students: StudentRow[];
  atRiskStudents: StudentRow[];
  priorityAttention: StudentRow[];
  attendanceToday: { present: number; total: number } | null;
  attendanceThisWeek: number | null;
  poorAttendance: StudentRow[];
  interventions: InterventionRow[];
  passThreshold: number;
  hasReleasedResults: boolean;
  hasAttendanceData: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");

  function buildUrl(overrides: { assignment?: string; term?: string; exam?: string }) {
    const a = overrides.assignment ?? assignment.id;
    const t = overrides.term ?? selectedTermId;
    const e = overrides.exam ?? selectedExamId;
    return `/my-class?assignment=${a}&term=${t}&exam=${e}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Home size={20} /> {assignment.class_name} {assignment.stream_name}
          </h1>
          <p className="text-sm text-gray-500">
            Class Teacher · {termOptions.find((t) => t.id === selectedTermId)?.label ?? `${assignment.academic_year} · ${assignment.term_number}`}
            {selectedExamId !== "all" && <> · {examOptions.find((e) => e.id === selectedExamId)?.name}</>}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {allAssignments.length > 1 && (
            <select
              value={assignment.id}
              onChange={(e) => router.push(buildUrl({ assignment: e.target.value, exam: "all" }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {allAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.class_name} {a.stream_name}
                </option>
              ))}
            </select>
          )}
          {termOptions.length > 1 && (
            <select
              value={selectedTermId}
              onChange={(e) => router.push(buildUrl({ term: e.target.value, exam: "all" }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {termOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}{t.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedExamId}
            onChange={(e) => router.push(buildUrl({ exam: e.target.value }))}
            disabled={examOptions.length === 0}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
            title="Filter by a specific CAT, exam, or assessment"
          >
            <option value="all">All Assessments</option>
            {examOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.examType ? `(${e.examType})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              downloadClassReport({
                assignment, totalStudents, classAverage, passRate, attendanceThisTerm,
                subjectPerformance, gradeDistribution, atRiskStudents,
              })
            }
            className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
          >
            <Download size={15} /> Class Report
          </button>
        </div>
      </div>

      <div className="eduke-table-wrap">
        <div className="flex gap-1 border-b border-gray-100 min-w-max">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-eduke-green text-eduke-green"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t}
              {t === "At Risk" && atRiskCount > 0 && (
                <span className="ml-1.5 badge badge-red">{atRiskCount}</span>
              )}
              {t === "Interventions" && interventions.length > 0 && (
                <span className="ml-1.5 badge badge-grey">{interventions.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "Overview" && (
        <OverviewTab
          totalStudents={totalStudents}
          classAverage={classAverage}
          passRate={passRate}
          attendanceThisTerm={attendanceThisTerm}
          atRiskCount={atRiskCount}
          hasReleasedResults={hasReleasedResults}
          hasAttendanceData={hasAttendanceData}
        />
      )}

      {tab === "Subjects" && (
        <SubjectsTab
          subjectPerformance={subjectPerformance}
          gradeDistribution={gradeDistribution}
          passThreshold={passThreshold}
          hasReleasedResults={hasReleasedResults}
          assignmentId={assignment.id}
          termId={selectedTermId}
          examId={selectedExamId}
        />
      )}

      {tab === "Students" && <StudentsTab students={students} assignmentId={assignment.id} termId={selectedTermId} examId={selectedExamId} />}

      {tab === "At Risk" && (
        <AtRiskTab atRiskStudents={atRiskStudents} priorityAttention={priorityAttention} passThreshold={passThreshold} assignmentId={assignment.id} termId={selectedTermId} examId={selectedExamId} />
      )}

      {tab === "Attendance" && (
        <AttendanceTab
          attendanceToday={attendanceToday}
          attendanceThisWeek={attendanceThisWeek}
          attendanceThisTerm={attendanceThisTerm}
          poorAttendance={poorAttendance}
          hasAttendanceData={hasAttendanceData}
          assignmentId={assignment.id}
          termId={selectedTermId}
          examId={selectedExamId}
        />
      )}

      {tab === "Interventions" && (
        <InterventionsTab interventions={interventions} students={students} onCreated={() => router.refresh()} />
      )}
    </div>
  );
}

function pct(n: number | null, digits = 0): string {
  return n == null ? "—" : `${n.toFixed(digits)}%`;
}

function OverviewTab({
  totalStudents, classAverage, passRate, attendanceThisTerm, atRiskCount, hasReleasedResults, hasAttendanceData,
}: {
  totalStudents: number;
  classAverage: number | null;
  passRate: number | null;
  attendanceThisTerm: number | null;
  atRiskCount: number;
  hasReleasedResults: boolean;
  hasAttendanceData: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard label="Total Students" value={String(totalStudents)} icon={Users} />
      <StatCard
        label="Class Average"
        value={hasReleasedResults ? pct(classAverage, 1) : "No data available"}
        icon={TrendingUp}
      />
      <StatCard
        label="Pass Rate"
        value={hasReleasedResults ? pct(passRate) : "No data available"}
        icon={CheckCircle2}
      />
      <StatCard
        label="Attendance"
        value={hasAttendanceData ? pct(attendanceThisTerm, 1) : "No data available"}
        icon={CalendarCheck}
      />
      <StatCard label="Students At Risk" value={String(atRiskCount)} icon={AlertTriangle} tone={atRiskCount > 0 ? "danger" : "default"} />
    </div>
  );
}

function SubjectsTab({
  subjectPerformance, gradeDistribution, passThreshold, hasReleasedResults, assignmentId, termId, examId,
}: {
  subjectPerformance: SubjectPerformance[];
  gradeDistribution: { grade: string; count: number }[];
  passThreshold: number;
  hasReleasedResults: boolean;
  assignmentId: string;
  termId: string;
  examId: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string>("All Subjects");

  const filtered =
    subjectFilter === "All Subjects" ? subjectPerformance : subjectPerformance.filter((s) => s.subjectName === subjectFilter);

  if (!hasReleasedResults) {
    return <EmptyState title="No academic results have been recorded yet" description="Once exam results are released for this class and term, subject performance will appear here." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Subject:</label>
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option>All Subjects</option>
          {subjectPerformance.map((s) => (
            <option key={s.subjectId}>{s.subjectName}</option>
          ))}
        </select>
      </div>

      <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
        <table>
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3 text-right">Students</th>
              <th className="px-4 py-3 text-right">Average</th>
              <th className="px-4 py-3 text-right">Pass Rate</th>
              <th className="px-4 py-3 text-right">Highest</th>
              <th className="px-4 py-3 text-right">Lowest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => (
              <>
                <tr
                  key={s.subjectId}
                  className="text-sm cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === s.subjectId ? null : s.subjectId)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{s.subjectName}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.students}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{pct(s.average)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{pct(s.passRate)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{pct(s.highest)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{pct(s.lowest)}</td>
                </tr>
                {expanded === s.subjectId && (
                  <tr key={`${s.subjectId}-detail`}>
                    <td colSpan={6} className="px-4 pb-4 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-500 mb-2 mt-1">Performance by Assessment</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {s.assessments.map((a) => (
                          <div key={a.name} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs">
                            <p className="text-gray-500">{a.name}</p>
                            <p className="font-semibold text-gray-900">{pct(a.average)}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        Student Scores — {s.subjectName}
                      </p>
                      <div className="eduke-table-wrap bg-white rounded-lg border border-gray-100">
                        <table>
                          <thead>
                            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
                              <th className="px-3 py-2">Student</th>
                              <th className="px-3 py-2 text-right">Score</th>
                              <th className="px-3 py-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {s.studentScores.map((st) => (
                              <tr key={st.id} className="text-sm">
                                <td className="px-3 py-2">
                                  <Link
                                    href={`/my-class/students/${st.id}?assignment=${assignmentId}&term=${termId}&exam=${examId}`}
                                    className="font-medium text-eduke-green hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {st.name}
                                  </Link>
                                  <p className="text-xs text-gray-400">{st.admissionNumber}</p>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700">{pct(st.average)}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`badge ${st.average >= passThreshold ? "badge-green" : "badge-red"}`}>
                                    {st.average >= passThreshold ? "Pass" : "Below Target"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Grade Distribution <span className="text-xs font-normal text-gray-400">(all subject assessments, this term)</span>
        </p>
        {gradeDistribution.length === 0 ? (
          <p className="text-sm text-gray-500">No data available</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {gradeDistribution
              .sort((a, b) => a.grade.localeCompare(b.grade))
              .map((g) => (
                <div key={g.grade} className="text-center">
                  <p className="text-lg font-bold text-gray-900">{g.grade}</p>
                  <p className="text-xs text-gray-500">{g.count} results</p>
                </div>
              ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">Pass mark: {passThreshold}%</p>
    </div>
  );
}

function StudentsTab({ students, assignmentId, termId, examId }: { students: StudentRow[]; assignmentId: string; termId: string; examId: string }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "average" | "position" | "attendance">("position");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? students.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q))
      : students;
    return [...list].sort((a, b) => {
      const valA = sortBy === "name" ? a.name : a[sortBy] ?? (sortBy === "position" ? Infinity : -Infinity);
      const valB = sortBy === "name" ? b.name : b[sortBy] ?? (sortBy === "position" ? Infinity : -Infinity);
      if (typeof valA === "string") return sortDir * valA.localeCompare(valB as string);
      return sortDir * ((valA as number) - (valB as number));
    });
  }, [students, search, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    else {
      setSortBy(col);
      setSortDir(1);
    }
  }

  if (students.length === 0) {
    return <EmptyState title="No students found" description="No active students are enrolled in this stream yet." />;
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
          className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-2 text-sm"
        />
      </div>

      <div className="eduke-table-wrap bg-white rounded-xl border border-gray-100">
        <table>
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100">
              <SortableTh label="Student" onClick={() => toggleSort("name")} />
              <SortableTh label="Overall" onClick={() => toggleSort("average")} align="right" />
              <SortableTh label="Position" onClick={() => toggleSort("position")} align="right" />
              <SortableTh label="Attendance" onClick={() => toggleSort("attendance")} align="right" />
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => (
              <tr key={s.id} className="text-sm hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/my-class/students/${s.id}?assignment=${assignmentId}&term=${termId}&exam=${examId}`} className="font-medium text-eduke-green hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-xs text-gray-400">{s.admissionNumber}</p>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{pct(s.average)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{s.position ?? "—"}</td>
                <td className="px-4 py-3 text-right text-gray-700">{pct(s.attendance)}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${s.atRisk ? "badge-red" : "badge-green"}`}>
                    {s.atRisk ? "At Risk" : "On Track"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableTh({ label, onClick, align }: { label: string; onClick: () => void; align?: "right" }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer select-none hover:text-gray-800 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label} <ArrowUpDown size={11} />
      </span>
    </th>
  );
}

function AtRiskTab({
  atRiskStudents, priorityAttention, passThreshold, assignmentId, termId, examId,
}: {
  atRiskStudents: StudentRow[];
  priorityAttention: StudentRow[];
  passThreshold: number;
  assignmentId: string;
  termId: string;
  examId: string;
}) {
  if (atRiskStudents.length === 0) {
    return <EmptyState title="No students currently flagged" description={`Students below ${passThreshold}% average, below 80% attendance, or with 2+ subjects below target will appear here.`} />;
  }

  return (
    <div className="space-y-4">
      {priorityAttention.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={15} /> Priority Attention
          </p>
          <p className="text-xs text-red-700 mb-3">Low attendance and low academic performance combined.</p>
          <div className="flex flex-wrap gap-2">
            {priorityAttention.map((s) => (
              <Link
                key={s.id}
                href={`/my-class/students/${s.id}?assignment=${assignmentId}&term=${termId}&exam=${examId}`}
                className="bg-white border border-red-200 rounded-lg px-3 py-2 text-xs hover:border-red-400"
              >
                <span className="font-semibold text-gray-900">{s.name}</span>
                <span className="text-gray-500"> · Att {pct(s.attendance)} · Avg {pct(s.average)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {atRiskStudents.map((s) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <Link href={`/my-class/students/${s.id}?assignment=${assignmentId}&term=${termId}&exam=${examId}`} className="font-semibold text-gray-900 hover:underline">
                {s.name}
              </Link>
              <span className="badge badge-red">At Risk</span>
            </div>
            <ul className="mt-2 space-y-1">
              {s.riskReasons.map((r) => (
                <li key={r} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="text-red-500 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceTab({
  attendanceToday, attendanceThisWeek, attendanceThisTerm, poorAttendance, hasAttendanceData, assignmentId, termId, examId,
}: {
  attendanceToday: { present: number; total: number } | null;
  attendanceThisWeek: number | null;
  attendanceThisTerm: number | null;
  poorAttendance: StudentRow[];
  hasAttendanceData: boolean;
  assignmentId: string;
  termId: string;
  examId: string;
}) {
  if (!hasAttendanceData) {
    return <EmptyState title="No attendance records available" description="Attendance for this class and term will appear here once it's recorded." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={attendanceToday ? `${attendanceToday.present} / ${attendanceToday.total} present` : "No data available"} icon={CalendarCheck} />
        <StatCard label="This Week" value={pct(attendanceThisWeek)} icon={CalendarCheck} />
        <StatCard label="This Term" value={pct(attendanceThisTerm)} icon={CalendarCheck} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Students with Low Attendance (below 80%)</p>
        {poorAttendance.length === 0 ? (
          <p className="text-sm text-gray-500">No students below the attendance threshold.</p>
        ) : (
          <div className="space-y-2">
            {poorAttendance.map((s) => (
              <Link
                key={s.id}
                href={`/my-class/students/${s.id}?assignment=${assignmentId}&term=${termId}&exam=${examId}`}
                className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:border-gray-300"
              >
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
                <span className="text-sm text-red-600 font-semibold">{pct(s.attendance)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const INTERVENTION_CATEGORIES = ["Academic", "Attendance", "Behaviour", "Wellbeing", "Other"];
const INTERVENTION_STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

function InterventionsTab({
  interventions, students, onCreated,
}: {
  interventions: InterventionRow[];
  students: StudentRow[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<InterventionRow | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-eduke-green text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors"
        >
          <Plus size={15} /> New Intervention
        </button>
      </div>

      {interventions.length === 0 ? (
        <EmptyState title="No interventions recorded" description="Create an intervention to track follow-up on academic, attendance, behaviour, or wellbeing concerns." />
      ) : (
        <div className="space-y-3">
          {interventions.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelected(i)}
              className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-eduke-green/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{i.studentName}</p>
                  <p className="text-xs text-gray-500">{i.category} · {i.issue}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${i.priority === "High" ? "badge-red" : i.priority === "Medium" ? "badge-orange" : "badge-grey"}`}>
                    {i.priority}
                  </span>
                  <span className={`badge ${i.status === "Resolved" || i.status === "Closed" ? "badge-green" : "badge-grey"}`}>
                    {i.status}
                  </span>
                </div>
              </div>
              {i.observation && <p className="text-xs text-gray-600 mt-2">{i.observation}</p>}
              {i.actionPlan && (
                <p className="text-xs text-gray-600 mt-1"><span className="font-medium text-gray-700">Action:</span> {i.actionPlan}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span>By {i.createdBy}</span>
                {i.followUpDate && <span>Follow-up: {i.followUpDate}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && <NewInterventionModal students={students} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onCreated(); }} />}

      {selected && (
        <InterventionDetailModal
          intervention={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

type InterventionUpdate = {
  id: string;
  note: string;
  status: string | null;
  createdAt: string;
  createdBy: string;
};

function InterventionDetailModal({
  intervention, onClose, onUpdated,
}: {
  intervention: InterventionRow;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [updates, setUpdates] = useState<InterventionUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState(intervention.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("intervention_updates")
        .select("id, note, status, created_at, staff:staff!intervention_updates_created_by_fkey(first_name, last_name)")
        .eq("intervention_id", intervention.id)
        .order("created_at", { ascending: false });

      setUpdates(
        (data ?? []).map((u) => {
          const staff = u.staff as unknown as { first_name: string; last_name: string } | null;
          return {
            id: u.id as string,
            note: u.note as string,
            status: u.status as string | null,
            createdAt: u.created_at as string,
            createdBy: staff ? `${staff.first_name} ${staff.last_name}` : "Unknown",
          };
        })
      );
      setLoading(false);
    })();
  }, [intervention.id]);

  async function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) {
      setError("Add a note describing the follow-up.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("staff_id").eq("id", auth.user?.id).maybeSingle();
      if (!profile?.staff_id) throw new Error("Could not resolve your staff profile.");

      const statusChanged = newStatus !== intervention.status;

      const { error: insertError } = await supabase.from("intervention_updates").insert({
        intervention_id: intervention.id,
        school_id: intervention.schoolId,
        note: note.trim(),
        status: statusChanged ? newStatus : null,
        created_by: profile.staff_id,
      });
      if (insertError) throw insertError;

      if (statusChanged) {
        const { error: statusError } = await supabase
          .from("interventions")
          .update({ status: newStatus })
          .eq("id", intervention.id);
        if (statusError) throw statusError;
      }

      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add update.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{intervention.studentName}</h2>
            <p className="text-xs text-gray-500 mt-1">{intervention.category} · {intervention.issue}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${intervention.priority === "High" ? "badge-red" : intervention.priority === "Medium" ? "badge-orange" : "badge-grey"}`}>
              {intervention.priority} priority
            </span>
            <span className="badge badge-grey">{intervention.status}</span>
            {intervention.followUpDate && <span className="text-xs text-gray-500">Follow-up due: {intervention.followUpDate}</span>}
          </div>

          {intervention.observation && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Observation</p>
              <p className="text-sm text-gray-700">{intervention.observation}</p>
            </div>
          )}
          {intervention.actionPlan && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Action Plan</p>
              <p className="text-sm text-gray-700">{intervention.actionPlan}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Follow-up Log</p>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : updates && updates.length > 0 ? (
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="border-l-2 border-eduke-green/30 pl-3">
                    <p className="text-sm text-gray-700">{u.note}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {u.createdBy} · {new Date(u.createdAt).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {u.status && <> · moved to <span className="font-medium">{u.status}</span></>}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No follow-up notes yet.</p>
            )}
          </div>

          <form onSubmit={handleAddUpdate} className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-900">Add Follow-up</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What happened, what was discussed, next steps..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Set status:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              >
                {INTERVENTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{error}</div>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
                Close
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Add Update
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function NewInterventionModal({
  students, onClose, onDone,
}: {
  students: StudentRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [category, setCategory] = useState("Academic");
  const [issue, setIssue] = useState("");
  const [observation, setObservation] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [followUpDate, setFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !issue.trim()) {
      setError("Select a student and describe the issue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("staff_id, school_id").eq("id", auth.user?.id).maybeSingle();
      if (!profile?.staff_id) throw new Error("Could not resolve your staff profile.");

      const { error: insertError } = await supabase.from("interventions").insert({
        school_id: profile.school_id,
        student_id: studentId,
        category,
        issue: issue.trim(),
        observation: observation.trim() || null,
        action_plan: actionPlan.trim() || null,
        priority,
        follow_up_date: followUpDate || null,
        status: "Open",
        created_by: profile.staff_id,
      });
      if (insertError) throw insertError;
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create intervention.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="font-semibold text-gray-900 text-lg">New Intervention</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
                {INTERVENTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
                {["Low", "Medium", "High"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Issue</label>
            <input required value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Poor Mathematics performance" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Observation</label>
            <textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Action Plan</label>
            <textarea value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Follow-up Date</label>
            <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">{error}</div>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-eduke-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-eduke-green-dark transition-colors disabled:opacity-60">
              {submitting && <Loader2 size={15} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function downloadClassReport({
  assignment, totalStudents, classAverage, passRate, attendanceThisTerm, subjectPerformance, gradeDistribution, atRiskStudents,
}: {
  assignment: ActiveClassTeacherAssignment;
  totalStudents: number;
  classAverage: number | null;
  passRate: number | null;
  attendanceThisTerm: number | null;
  subjectPerformance: SubjectPerformance[];
  gradeDistribution: { grade: string; count: number }[];
  atRiskStudents: StudentRow[];
}) {
  const subjectRows = subjectPerformance
    .map((s) => `<tr><td>${s.subjectName}</td><td>${s.students}</td><td class="amount">${pct(s.average)}</td><td class="amount">${pct(s.passRate)}</td><td class="amount">${pct(s.highest)}</td><td class="amount">${pct(s.lowest)}</td></tr>`)
    .join("");

  const gradeRows = gradeDistribution.map((g) => `${g.grade}: ${g.count}`).join(" &nbsp; ");
  const atRiskRows = atRiskStudents.map((s) => `<li>${s.name} — ${s.riskReasons.join("; ")}</li>`).join("");

  const html = `
    <h1>${assignment.class_name} ${assignment.stream_name} — Class Performance Report</h1>
    <p class="subtitle">Academic Year ${assignment.academic_year} · ${assignment.term_number}</p>
    <table>
      <tbody>
        <tr><td>Students</td><td class="amount">${totalStudents}</td></tr>
        <tr><td>Class Average</td><td class="amount">${pct(classAverage, 1)}</td></tr>
        <tr><td>Pass Rate</td><td class="amount">${pct(passRate)}</td></tr>
        <tr><td>Attendance (this term)</td><td class="amount">${pct(attendanceThisTerm, 1)}</td></tr>
        <tr><td>Students Requiring Attention</td><td class="amount">${atRiskStudents.length}</td></tr>
      </tbody>
    </table>
    <table>
      <thead><tr><th>Subject</th><th>Students</th><th class="amount">Average</th><th class="amount">Pass Rate</th><th class="amount">Highest</th><th class="amount">Lowest</th></tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>
    <p class="subtitle">Grade Distribution: ${gradeRows || "No data available"}</p>
    ${atRiskStudents.length > 0 ? `<p class="subtitle">Students Requiring Attention</p><ul>${atRiskRows}</ul>` : ""}
    <p class="footer">Generated ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })} via EduKe.</p>
  `;

  downloadHtmlAsPdf(`${assignment.class_name}-${assignment.stream_name}-report.pdf`, html);
}