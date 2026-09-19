import * as XLSX from "xlsx";
import type { ValidatedImportRow } from "./types";

type ImportError = { rowNumber: number; admissionNumber: string | null; message: string };

/**
 * Builds an error-report workbook. Used two ways:
 *  - after validation, to let the admin download all rows that failed validation (fix &
 *    re-upload) without having to scroll a huge preview table;
 *  - after a confirmed import, to show rows that failed at insert time (rare — validation
 *    already screened for the common cases, but e.g. a race on admission_number can still
 *    happen between preview and confirm).
 */
export function buildErrorReport(
  validationRows: ValidatedImportRow[],
  importErrors: ImportError[] = []
): Uint8Array {
  const workbook = XLSX.utils.book_new();

  const validationFailures = validationRows.filter((r) => r.errors.length > 0);
  if (validationFailures.length > 0) {
    const rows: (string | number)[][] = [
      ["Row #", "First Name", "Last Name", "Admission Number", "Errors"],
      ...validationFailures.map((r) => [
        r.rowNumber,
        r.raw["First Name"],
        r.raw["Last Name"],
        r.raw["Admission Number"],
        r.errors.join(" | "),
      ]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Validation Errors");
  }

  if (importErrors.length > 0) {
    const rows: (string | number)[][] = [
      ["Row #", "Admission Number", "Error"],
      ...importErrors.map((e) => [e.rowNumber, e.admissionNumber ?? "", e.message]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "Import Errors");
  }

  if (workbook.SheetNames.length === 0) {
    const sheet = XLSX.utils.aoa_to_sheet([["No errors — every row imported successfully."]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Errors");
  }

  const out = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(out);
}
