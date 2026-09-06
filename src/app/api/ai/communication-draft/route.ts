import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCommunicationDraft, GroqRateLimitError, GroqError } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetLabel, hint } = await req.json();
  if (!hint?.trim()) return NextResponse.json({ error: "Add a short note about what the message is about." }, { status: 400 });

  try {
    const draft = await generateCommunicationDraft({ targetLabel: targetLabel || "the audience", hint });
    return NextResponse.json({ draft });
  } catch (e) {
    if (e instanceof GroqRateLimitError) return NextResponse.json({ error: e.message }, { status: 429 });
    if (e instanceof GroqError) return NextResponse.json({ error: e.message }, { status: 500 });
    return NextResponse.json({ error: "Draft generation failed. You can still write it manually." }, { status: 500 });
  }
}
