"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp, CalendarCheck, AlertTriangle } from "lucide-react";
import StatCard from "@/components/StatCard";
import { EmptyState } from "@/components/Loaders";
import type { ActiveClassTeacherAssignment } from "@/lib/class-teacher";

type SubjectAvg = { subjectName: string; average: number };
type TrendPoint = { term: string; average: number };
type Intervention = {
  id: string;
  category: string;
  issue: string;
  observation: string | null;
  actionPlan: string | null;
  priority: string;
  followUpDate: string | null;
  status: string;
  createdAt: string;
};

function pct(n: number | null, digits = 0): string {
  return n == null ? "—" : `${n.toFixed(digits)}%`;
}

export default function StudentDetailClient({
  student,
  assignment,
  selectedTermId,
  overallAverage,
  subjectsBelowTarget,
  attendanceRate,
  subjectPerformance,
  trend,
  classTeacherComment,
  interventions,
}: {
  student: { id: string; name: string; admissionNumber: string };
  assignment: ActiveClassTeacherAssignment;
  selectedTermId: string;
  overallAverage: number | null;
  subjectsBelowTarget: number;
  attendanceRate: number | null;
  subjectPerformance: SubjectAvg[];
  trend: TrendPoint[];
  classTeacherComment: string | null;
  interventions: Intervention[];
}) {
  return (
    <div className="space-y-5">
      <Link href={`/my-class?assignment=${assignment.id}&term=${selectedTermId}`} className="text-sm text-eduke-green inline-flex items-center gap-1 hover:underline">
        <ArrowLeft size={14} /> Back to My Class
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
        <p className="text-sm text-gray-500">
          {student.admissionNumber} · {assignment.class_name} {assignment.stream_name}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Overall Average" value={pct(overallAverage, 1)} icon={TrendingUp} />
        <StatCard label="Class Position" value="—" icon={TrendingUp} />
        <StatCard label="Attendance" value={pct(attendanceRate, 1)} icon={CalendarCheck} />
        <StatCard
          label="Subjects Below Target"
          value={String(subjectsBelowTarget)}
          icon={AlertTriangle}
          tone={subjectsBelowTarget > 0 ? "danger" : "default"}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Subject Performance (this term)</p>
        {subjectPerformance.length === 0 ? (
          <p className="text-sm text-gray-500">No academic results have been recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {subjectPerformance
              .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
              .map((s) => (
                <div key={s.subjectName} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                  <span className="text-sm text-gray-700">{s.subjectName}</span>
                  <span className="text-sm font-semibold text-gray-900">{pct(s.average)}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Performance Trend</p>
        {trend.length < 2 ? (
          <p className="text-sm text-gray-500">Not enough historical data yet to show a trend.</p>
        ) : (
          <div className="flex items-end gap-4">
            {trend.map((t) => (
              <div key={t.term} className="text-center">
                <div
                  className="w-8 bg-eduke-green/70 rounded-t"
                  style={{ height: `${Math.max(8, t.average)}px` }}
                  title={`${t.term}: ${pct(t.average)}`}
                />
                <p className="text-xs text-gray-500 mt-1">{t.term}</p>
                <p className="text-xs font-semibold text-gray-900">{pct(t.average)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {classTeacherComment && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Class Teacher Remark</p>
          <p className="text-sm text-gray-600">{classTeacherComment}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Interventions</p>
        {interventions.length === 0 ? (
          <EmptyState title="No interventions recorded" description="Interventions created for this student will appear here." />
        ) : (
          <div className="space-y-3">
            {interventions.map((i) => (
              <div key={i.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{i.category} · {i.issue}</p>
                  <span className="badge badge-grey">{i.status}</span>
                </div>
                {i.actionPlan && <p className="text-xs text-gray-600 mt-1">{i.actionPlan}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}