import { cbcIndicatorLabel } from "./format";

export type ReportCardSubject = { name: string; marks: number | null; grade: string; comment: string | null };

export function buildReportCardHtml(input: {
  schoolName?: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  streamName: string;
  termLabel: string;
  examName: string;
  curriculumType?: "CBC" | "8-4-4";
  subjects: ReportCardSubject[];
  totalMarks: number;
  meanMarks: number;
  meanGrade: string;
  position: number | null;
  totalStudents: number | null;
  attendanceRate: number | null;
  classTeacherName: string | null;
  classTeacherComment: string | null;
  principalComment: string | null;
}): string {
  const isCbc = input.curriculumType === "CBC";

  const rowsHtml = input.subjects
    .map(
      (s) => `
        <tr>
          <td>${s.name}</td>
          <td class="amount">${s.marks ?? "-"}</td>
          <td class="amount">${s.grade}${isCbc ? ` <span style="color:#666;font-size:11px;">(${cbcIndicatorLabel(s.grade)})</span>` : ""}</td>
          <td>${s.comment ?? ""}</td>
        </tr>`
    )
    .join("");

  return `
    <h1>${input.schoolName ?? "EduKe"} — Student Report Card</h1>
    <p class="subtitle">${input.termLabel} · ${input.examName}${isCbc ? " · CBC" : ""}</p>

    <table style="margin-top: 8px;">
      <tbody>
        <tr><td style="width:33%"><strong>Name:</strong> ${input.studentName}</td><td style="width:33%"><strong>Admission No:</strong> ${input.admissionNumber}</td><td><strong>Class:</strong> ${input.className} ${input.streamName}</td></tr>
      </tbody>
    </table>

    <table>
      <thead>
        <tr><th>Subject</th><th class="amount">Marks</th><th class="amount">${isCbc ? "Indicator" : "Grade"}</th><th>Teacher's Comment</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr><td>TOTAL</td><td class="amount">${input.totalMarks}</td><td class="amount">${input.meanGrade}${isCbc ? ` (${cbcIndicatorLabel(input.meanGrade)})` : ""}</td><td></td></tr>
      </tfoot>
    </table>

    <table style="margin-top: 12px;">
      <tbody>
        <tr>
          <td><strong>Mean Marks:</strong> ${input.meanMarks.toFixed(1)}</td>
          <td><strong>Mean ${isCbc ? "Indicator" : "Grade"}:</strong> ${input.meanGrade}${isCbc ? ` — ${cbcIndicatorLabel(input.meanGrade)}` : ""}</td>
          <td><strong>Position:</strong> ${input.position !== null && input.totalStudents !== null ? `${input.position} out of ${input.totalStudents}` : "-"}</td>
          <td><strong>Attendance:</strong> ${input.attendanceRate !== null ? `${input.attendanceRate}%` : "-"}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 24px;">
      <p style="font-size:13px;"><strong>Class Teacher's Remark${input.classTeacherName ? ` (${input.classTeacherName})` : ""}:</strong></p>
      <p style="font-size:13px; min-height: 20px; border-bottom: 1px solid #ccc; padding-bottom: 6px;">${input.classTeacherComment ?? "&nbsp;"}</p>
    </div>

    <div style="margin-top: 20px;">
      <p style="font-size:13px;"><strong>Principal's Remark:</strong></p>
      <p style="font-size:13px; min-height: 20px; border-bottom: 1px solid #ccc; padding-bottom: 6px;">${input.principalComment ?? "&nbsp;"}</p>
    </div>

    <div style="margin-top: 30px; display: flex; justify-content: space-between;">
      <p style="font-size:12px; border-top: 1px solid #999; padding-top: 4px; width: 45%;">Class Teacher's Signature</p>
      <p style="font-size:12px; border-top: 1px solid #999; padding-top: 4px; width: 45%;">Principal's Signature</p>
    </div>

    <p class="footer">Generated on ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })} via EduKe.</p>
  `;
}

export function suggestRemark(meanMarks: number, studentFirstName: string): string {
  if (meanMarks < 45) {
    return `Below Average — Needs Improvement. There is need for more effort. With focused practice and support, ${studentFirstName} can improve significantly next term.`;
  }
  if (meanMarks < 65) {
    return `Average — Meets Expectations. Satisfactory performance this term. Keep up the consistent effort to reach even greater heights.`;
  }
  return `Above Average — Exceeds Expectations. Excellent work this term! ${studentFirstName} has shown great commitment — keep up the outstanding performance.`;
}