import { NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/bulk-import/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildErrorReport } from "@/lib/bulk-import/error-report";
import type { ValidatedImportRow } from "@/lib/bulk-import/types";

export async function GET(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const auth = await requireImportAdmin();
  if ("error" in auth) return auth.error;
  const { profile } = auth;
  const admin = createAdminClient();
  const { batchId } = await params;

  const { data: batch } = await admin
    .from("student_import_batches")
    .select("rows, import_errors, file_name")
    .eq("id", batchId)
    .eq("school_id", profile.school_id)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found." }, { status: 404 });
  }

  const rows = (batch.rows ?? []) as ValidatedImportRow[];
  const importErrors = (batch.import_errors ?? []) as {
    rowNumber: number;
    admissionNumber: string | null;
    message: string;
  }[];

  const bytes = buildErrorReport(rows, importErrors);
  const safeName = (batch.file_name ?? "import").replace(/\.[^.]+$/, "");

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-errors.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
