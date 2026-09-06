import { NextRequest, NextResponse } from "next/server";
import { generateExamQuestions, GroqRateLimitError, GroqError } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    const content = await generateExamQuestions({
      numberOfQuestions: body.numberOfQuestions,
      subject: body.subject,
      klass: body.klass,
      topic: body.topic,
      types: body.types,
      difficulty: body.difficulty,
      marksPerQuestion: body.marksPerQuestion,
      instructions: body.instructions,
    });
    return NextResponse.json({ content });
  } catch (e) {
    if (e instanceof GroqRateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    if (e instanceof GroqError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Generation failed. You can still write the questions manually." }, { status: 500 });
  }
}
