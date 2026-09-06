// KNEC (Kenya National Examinations Council) integration.
//
// Same caveat as lib/nemis.ts: KNEC does not have public self-serve developer docs I could
// build against confidently, so this is a pluggable stub. To make it real:
//   1. Share the KNEC API docs/endpoint spec (e.g. KCPE/KCSE results lookup or registration API).
//   2. Replace the fetch() call and payload shape below.
//   3. Set KNEC_API_BASE_URL and KNEC_API_KEY in .env.local.
//
// Until then, this simulates a lookup so the UI flow can be built/demoed.

function hasRealConfig() {
  return Boolean(process.env.KNEC_API_BASE_URL && process.env.KNEC_API_KEY);
}

export async function fetchKnecIndexResult(kcpeIndex: string): Promise<{
  success: boolean;
  simulated: boolean;
  message: string;
  result?: { indexNumber: string; meanGrade: string; subjects: { name: string; grade: string }[] };
}> {
  if (!hasRealConfig()) {
    return {
      success: true,
      simulated: true,
      message: "KNEC lookup simulated — set KNEC_API_BASE_URL/KNEC_API_KEY and update lib/knec.ts with the real endpoint to go live.",
      result: {
        indexNumber: kcpeIndex,
        meanGrade: "B+",
        subjects: [
          { name: "Mathematics", grade: "B" },
          { name: "English", grade: "B+" },
          { name: "Kiswahili", grade: "A-" },
          { name: "Integrated Science", grade: "B+" },
        ],
      },
    };
  }

  // Placeholder request — replace path/payload once the real KNEC API spec is available.
  const res = await fetch(`${process.env.KNEC_API_BASE_URL}/results/${kcpeIndex}`, {
    headers: { Authorization: `Bearer ${process.env.KNEC_API_KEY}` },
  });

  if (!res.ok) {
    return { success: false, simulated: false, message: `KNEC lookup failed (${res.status}).` };
  }
  const data = await res.json();
  return { success: true, simulated: false, message: "Fetched from KNEC.", result: data };
}
