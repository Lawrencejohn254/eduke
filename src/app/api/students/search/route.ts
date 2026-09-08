import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ students: [] });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id")
    .eq("id", user.id)
    .single();

  if (!profile?.school_id) {
    return NextResponse.json({ students: [] });
  }

  const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);

  const { data: students, error } = await supabase
    .from("students")
    .select(
      `
      id,
      first_name,
      last_name,
      admission_number,
      photo_url,
      status,
      class:classes(name),
      stream:streams(name)
      `
    )
    .eq("school_id", profile.school_id)
    .or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,admission_number.ilike.%${escaped}%`
    )
    .order("first_name")
    .limit(8);

  if (error) {
    console.error("Student search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ students: students ?? [] });
}