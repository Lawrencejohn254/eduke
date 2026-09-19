import { NextRequest, NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/bulk-import/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateRow, type ValidationContext } from "@/lib/bulk-import/validate";
import {
  mapStreamJoinRows,
  type ClassOption,
  type ImportConfirmResult,
  type RawStreamJoinRow,
  type ValidatedImportRow,
} from "@/lib/bulk-import/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireImportAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;
  const admin = createAdminClient();
  const { batchId } = await params;

  const { data: batch } = await admin
    .from("student_import_batches")
    .select("id, school_id, status, rows")
    .eq("id", batchId)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  }
  if (batch.status !== "ready") {
    return NextResponse.json(
      { error: `This batch is "${batch.status}" and can't be confirmed again.` },
      { status: 409 }
    );
  }

  // Re-validate against current data rather than trusting the stored preview or anything the
  // client sends — classes/streams/admission numbers may have changed since the file was
  // uploaded (e.g. another admin added a student, or someone edited Settings, in the meantime).
  // The students check uses the admin (service-role) client because `admission_number` has a
  // *global* unique constraint, not a per-school one — the RLS-scoped client would only see
  // this school's students and could miss a real cross-school clash.
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

  const storedRows = (batch.rows ?? []) as ValidatedImportRow[];
  const revalidated: ValidatedImportRow[] = storedRows.map((r) =>
    validateRow(r.rowNumber, r.raw, context, seenAdmissionNumbers, seenNameDobSignatures)
  );

  const validRows = revalidated.filter((r) => r.data !== null);
  if (validRows.length === 0) {
    await admin
      .from("student_import_batches")
      .update({ status: "failed", rows: revalidated, error_rows: revalidated.length, valid_rows: 0 })
      .eq("id", batchId);
    return NextResponse.json(
      { error: "No rows are valid anymore — please review and re-upload." },
      { status: 422 }
    );
  }

  const payload = validRows.map((r) => ({
    rowNumber: r.data!.rowNumber,
    admissionNumber: r.data!.admissionNumber,
    firstName: r.data!.firstName,
    lastName: r.data!.lastName,
    gender: r.data!.gender,
    classId: r.data!.classId,
    streamId: r.data!.streamId,
    dateOfBirth: r.data!.dateOfBirth,
    kcpeIndex: r.data!.kcpeIndex,
    nemisId: r.data!.nemisId,
    previousSchool: r.data!.previousSchool,
    guardianName: r.data!.guardianName,
    guardianPhone: r.data!.guardianPhone,
    guardianRelationship: r.data!.guardianRelationship,
  }));

  await admin
    .from("student_import_batches")
    .update({
      rows: revalidated,
      valid_rows: validRows.length,
      error_rows: revalidated.length - validRows.length,
      import_payload: payload,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  // The atomic insert itself: runs as a single Postgres function call so a crash mid-way
  // rolls back cleanly, while each row is individually savepointed inside it so one bad row
  // doesn't sink rows around it. See supabase/migrations/0002_bulk_student_import.sql.
  const { data: result, error: rpcError } = await admin.rpc("import_students_batch", { p_batch_id: batchId });

  if (rpcError) {
    console.error("Bulk import RPC failed:", rpcError);
    await admin.from("student_import_batches").update({ status: "failed" }).eq("id", batchId);
    return NextResponse.json({ error: "Import failed unexpectedly. No students were saved." }, { status: 500 });
  }

  const response: ImportConfirmResult = {
    batchId,
    successCount: result?.successCount ?? 0,
    failCount: result?.failCount ?? 0,
    errors: result?.errors ?? [],
  };

  return NextResponse.json(response);
}
