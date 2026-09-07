"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

type StaffReport = {
  first_name: string;
  last_name: string;
  role: string | null;
  department: string | null;
  staff_number: string | null;
  workingDays: number;
  present: number;
  late: number;
  absent: number;
  completed: number;
  attendanceRate: number;
};

type Props = {
  reports: StaffReport[];
  startDate: string;
  endDate: string;
};

function escapeCSVValue(value: string | number | null) {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);

  // Protect CSV formatting when values contain commas/quotes
  return `"${stringValue.replace(/"/g, '""')}"`;
}

export default function StaffAttendanceExportButton({
  reports,
  startDate,
  endDate,
}: Props) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    if (reports.length === 0) {
      alert("There are no attendance records to export.");
      return;
    }

    setExporting(true);

    try {
      const headers = [
        "Staff Name",
        "Staff Number",
        "Role",
        "Department",
        "Working Days",
        "Present",
        "Late",
        "Absent",
        "Completed Days",
        "Attendance Rate",
      ];

      const rows = reports.map((member) => [
        `${member.first_name} ${member.last_name}`,
        member.staff_number ?? "",
        member.role ?? "Staff",
        member.department ?? "",
        member.workingDays,
        member.present,
        member.late,
        member.absent,
        member.completed,
        `${member.attendanceRate}%`,
      ]);

      const csvContent = [
        headers.map(escapeCSVValue).join(","),
        ...rows.map((row) =>
          row.map(escapeCSVValue).join(",")
        ),
      ].join("\n");

      // UTF-8 BOM helps Excel correctly display special characters
      const blob = new Blob(
        ["\uFEFF" + csvContent],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `staff-attendance-report-${startDate}-to-${endDate}.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);

      alert(
        "Could not export the attendance report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting || reports.length === 0}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-eduke-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-eduke-green-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      {exporting ? (
        <>
          <Loader2
            size={16}
            className="animate-spin"
          />
          Exporting...
        </>
      ) : (
        <>
          <Download size={16} />
          Export CSV
        </>
      )}
    </button>
  );
}