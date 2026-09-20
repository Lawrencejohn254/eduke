export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export type AttendanceCounts = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  /** Present ÷ recorded days, as a whole percentage. null when nothing has been recorded. */
  rate: number | null;
};

/**
 * Same definition the portal has always used: only "Present" counts towards the rate
 * (late and excused days are shown separately so nothing is hidden).
 */
export function summarizeAttendance(records: { status: string }[]): AttendanceCounts {
  const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
  const present = count("Present");
  const total = records.length;
  return {
    total,
    present,
    absent: count("Absent"),
    late: count("Late"),
    excused: count("Excused"),
    rate: total ? Math.round((present / total) * 100) : null,
  };
}

/** Tone for an attendance rate: what a parent should notice at a glance. */
export function attendanceTone(rate: number | null): "good" | "watch" | "concern" | "none" {
  if (rate === null) return "none";
  if (rate >= 90) return "good";
  if (rate >= 80) return "watch";
  return "concern";
}
