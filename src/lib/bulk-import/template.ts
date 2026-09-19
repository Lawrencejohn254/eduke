import * as XLSX from "xlsx";
import { ACCEPTED_GENDERS, ACCEPTED_RELATIONSHIPS, REQUIRED_HEADERS, TEMPLATE_HEADERS } from "./types";
import type { ClassOption, StreamOption } from "./types";

const EXAMPLE_ROW: Record<(typeof TEMPLATE_HEADERS)[number], string> = {
  "First Name": "Faith",
  "Last Name": "Wanjiru",
  "Admission Number": "ADM1001",
  Gender: "Female",
  Class: "Form 2",
  Stream: "North",
  "Date of Birth": "2011-04-12",
  "KCPE Index": "12345678001",
  "NEMIS Number": "NM00012345",
  "Previous School": "St. Mary's Primary School",
  "Guardian Full Name": "Jane Wanjiru",
  "Guardian Phone": "0722000000",
  "Guardian Relationship": "Mother",
};

/**
 * Builds the Bulk Student Import workbook: a Students sheet (headers + one example row),
 * a Class & Stream Reference sheet listing this school's actual classes/streams, and an
 * Instructions sheet. Returns raw bytes suitable for a file download response.
 */
export function buildImportTemplate(classes: ClassOption[], streams: StreamOption[]): Uint8Array {
  const workbook = XLSX.utils.book_new();

  // --- Students sheet ---
  const studentsSheetData = [TEMPLATE_HEADERS as unknown as string[], TEMPLATE_HEADERS.map((h) => EXAMPLE_ROW[h])];
  const studentsSheet = XLSX.utils.aoa_to_sheet(studentsSheetData);
  studentsSheet["!cols"] = TEMPLATE_HEADERS.map((h) => ({
    wch: Math.max(h.length, 18),
  }));
  XLSX.utils.book_append_sheet(workbook, studentsSheet, "Students");

  // --- Class & Stream Reference sheet ---
  const streamsByClass = new Map<string, StreamOption[]>();
  for (const s of streams) {
    const list = streamsByClass.get(s.classId) ?? [];
    list.push(s);
    streamsByClass.set(s.classId, list);
  }
  const referenceRows: (string | number)[][] = [["Class", "Stream"]];
  for (const klass of classes) {
    const classStreams = streamsByClass.get(klass.id) ?? [];
    if (classStreams.length === 0) {
      referenceRows.push([klass.name, "(no streams configured)"]);
    } else {
      for (const stream of classStreams) referenceRows.push([klass.name, stream.name]);
    }
  }
  if (referenceRows.length === 1) {
    referenceRows.push(["(no classes configured yet — set these up in Settings first)", ""]);
  }
  const referenceSheet = XLSX.utils.aoa_to_sheet(referenceRows);
  referenceSheet["!cols"] = [{ wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, referenceSheet, "Class & Stream Reference");

  // --- Instructions sheet ---
  const instructionRows: (string | number)[][] = [
    ["Bulk Student Import — Instructions"],
    [""],
    ["1. Fill in the 'Students' sheet, one student per row. Do not change the column headers."],
    [`2. Required columns: ${REQUIRED_HEADERS.join(", ")}.`],
    [`3. Gender must be exactly one of: ${ACCEPTED_GENDERS.join(", ")}.`],
    ["4. Class and Stream must match an entry on the 'Class & Stream Reference' sheet exactly."],
    ["5. Date of Birth format: YYYY-MM-DD (e.g. 2011-04-12)."],
    ["6. Admission Number must be unique — it cannot repeat in this file or already exist in the system."],
    [
      `7. Guardian details are optional, but if you fill in Guardian Full Name you must also fill in Guardian Phone (and vice versa). Guardian Relationship, if given, must be one of: ${ACCEPTED_RELATIONSHIPS.join(", ")}.`,
    ],
    ["8. Delete the example row before uploading, or just overwrite it with your first student."],
    ["9. You'll get a preview with any errors listed by row number before anything is saved — nothing is imported until you confirm."],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionRows);
  instructionsSheet["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out);
}
