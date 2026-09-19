import { NextResponse } from "next/server";
import { requireImportAdmin } from "@/lib/bulk-import/auth";
import { buildImportTemplate } from "@/lib/bulk-import/template";
import { mapStreamJoinRows, type ClassOption, type RawStreamJoinRow } from "@/lib/bulk-import/types";

export async function GET() {
  const auth = await requireImportAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;

  const [{ data: classes }, { data: streams }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("school_id", profile.school_id).order("name"),
    supabase
      .from("streams")
      .select("id, name, class_id, class:classes!inner(id, name, school_id)")
      .eq("class.school_id", profile.school_id)
      .order("name"),
  ]);

  const classOptions: ClassOption[] = (classes ?? []).map((c) => ({ id: c.id, name: c.name }));
  const streamOptions = mapStreamJoinRows(streams as RawStreamJoinRow[] | null);

  const bytes = buildImportTemplate(classOptions, streamOptions);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="student-import-template.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
