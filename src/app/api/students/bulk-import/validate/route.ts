import { NextRequest, NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/bulk-import/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStudentWorkbook } from "@/lib/bulk-import/parse";
import { validateRow, type ValidationContext } from "@/lib/bulk-import/validate";
import {
  mapStreamJoinRows,
  type ClassOption,
  type ImportBatchPreview,
  type RawStreamJoinRow,
  type ValidatedImportRow,
} from "@/lib/bulk-import/types";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — generous for a student list spreadsheet

export async function POST(req: NextRequest) {
  const auth = await requireImportAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;
  const admin = createAdminClient();

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded. Attach the completed .xlsx template." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10MB)." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseStudentWorkbook(buffer);

  if (!parsed.ok) {
    // Still recorded in the audit log — a rejected upload is a real event worth showing
    // on the Import History page (e.g. wrong file, tampered template).
    await admin.from("student_import_batches").insert({
      school_id: profile.school_id,
      uploaded_by: profile.id,
      file_name: file.name,
      status: "failed",
      total_rows: 0,
      import_errors: [{ rowNumber: 0, admissionNumber: null, message: parsed.error }],
    });
    return NextResponse.json({ error: parsed.error }, { status: 422 });
  }

  // Reference data is scoped to this school; the admission-number/name+DOB existing-record
  // checks intentionally use the admin (service-role) client instead of the RLS-scoped one —
  // `admission_number` has a *global* unique constraint (not per-school), so the preview needs
  // to see across all schools to catch a clash before confirm, not just after.
  const [{ data: classesRaw }, { data: streamsRaw }, { data: existingStudents }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", profile.school_id),
    supabase
      .from("streams")
      .select("id, name, class_id, class:classes!inner(id, name, school_id)")
      .eq("class.school_id", profile.school_id),
    admin.from("students").select("admission_number, first_name, last_name, date_of_birth"),
  ]);

  const classes: ClassOption[] = (classesRaw ?? []).map((c) => ({ id: c.id, name: c.name }));
  const streams = mapStreamJoinRows(streamsRaw as RawStreamJoinRow[] | null);

  const existingAdmissionNumbers = new Set(
    (existingStudents ?? []).map((s) => (s.admission_number ?? "").toLowerCase())
  );
  const existingNameDobSignatures = new Set(
    (existingStudents ?? []).map(
      (s) => `${(s.first_name ?? "").toLowerCase()}|${(s.last_name ?? "").toLowerCase()}|${s.date_of_birth ?? ""}`
    )
  );

  const context: ValidationContext = { classes, streams, existingAdmissionNumbers, existingNameDobSignatures };
  const seenAdmissionNumbers = new Map<string, number>();
  const seenNameDobSignatures = new Map<string, number>();

  const validatedRows: ValidatedImportRow[] = parsed.rows.map(({ rowNumber, raw }) =>
    validateRow(rowNumber, raw, context, seenAdmissionNumbers, seenNameDobSignatures)
  );

  const validRows = validatedRows.filter((r) => r.errors.length === 0).length;
  const errorRows = validatedRows.length - validRows;
  const warningRows = validatedRows.filter((r) => r.warnings.length > 0).length;

  const { data: batch, error: batchError } = await admin
    .from("student_import_batches")
    .insert({
      school_id: profile.school_id,
      uploaded_by: profile.id,
      file_name: file.name,
      status: "ready",
      total_rows: validatedRows.length,
      valid_rows: validRows,
      error_rows: errorRows,
      rows: validatedRows,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    console.error("Failed to create import batch:", batchError);
    return NextResponse.json({ error: "Could not save this batch for review. Please try again." }, { status: 500 });
  }

  const preview: ImportBatchPreview = {
    batchId: batch.id,
    fileName: file.name,
    summary: { totalRows: validatedRows.length, validRows, errorRows, warningRows },
    rows: validatedRows,
  };

  return NextResponse.json(preview);
}
