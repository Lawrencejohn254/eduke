import { NextRequest, NextResponse } from "next/server";
import { generateSchemeOfWork, GroqRateLimitError, GroqError } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    const content = await generateSchemeOfWork({
      subject: body.subject,
      klass: body.klass,
      term: body.term,
      year: body.year,
      curriculumType: body.curriculumType,
      notes: body.notes,
    });
    return NextResponse.json({ content });
  } catch (e) {
    if (e instanceof GroqRateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    if (e instanceof GroqError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Generation failed. You can still write it manually." }, { status: 500 });
  }
}
