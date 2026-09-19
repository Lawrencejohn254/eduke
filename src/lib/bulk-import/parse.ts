import * as XLSX from "xlsx";
import { REQUIRED_HEADERS, TEMPLATE_HEADERS, type RawImportRow, type TemplateHeader } from "./types";

export type ParsedWorkbook =
  | { ok: true; rows: { rowNumber: number; raw: RawImportRow }[] }
  | { ok: false; error: string };

// Matches header text loosely (trimmed, case-insensitive, collapsed whitespace) so small
// formatting differences ("date of birth", " Gender ") don't fail the whole upload.
function normalizeHeaderText(h: unknown): string {
  return String(h ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const HEADER_LOOKUP = new Map<string, TemplateHeader>(
  TEMPLATE_HEADERS.map((h) => [normalizeHeaderText(h), h])
);

/**
 * Parses the uploaded workbook's first sheet (the "Students" sheet in the template) into
 * raw string rows keyed by our canonical template headers, ignoring any extra sheets (e.g.
 * the Class & Stream reference sheet, or Instructions) and any extra/reordered columns.
 */
export function parseStudentWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { ok: false, error: "Could not read this file. Please upload a valid .xlsx file." };
  }

  const sheetName =
    workbook.SheetNames.find((n) => normalizeHeaderText(n) === "students") ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : null;
  if (!sheet) {
    return { ok: false, error: "No sheets found in this workbook." };
  }

  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false, // format numbers/dates to display strings ourselves handle dates separately
    defval: "",
    blankrows: false,
  });

  if (matrix.length === 0) {
    return { ok: false, error: "The Students sheet is empty." };
  }

  const headerRow = matrix[0];
  const columnIndexByHeader = new Map<TemplateHeader, number>();
  headerRow.forEach((cell, idx) => {
    const mapped = HEADER_LOOKUP.get(normalizeHeaderText(cell));
    if (mapped && !columnIndexByHeader.has(mapped)) {
      columnIndexByHeader.set(mapped, idx);
    }
  });

  const missing = REQUIRED_HEADERS.filter((h) => !columnIndexByHeader.has(h));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `This file doesn't match the template. Missing column(s): ${missing.join(", ")}. Please download and use the current template.`,
    };
  }

  const dataRows = matrix.slice(1);
  const rows: { rowNumber: number; raw: RawImportRow }[] = [];

  dataRows.forEach((rawRow, idx) => {
    const isBlank = rawRow.every((cell) => String(cell ?? "").trim() === "");
    if (isBlank) return;

    const raw = {} as RawImportRow;
    for (const header of TEMPLATE_HEADERS) {
      const colIdx = columnIndexByHeader.get(header);
      const cellValue = colIdx !== undefined ? rawRow[colIdx] : "";
      raw[header] = cellValue instanceof Date ? cellValue.toISOString() : String(cellValue ?? "").trim();
    }

    // +2: header is row 1, dataRows is 0-indexed starting at spreadsheet row 2
    rows.push({ rowNumber: idx + 2, raw });
  });

  if (rows.length === 0) {
    return { ok: false, error: "No student rows found below the header row." };
  }

  return { ok: true, rows };
}
