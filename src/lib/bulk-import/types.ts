// Shared types for Bulk Student Import (template generation, parsing, validation,
// preview, and the confirm/insert step). Kept separate from the DB row shape
// (`students` table) because the import pipeline works with human-entered text
// (class/stream *names*, free-text gender/relationship, raw phone numbers, etc.)
// that has to be resolved/validated before it looks like a real `students` insert.

export const TEMPLATE_HEADERS = [
  "First Name",
  "Last Name",
  "Admission Number",
  "Gender",
  "Class",
  "Stream",
  "Date of Birth",
  "KCPE Index",
  "NEMIS Number",
  "Previous School",
  "Guardian Full Name",
  "Guardian Phone",
  "Guardian Relationship",
] as const;

export type TemplateHeader = (typeof TEMPLATE_HEADERS)[number];

export const REQUIRED_HEADERS: TemplateHeader[] = [
  "First Name",
  "Last Name",
  "Admission Number",
  "Gender",
  "Class",
  "Stream",
];

export const ACCEPTED_GENDERS = ["Male", "Female"] as const;

export const ACCEPTED_RELATIONSHIPS = [
  "Father",
  "Mother",
  "Guardian",
  "Uncle",
  "Aunt",
  "Grandparent",
  "Other",
] as const;

// The raw, as-typed value of every column for one spreadsheet row (before validation).
export type RawImportRow = Record<TemplateHeader, string>;

// A row after validation: `data` is populated (and usable for insert) only when there are
// no `errors`. `warnings` never block the import (e.g. a possible-duplicate name+DOB match).
export type ValidatedImportRow = {
  rowNumber: number; // 1-based spreadsheet row, matching what the user sees in Excel (header = row 1)
  raw: RawImportRow;
  data: NormalizedStudentRow | null;
  errors: string[];
  warnings: string[];
};

// Cleaned, resolved fields ready to hand to the DB function.
export type NormalizedStudentRow = {
  rowNumber: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  classId: string;
  className: string;
  streamId: string;
  streamName: string;
  dateOfBirth: string | null; // ISO yyyy-mm-dd
  kcpeIndex: string | null;
  nemisId: string | null;
  previousSchool: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
};

export type ClassOption = { id: string; name: string };
export type StreamOption = { id: string; name: string; classId: string; className: string };

// Shape returned by `.select("id, name, class_id, class:classes!inner(id, name, school_id)")`
// against `streams`. `class` comes back as an array from PostgREST's embed even though the
// FK makes it one-to-one, so callers should read `class[0]`.
export type RawStreamJoinRow = {
  id: string;
  name: string;
  class_id: string;
  class: { id: string; name: string; school_id: string }[] | { id: string; name: string; school_id: string } | null;
};

export function mapStreamJoinRows(rows: RawStreamJoinRow[] | null | undefined): StreamOption[] {
  return (rows ?? []).map((row) => {
    const klass = Array.isArray(row.class) ? row.class[0] : row.class;
    return { id: row.id, name: row.name, classId: row.class_id, className: klass?.name ?? "" };
  });
}

export type ValidationSummary = {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
};

export type ImportBatchPreview = {
  batchId: string;
  fileName: string;
  summary: ValidationSummary;
  rows: ValidatedImportRow[];
};

export type ImportConfirmResult = {
  batchId: string;
  successCount: number;
  failCount: number;
  errors: { rowNumber: number; admissionNumber: string | null; message: string }[];
};
