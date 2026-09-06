import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ schools: [] });
    }

    const supabase = createAdminClient();

    const { data: schools, error } = await supabase
      .from("schools")
      .select("id, name, county, school_type")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(10);

    if (error) {
      console.error("School search error:", error);

      return NextResponse.json(
        { error: "Unable to search schools" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      schools: schools ?? [],
    });
  } catch (error) {
    console.error("School search route error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}