import { NextRequest, NextResponse } from "next/server";
import { processSmsQueue } from "@/lib/communications/process-sms";
import { isCronAuthorized } from "@/lib/communications/cron-auth";

// Give a large backlog room to finish in one run (Vercel plan limits still apply).
export const maxDuration = 60;

async function run(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await processSmsQueue({ budgetMs: 45_000 });
  if (result.error) return NextResponse.json({ error: result.error, ...result }, { status: 500 });
  return NextResponse.json({ processed: result.claimed, ...result });
}

// POST: pg_cron / manual calls.  GET: Vercel Cron only issues GET requests.
export const POST = run;
export const GET = run;
