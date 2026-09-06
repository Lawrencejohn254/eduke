import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchKnecIndexResult } from "@/lib/knec";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { kcpeIndex } = await req.json();
  if (!kcpeIndex) return NextResponse.json({ error: "kcpeIndex is required" }, { status: 400 });

  const result = await fetchKnecIndexResult(kcpeIndex);
  return NextResponse.json(result);
}
