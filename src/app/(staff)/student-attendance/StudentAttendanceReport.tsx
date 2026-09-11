"use client";

import { useState, useMemo } from "react";
import { EmptyState } from "@/components/Loaders";

type ClassOption = { id: string; name: string };

type StudentStat = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string;
  streamName: string;
  classId: string | null;
  totalDays: number;
  attendedDays: number;
  percentage: number | null;
};

function barColor(pct: number) {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 75) return "bg-yellow-500";
  return "bg-red-500";
}

export default function StudentAttendanceReport({
  classes,
  students,
}: {
  classes: ClassOption[];
  students: StudentStat[];
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  const filtered = useMemo(() => {
    if (selectedClassId === "all") return students;
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  return (
    <>
      {/* CLASS / GRADE FILTER */}
      <div className="max-w-xs">
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-eduke-green"
        >
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* STUDENT LIST */}
      {filtered.length === 0 ? (
        <EmptyState title="No students" description="No students found for this class." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {s.firstName} {s.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {s.admissionNumber} · {s.className} {s.streamName}
                </p>
              </div>

              <div className="flex items-center gap-3 w-64 shrink-0">
                {s.percentage === null ? (
                  <span className="text-xs text-gray-400 ml-auto">No records yet</span>
                ) : (
                  <>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full ${barColor(s.percentage)}`}
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {s.percentage}%
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}