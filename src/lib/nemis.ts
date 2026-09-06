// NEMIS (National Education Management Information System) integration.
//
// IMPORTANT: Unlike Groq/Pesapal/Africa's Talking, NEMIS does not have public self-serve
// developer documentation I could build against with confidence. This file is a pluggable
// stub — the function signatures and call sites in the app are wired up, but the actual
// request/response shape below is a placeholder. To make this real:
//   1. Share the NEMIS API docs/endpoint spec you have access to.
//   2. Replace the fetch() call and payload shape in `syncStudentToNemis` accordingly.
//   3. Set NEMIS_API_BASE_URL and NEMIS_API_KEY in .env.local.
//
// Until then, this simulates a successful sync so the UI flow (button, loading state,
// success/error message) can be built and demoed without a live NEMIS connection.

function hasRealConfig() {
  return Boolean(process.env.NEMIS_API_BASE_URL && process.env.NEMIS_API_KEY);
}

export async function syncStudentToNemis(student: {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string;
  upi?: string | null;
}): Promise<{ success: boolean; nemisId?: string; simulated: boolean; message: string }> {
  if (!hasRealConfig()) {
    return {
      success: true,
      nemisId: `SIMULATED-${student.admissionNumber}`,
      simulated: true,
      message: "NEMIS sync simulated — set NEMIS_API_BASE_URL/NEMIS_API_KEY and update lib/nemis.ts with the real endpoint to go live.",
    };
  }

  // Placeholder request — replace path/payload once the real NEMIS API spec is available.
  const res = await fetch(`${process.env.NEMIS_API_BASE_URL}/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEMIS_API_KEY}`,
    },
    body: JSON.stringify({
      admission_number: student.admissionNumber,
      first_name: student.firstName,
      last_name: student.lastName,
      date_of_birth: student.dateOfBirth,
      gender: student.gender,
      upi: student.upi,
    }),
  });

  if (!res.ok) {
    return { success: false, simulated: false, message: `NEMIS sync failed (${res.status}).` };
  }
  const data = await res.json();
  return { success: true, nemisId: data.nemis_id, simulated: false, message: "Synced to NEMIS." };
}
