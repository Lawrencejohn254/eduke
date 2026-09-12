export function formatKES(amount: number | null | undefined): string {
  const value = amount ?? 0;
  return (
    "KES " +
    value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

export function formatDateDMY(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// staff_attendance.minutes_late is stored as whole minutes only — there is no
// seconds-level precision anywhere in the data, so this deliberately only
// ever renders hours + minutes (never a fake "0s").
export function formatMinutesLate(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) return "-";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Kenya grading — supports both 8-4-4 (default) and CBC. Mirrors the DB trigger, used for
// optimistic client-side display. Pass curriculumType="CBC" to get the EE/ME/AE/BE rubric;
// omit it (or pass "8-4-4") to get the traditional A-E letter scale.
export function gradeFromMarks(
  marks: number | null | undefined,
  curriculumType?: "CBC" | "8-4-4"
): { grade: string; points: number } {
  if (marks === null || marks === undefined || isNaN(marks)) return { grade: "-", points: 0 };

  if (curriculumType === "CBC") {
    if (marks >= 90) return { grade: "EE1", points: 8 };
    if (marks >= 75) return { grade: "EE2", points: 7 };
    if (marks >= 58) return { grade: "ME1", points: 6 };
    if (marks >= 41) return { grade: "ME2", points: 5 };
    if (marks >= 31) return { grade: "AE1", points: 4 };
    if (marks >= 21) return { grade: "AE2", points: 3 };
    if (marks >= 11) return { grade: "BE1", points: 2 };
    return { grade: "BE2", points: 1 };
  }

  if (marks >= 75) return { grade: "A", points: 12 };
  if (marks >= 70) return { grade: "A-", points: 11 };
  if (marks >= 65) return { grade: "B+", points: 10 };
  if (marks >= 60) return { grade: "B", points: 9 };
  if (marks >= 55) return { grade: "B-", points: 8 };
  if (marks >= 50) return { grade: "C+", points: 7 };
  if (marks >= 45) return { grade: "C", points: 6 };
  if (marks >= 40) return { grade: "C-", points: 5 };
  if (marks >= 35) return { grade: "D+", points: 4 };
  if (marks >= 30) return { grade: "D", points: 3 };
  if (marks >= 25) return { grade: "D-", points: 2 };
  return { grade: "E", points: 1 };
}

// Full-text description for a CBC indicator code (EE1, ME2, etc.) — used on report cards
// and anywhere the short code alone wouldn't be clear to a parent.
export function cbcIndicatorLabel(grade: string): string {
  if (grade.startsWith("EE")) return "Exceeding Expectations";
  if (grade.startsWith("ME")) return "Meeting Expectations";
  if (grade.startsWith("AE")) return "Approaching Expectations";
  if (grade.startsWith("BE")) return "Below Expectations";
  return "";
}

// Converts 07xx / 01xx local formats to +254 international format for SMS APIs.
export function toKenyanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return "+" + digits;
  if (digits.startsWith("0")) return "+254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "+254" + digits;
  return phone;
}